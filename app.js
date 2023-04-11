const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');

const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

//connect db
const mysql = require('mysql2/promise');

const createConnection = async() => {
    return await mysql.createConnection({
        host: '127.0.0.1',
        port: '3306',
        user: 'root',
        password: 'bismillah',
        database : 'wa_api'
    });
}



app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

/**
 * BASED ON MANY QUESTIONS
 * Actually ready mentioned on the tutorials
 * 
 * Many people confused about the warning for file-upload
 * So, we just disabling the debug for simplicity.
 */
app.use(fileUpload({
  debug: false
}));

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ],
  },
  authStrategy: new LocalAuth()
});

const db =require('./helpers/db');


// client.on('message', async msg => {
//   const keyword = msg.body.toLowerCase();
//   const replyMessage = await db.getReply(keyword);
  
//   if(replyMessage !== false) {
//     msg.reply(replyMessage);
//   }else if (msg.body.startsWith('/insert')) {
//     const [_, keyword1, keyword2, ...messageArr] = msg.body.split(' ');
//     const keyword = `${keyword1} ${keyword2}`;
//     const message = messageArr.join(' ');
//     const values = [keyword, message];
  
//     // Lakukan operasi INSERT ke tabel yang telah Anda buat di database MySQL2
//     const sql = 'INSERT INTO wa_replies (keyword, message) VALUES (?, ?)';
//     const connection = await createConnection();
//     try {
//       const [result] = await connection.execute(sql, values);
//       console.log(`Message saved to database with ID ${result.insertId}`);
//       msg.reply(`Pesan berhasil di simpan ${keyword},${message}`);
//     } catch (error) {
//       console.error('Error saving message to database: ' + error);
//       msg.reply('Error saving message to database.');
//     } finally {
//       connection.end();
//     }
//   }else if (msg.body.startsWith('/update')) {
//     const [_, keyword1, keyword2] = msg.body.split(' ');
//     const keyword = `${keyword1} ${keyword2}`;
//     const values = [keyword, message];

//     const connection = await createConnection();
//     try {
//     const [rows] = await connection.query('SELECT * FROM wa_replies WHERE keyword = ?', [keyword]);
//     if (rows.length === 0) {
//     msg.reply(`Keyword ${keyword} tidak ditemukan`);
//     return false;
//     }
//     const [reply] = rows;
//     msg.reply(`Apakah kamu ingin mengubah pesan berikut: ${reply.message}? (Balas /ya atau /tidak)`);
//     const confirmation = await msg.getReply();
//     if (confirmation.body.toLowerCase() !== '/ya') {
//     msg.reply('Pembaharuan dibatalkan.');
//     return;
//     }
//     const message = confirmation.body.slice(3).trim();
//     const values = [message, keyword];
//     const sql = 'UPDATE wa_replies SET message = ? WHERE keyword = ?';
//     const [result] = await connection.query(sql, values);
//     console.log(`Message updated in database with keyword ${keyword}`);
//     msg.reply(`Pesan dengan keyword ${keyword} berhasil diperbarui`);
//     } catch (error) {
//     console.error('Error updating message in database: ' + error);
//     msg.reply('Error updating message in database.');
//     } finally {
//     connection.end();
//     }
//   }else if (msg.body.startsWith('/delete')) {
//     const [_, keyword1, keyword2, ...messageArr] = msg.body.split(' ');
//     const keyword = `${keyword1} ${keyword2}`;
//     const message = messageArr.join(' ');
//     const values = [keyword, message];

//     // Lakukan operasi DELETE dari tabel yang telah Anda buat di database MySQL2
//     const sql = 'DELETE FROM wa_replies WHERE keyword = ?';
//     const connection = await createConnection();
//     try {
//       const [result] = await connection.query(sql, [keyword]);
//       if (result.affectedRows > 0) {
//         console.log(`Message deleted from database with keyword '${keyword}'`);
//         msg.reply(`Pesan dengan keyword '${keyword}' berhasil dihapus.`);
//       } else {
//         console.log(`Message with keyword '${keyword}' not found in database`);
//         msg.reply(`Pesan dengan keyword '${keyword}' tidak ditemukan di database.`);
//       }
//     } catch (error) {
//       console.error('Error deleting message from database: ' + error);
//       msg.reply('Error deleting message from database.');
//     } finally {
//       connection.end();
//     }
//   }

