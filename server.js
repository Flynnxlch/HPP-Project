const express = require('express');
const path = require('path');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const port = 3000;

// Middleware untuk parsing JSON & URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Menyajikan file statis dari folder "public"
app.use(express.static(path.join(__dirname, 'public')));

// Rute untuk halaman utama (Sys.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Sys.html'));
});

// ======================================================================
//                   ENDPOINT UNTUK GET DATA
// ======================================================================

// Endpoint untuk mengambil filter (distinct cabang dan aircraft_type)
app.get('/api/filters', (req, res) => {
  pool.query('SELECT DISTINCT cabang, aircraft_type FROM gse_data', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
    }
    // Menggunakan Set untuk menghilangkan duplikasi
    const cabangSet = new Set();
    const aircraftSet = new Set();
    results.forEach(row => {
      cabangSet.add(row.cabang);
      aircraftSet.add(row.aircraft_type);
    });
    res.json({ cabang: Array.from(cabangSet), aircraft_type: Array.from(aircraftSet) });
  });
});

// Buat pool koneksi database
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Ganti dengan password database Anda
  database: 'database_cbcb', // Ganti dengan nama database Anda
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Endpoint untuk mendapatkan data GSE
app.get('/api/gse_data', (req, res) => {
  const { cabang, aircraft_type } = req.query;
  if (!cabang || !aircraft_type) {
    return res.status(400).json({ error: 'Parameter cabang dan aircraft_type wajib disertakan.' });
  }
  pool.query(
    'SELECT * FROM gse_data WHERE cabang = ? AND aircraft_type = ?',
    [cabang, aircraft_type],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
      }
      res.json(results);
    }
  );
});

// Endpoint untuk mendapatkan data SDM
app.get('/api/sdm_data', (req, res) => {
  const { cabang, aircraft_type } = req.query;
  if (!cabang || !aircraft_type) {
    return res.status(400).json({ error: 'Parameter cabang dan aircraft_type wajib disertakan.' });
  }
  pool.query(
    'SELECT * FROM sdm_data WHERE cabang = ? AND aircraft_type = ?',
    [cabang, aircraft_type],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
      }
      res.json(results);
    }
  );
});

// Endpoint untuk mendapatkan data Customers
app.get('/api/customers', (req, res) => {
  const { cabang, aircraft_type } = req.query;
  if (!cabang || !aircraft_type) {
    return res.status(400).json({ error: 'Parameter cabang dan aircraft_type wajib disertakan.' });
  }
  pool.query(
    'SELECT * FROM customers WHERE cabang = ? AND aircraft_type = ?',
    [cabang, aircraft_type],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
      }
      res.json(results);
    }
  );
});

// ======================================================================
//                   ENDPOINT UNTUK MENAMBAH & MENGUPDATE DATA
// ======================================================================

// Contoh endpoint POST untuk menambah data ke tabel gse_data
app.post('/api/gse_data', (req, res) => {
  const data = req.body;
  pool.query('INSERT INTO gse_data SET ?', data, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
    }
    res.json({ message: 'Data gse_data berhasil ditambahkan', results });
  });
});

// Endpoint POST untuk tabel sdm_data
app.post('/api/sdm_data', (req, res) => {
  const data = req.body;
  pool.query('INSERT INTO sdm_data SET ?', data, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
    }
    res.json({ message: 'Data sdm_data berhasil ditambahkan', results });
  });
});

// Endpoint POST untuk tabel customers
app.post('/api/customers', (req, res) => {
  const data = req.body;
  pool.query('INSERT INTO customers SET ?', data, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
    }
    res.json({ message: 'Data customers berhasil ditambahkan', results });
  });
});

// Endpoint PUT untuk mengupdate data di tabel gse_data
app.put('/api/gse_data', (req, res) => {
  const { cabang, aircraft_type, ...updateData } = req.body;
  if (!cabang || !aircraft_type) {
    return res.status(400).json({ error: 'Parameter cabang dan aircraft_type wajib disertakan.' });
  }
  pool.query(
    'UPDATE gse_data SET ? WHERE cabang = ? AND aircraft_type = ?',
    [updateData, cabang, aircraft_type],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
      }
      res.json({ message: 'Data gse_data berhasil diupdate', results });
    }
  );
});

// Endpoint PUT untuk tabel sdm_data
app.put('/api/sdm_data', (req, res) => {
  const { cabang, aircraft_type, ...updateData } = req.body;
  if (!cabang || !aircraft_type) {
    return res.status(400).json({ error: 'Parameter cabang dan aircraft_type wajib disertakan.' });
  }
  pool.query(
    'UPDATE sdm_data SET ? WHERE cabang = ? AND aircraft_type = ?',
    [updateData, cabang, aircraft_type],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
      }
      res.json({ message: 'Data sdm_data berhasil diupdate', results });
    }
  );
});

// Endpoint PUT untuk tabel customers
app.put('/api/customers', (req, res) => {
  const { cabang, aircraft_type, ...updateData } = req.body;
  if (!cabang || !aircraft_type) {
    return res.status(400).json({ error: 'Parameter cabang dan aircraft_type wajib disertakan.' });
  }
  pool.query(
    'UPDATE customers SET ? WHERE cabang = ? AND aircraft_type = ?',
    [updateData, cabang, aircraft_type],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database.' });
      }
      res.json({ message: 'Data customers berhasil diupdate', results });
    }
  );
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
