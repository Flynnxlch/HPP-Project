const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 8080;

// Middleware untuk parsing JSON dan URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Buat pool koneksi database
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Ganti dengan password database Anda jika diperlukan
  database: 'database_cbcb', // Ganti dengan nama database Anda
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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
      console.error("Error fetching filters:", err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengambil filter.' });
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
        console.error("Error fetching gse_data:", err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengambil gse_data.' });
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
        console.error("Error fetching sdm_data:", err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengambil sdm_data.' });
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
        console.error("Error fetching customers:", err);
        return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengambil customers.' });
      }
      res.json(results);
    }
  );
});

// ======================================================================
//              ENDPOINT UNTUK MENAMBAH DATA (POST)
// ======================================================================

app.post('/api/gse_data', (req, res) => {
  const data = req.body;
  pool.query('INSERT INTO gse_data SET ?', data, (err, results) => {
    if (err) {
      console.error("Error inserting gse_data:", err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database saat menambahkan data gse_data.' });
    }
    res.json({ message: 'Data gse_data berhasil ditambahkan', results });
  });
});

app.post('/api/sdm_data', (req, res) => {
  const data = req.body;
  pool.query('INSERT INTO sdm_data SET ?', data, (err, results) => {
    if (err) {
      console.error("Error inserting sdm_data:", err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database saat menambahkan data sdm_data.' });
    }
    res.json({ message: 'Data sdm_data berhasil ditambahkan', results });
  });
});

app.post('/api/customers', (req, res) => {
  const data = req.body;
  pool.query('INSERT INTO customers SET ?', data, (err, results) => {
    if (err) {
      console.error("Error inserting customers:", err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada database saat menambahkan data customers.' });
    }
    res.json({ message: 'Data customers berhasil ditambahkan', results });
  });
});

// ======================================================================
//              ENDPOINT UNTUK MENGUPDATE DATA (PUT)
// ======================================================================

// PERBAIKAN PADA BAGIAN UPDATE DATA GSE
// Asumsikan tabel gse_data memiliki kolom: id, cabang, aircraft_type, qty, durasi, rate_per_hour, cost
app.put('/api/gse_data', (req, res) => {
  console.log("Received PUT /api/gse_data:", req.body);
  // Data yang diterima diharapkan sudah dalam format:
  // Qty: "3", Durasi: "1,5", RatePerHour: "100.000", Cost: "450.000,00"
  const { id, cabang, aircraft_type, Qty, Durasi, RatePerHour, Cost } = req.body;

  // Susun data update tanpa mengubah format
  const updateData = {
    Standar: Qty,                    // Kolom "Standar" di database untuk Qty
    Durasi: Durasi,                  // Kolom "Durasi" di database
    Rate_per_Hours_GSE: RatePerHour,   // Kolom "Rate_per_Hours_GSE" di database
    Cost: Cost                       // Kolom "Cost" di database
  };

  if (id) {
    pool.query(
      'UPDATE gse_data SET ? WHERE id = ?',
      [updateData, id],
      (err, results) => {
        if (err) {
          console.error("Error updating gse_data by id:", err);
          return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengupdate gse_data.' });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: `Data gse_data dengan id ${id} tidak ditemukan.` });
        }
        res.json({ message: 'Data gse_data berhasil diupdate', results });
      }
    );
  } else if (cabang && aircraft_type) {
    pool.query(
      'UPDATE gse_data SET ? WHERE cabang = ? AND aircraft_type = ?',
      [updateData, cabang, aircraft_type],
      (err, results) => {
        if (err) {
          console.error("Error updating gse_data by filter:", err);
          return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengupdate gse_data.' });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Data gse_data tidak ditemukan untuk filter tersebut.' });
        }
        res.json({ message: 'Data gse_data berhasil diupdate', results });
      }
    );
  } else {
    res.status(400).json({ error: 'Parameter id atau (cabang dan aircraft_type) wajib disertakan.' });
  }
});
// PERBAIKAN PADA BAGIAN UPDATE DATA SDM
// Asumsikan tabel sdm_data memiliki kolom: id, cabang, aircraft_type, qty, durasi, rate_per_hour, cost
app.put('/api/sdm_data', (req, res) => {
  console.log("Received PUT /api/sdm_data:", req.body);
  const { id, cabang, aircraft_type, Qty, Durasi, RatePerHour, Cost } = req.body;
  
  const updateData = {
    Standar: Qty,                    // Kolom "Standar" di database untuk Qty
    Durasi: Durasi,                  // Kolom "Durasi" di database
    Rate_per_Hours_GSE: RatePerHour,   // Kolom "Rate_per_Hours_GSE" di database
    Cost: Cost                       // Kolom "Cost" di database
  };

  if (id) {
    pool.query(
      'UPDATE sdm_data SET ? WHERE id = ?',
      [updateData, id],
      (err, results) => {
        if (err) {
          console.error("Error updating sdm_data by id:", err);
          return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengupdate sdm_data.' });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: `Data sdm_data dengan id ${id} tidak ditemukan.` });
        }
        res.json({ message: 'Data sdm_data berhasil diupdate', results });
      }
    );
  } else if (cabang && aircraft_type) {
    pool.query(
      'UPDATE sdm_data SET ? WHERE cabang = ? AND aircraft_type = ?',
      [updateData, cabang, aircraft_type],
      (err, results) => {
        if (err) {
          console.error("Error updating sdm_data by filter:", err);
          return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengupdate sdm_data.' });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Data sdm_data tidak ditemukan untuk filter tersebut.' });
        }
        res.json({ message: 'Data sdm_data berhasil diupdate', results });
      }
    );
  } else {
    res.status(400).json({ error: 'Parameter id atau (cabang dan aircraft_type) wajib disertakan.' });
  }
});


// Endpoint PUT untuk mengupdate data di tabel customers (jika diperlukan)
app.put('/api/customers', (req, res) => {
  console.log("Received PUT /api/customers:", req.body);
  const { id, cabang, aircraft_type, ...updateData } = req.body;
  
  if (id) {
    pool.query(
      'UPDATE customers SET ? WHERE id = ?',
      [updateData, id],
      (err, results) => {
        if (err) {
          console.error("Error updating customers by id:", err);
          return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengupdate customers.' });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: `Data customers dengan id ${id} tidak ditemukan.` });
        }
        res.json({ message: 'Data customers berhasil diupdate', results });
      }
    );
  } else if (cabang && aircraft_type) {
    pool.query(
      'UPDATE customers SET ? WHERE cabang = ? AND aircraft_type = ?',
      [updateData, cabang, aircraft_type],
      (err, results) => {
        if (err) {
          console.error("Error updating customers by filter:", err);
          return res.status(500).json({ error: 'Terjadi kesalahan pada database saat mengupdate customers.' });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Data customers tidak ditemukan untuk filter tersebut.' });
        }
        res.json({ message: 'Data customers berhasil diupdate', results });
      }
    );
  } else {
    res.status(400).json({ error: 'Parameter id atau (cabang dan aircraft_type) wajib disertakan.' });
  }
});

// ======================================================================
//                           START SERVER
// ======================================================================
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