// });

// client.initialize();

//test kode baru 1
client.on('message', async msg => {
  const keyword = msg.body.toLowerCase();
  const replyMessage = await db.getReply(keyword);
  
  if(replyMessage !== false) {
  msg.reply(replyMessage);
  } else if (msg.body.startsWith('/insert')) {
  const [_, keyword1, keyword2, ...messageArr] = msg.body.split(' ');
  const keyword = `${keyword1} ${keyword2}`;
  const message = messageArr.join(' ');
  const values = [keyword, message];

  // Lakukan operasi INSERT ke tabel yang telah Anda buat di database MySQL2
const sql = 'INSERT INTO wa_replies (keyword, message) VALUES (?, ?)';
const connection = await createConnection();
try {
  const [result] = await connection.execute(sql, values);
  console.log(`Message saved to database with ID ${result.insertId}`);
  msg.reply(`Pesan berhasil di simpan '${keyword},${message}'`);
} catch (error) {
  console.error('Error saving message to database: ' + error);
  msg.reply('Error saving message to database.');
} finally {
  connection.end();
}
}
else if (msg.body.startsWith('/info')) {
  const sql = 'SELECT * FROM wa_replies ';
  const connection = await createConnection();
  try {
    const [rows] = await connection.execute(sql);
    if (rows.length > 0) {
      let reply = 'Keyword----Message\n'; // Header tabel
      for (let row of rows) {
        reply += `${row.keyword}----${row.message}\n`;
      }
      msg.reply(reply);
    } else {
      msg.reply(`Tidak ditemukan pesan dengan keyword '${keyword}'`);
    }
  } catch (error) {
    console.error('Error retrieving messages from database: ' + error);
    msg.reply('Error retrieving messages from database.');
  } finally {
    connection.end();
  }

// 
}else if (msg.body.startsWith('/update')) {
const [, keyword1, keyword2] = msg.body.split(' ');
const keyword = `${keyword1} ${keyword2}`;

const connection = await createConnection();
try {
const [rows] = await connection.query('SELECT * FROM wa_replies WHERE keyword = ?', keyword);
if (rows.length === 0) {
msg.reply(`Keyword '${keyword}'tidak ditemukan`);
return;
}
const [reply] = rows;
msg.reply(`Apakah kamu ingin mengubah pesan berikut: ${reply.message} ? (Balas /ya atau /tidak)`);
const confirmation = await db.getReply();
if (confirmation.body.toLowerCase() !== '/ya') {
msg.reply('Pembaharuan dibatalkan.');
return;
}
const message = confirmation.body.slice(3).trim();
const values = [message, keyword];
const sql = 'UPDATE wa_replies SET message = ? WHERE keyword = ?';
const [result] = await connection.execute(sql, values);

console.log(`Message updated in database with keyword ${keyword}`);
msg.reply(`Pesan dengan keyword '${keyword}' berhasil diperbarui.`);
} catch (error) {
console.error('Error updating message in database: ' + error);
msg.reply('Error updating message in database.');
} finally {
connection.end();
}
} else if (msg.body.startsWith('/delete')) {
const [_, keyword1, keyword2, ...messageArr] = msg.body.split(' ');
const keyword = `${keyword1} ${keyword2}`;
const message = messageArr.join(' ');
const values = [keyword, message];

// Lakukan operasi DELETE dari tabel yang telah Anda buat di database MySQL2
const sql = 'DELETE FROM wa_replies WHERE keyword = ?';
const connection = await createConnection();
try {
  const [result] = await connection.execute(sql, [keyword]);
  if (result.affectedRows > 0) {
    console.log(`Message deleted from database with keyword '${keyword}'`);
    msg.reply(`Pesan dengan keyword '${keyword}' berhasil dihapus.`);
  } else {
    console.log(`Message with keyword '${keyword}' not found in database`);
    msg.reply(`Pesan dengan keyword '${keyword}' tidak ditemukan di database.`);
  }
} catch (error) {
  console.error('Error deleting message from database: ' + error);
  msg.reply('Error deleting message from database.');
    } finally {
      connection.end();
    }
  }

});

//test baru 2
// client.on('message', async msg => {
//   const keyword = msg.body.toLowerCase();
//   const replyMessage = await db.getReply(keyword);
  
