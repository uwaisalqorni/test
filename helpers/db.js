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

//const createConnection = require('./createConnection');

const getReply = async (keyword) => {
  const connection = await createConnection();
  const [row] = await connection.query('SELECT message FROM wa_replies WHERE keyword = ?', keyword);
  if (row.length > 0) return row[0].message;
  return false;
};

const updateReply = async (keyword, newMessage) => {
  const connection = await createConnection();
  const [result] = await connection.query('UPDATE wa_replies SET message = ? WHERE keyword = ?', [newMessage, keyword]);
  return result.affectedRows > 0;
};

const handleMessage = async (client, message) => {
  const { body, from } = message;
  const reply = await getReply(body);

  if (reply) {
    await client.sendText(from, reply);
  } else {
    await client.sendText(from, 'Maaf, pesan tidak ditemukan');
  }
};




// Fungsi untuk insert data ke database
// function insertToDatabase(data) {
//     const query = 'INSERT INTO wa_replies (field1, field2, field3) VALUES (?, ?, ?)';
//     const values = [data.field1, data.field2, data.field3];
  
//     db.query(query, values, (err, result) => {
//       if (err) {
//         console.log('Insert data ke database gagal: ', err);
//       } else {
//         console.log('Data berhasil diinsert ke database');
//       }
//     });
//   }
// function processMessage(message) {
//     // Memeriksa apakah pesan memiliki format yang benar
//     if (message.includes('INSERT: ')) {
//       // Memisahkan data yang perlu diinsert
//       const data = message.split('INSERT: ')[1].trim().split(',');
  
//       // Memformat data agar sesuai dengan struktur tabel pada database
//       const formattedData = {
//         field1: data[0],
//         field2: data[1],
//         field3: data[2],
//         // dan seterusnya
//       };
  
//       // Memanggil fungsi untuk melakukan insert data ke database
//       insertToDatabase(formattedData);
  
//       // Mengirim balasan ke pengirim pesan bahwa data telah berhasil diinsert ke database
//       sendWhatsAppMessage('Data berhasil diinsert ke database!');
//     } else {
//       // Mengirim balasan ke pengirim pesan bahwa format pesan tidak sesuai
//       sendWhatsAppMessage('Maaf, format pesan tidak sesuai. Harap kirim pesan dengan format INSERT: field1,field2,field3,...');
//     }
//   }
  

module.exports = {
    createConnection,
    getReply,
    updateReply,
    handleMessage
}