//   if(replyMessage !== false) {
//     msg.reply(replyMessage);
//   } else if (msg.body.startsWith('/insert')) {
//     const [_, keyword1, keyword2, ...messageArr] = msg.body.split(' ');
//     const keyword = `${keyword1} ${keyword2}`;
//     const message = messageArr.join(' ');
//     const values = [keyword, message];

//     // Lakukan operasi INSERT ke tabel yang telah Anda buat di database MySQL2
//     const sql = 'INSERT INTO wa_replies (keyword, message) VALUES (?, ?)';
//     const connection = await createConnection();
//     try {
//       const [result] = await connection.execute(sql, values);
//       console.log(`Message saved to database with ID ${result.insertId}`);
//       msg.reply(`Pesan berhasil disimpan '${keyword},${message}'`);
//     } catch (error) {
//       console.error('Error saving message to database: ' + error);
//       msg.reply('Error saving message to database.');
//     } finally {
//       connection.end();
//     }
//   } else if (msg.body.startsWith('/edit')) {
//     const [_, keyword1, keyword2, ...messageArr] = msg.body.split(' ');
//     const keyword = `${keyword1} ${keyword2}`;
//     const message = messageArr.join(' ');

//     // Tampilkan notifikasi konfirmasi untuk mengedit data yang sudah ada
//     const confirmationMsg = `Apakah Anda yakin ingin mengedit data dengan keyword '${keyword}'? Balas 'ya' untuk mengonfirmasi.`;
//     msg.reply(confirmationMsg);

//     // Tunggu balasan pengguna dan periksa apakah pengguna mengonfirmasi pengeditan
//     const confirmation = await client.waitForReply(msg.from);
//     if (confirmation.body.toLowerCase() === 'ya') {
//       // Tampilkan notifikasi untuk memasukkan data baru
//       const newMessageMsg = `Silakan masukkan data baru untuk keyword '${keyword}'.`;
//       msg.reply(newMessageMsg);

//       // Tunggu balasan pengguna dan simpan data baru ke dalam database
//       const confirmation = await client.waitForReply(msg.from);
//       const values = [newMessage.body, keyword];

//       // Lakukan operasi UPDATE ke tabel yang telah Anda buat di database MySQL2
//       const sql = 'UPDATE wa_replies SET message = ? WHERE keyword = ?';
//       const connection = await createConnection();
//       try {
//         const [result] = await connection.execute(sql, values);
//         console.log(`Message updated in database with ID ${result.insertId}`);
//         msg.reply(`Pesan berhasil diperbarui '${keyword},${newMessage.body}'`);
//       } catch (error) {
//         console.error('Error updating message in database: ' + error);
//         msg.reply('Error updating message in database.');
//       } finally {
//         connection.end();
//       }
//     } else {
//       msg.reply(`Pengeditan data dengan keyword '${keyword}' dibatalkan.`);
//     }
//   }
// });

// 
client.initialize();




// Socket IO
io.on('connection', function(socket) {
  socket.emit('message', 'Connecting...');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready!');
    socket.emit('message', 'Whatsapp is ready!');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'Whatsapp is authenticated!');
    socket.emit('message', 'Whatsapp is authenticated!');
    console.log('AUTHENTICATED');
  });

  client.on('auth_failure', function(session) {
    socket.emit('message', 'Auth failure, restarting...');
  });

  client.on('disconnected', (reason) => {
    socket.emit('message', 'Whatsapp is disconnected!');
    client.destroy();
    client.initialize();
  });
});


const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  client.sendMessage(number, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send media
app.post('/send-media', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  // const media = MessageMedia.fromFilePath('./image-example.png');
  // const file = req.files.file;
  // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

const findGroupByName = async function(name) {
  const group = await client.getChats().then(chats => {
    return chats.find(chat => 
      chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
}

// Send message to group
// You can use chatID or group name, yea!
app.post('/send-group-message', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const message = req.body.message;

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      return res.status(422).json({
        status: false,
        message: 'No group found with name: ' + groupName
      });
    }
    chatId = group.id._serialized;
  }

  client.sendMessage(chatId, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Clearing message on spesific chat
app.post('/clear-message', [
  body('number').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  const chat = await client.getChatById(number);
  
  chat.clearMessages().then(status => {
    res.status(200).json({
      status: true,
      response: status
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  })
});

server.listen(port, function() {
  console.log('App running on *: ' + 8000);
});
