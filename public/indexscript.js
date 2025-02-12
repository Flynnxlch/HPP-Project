function inputData(event) {
  event.preventDefault();
  window.location.href = "SysInput.html";
}

function moreData() {
  alert("More Data dipilih");
}

function exitApp() {
  alert("Exit dipilih");
}



document.addEventListener("DOMContentLoaded", function() {

    // Fungsi untuk memuat opsi filter (cabang dan aircraft type) ke dalam form secara otomatis
    function loadFilterOptions() {
      fetch('/api/filters')
        .then(response => response.json())
        .then(data => {
          // Populate select cabang
          const cabangSelect = document.getElementById("cabang");
          data.cabang.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            cabangSelect.appendChild(option);
          });
          // Populate select aircraft type
          const aircraftSelect = document.getElementById("aircraft");
          data.aircraft_type.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            aircraftSelect.appendChild(option);
          });
        })
        .catch(error => console.error('Error loading filter options:', error));
    }

    
    // Fungsi toggleTable untuk menampilkan hanya tabel yang dipilih,
// dan jika sudah dalam mode preview (hanya satu tabel tampil) maka kembali menampilkan seluruh tabel.
window.toggleTable = function(selectedTableId) {

  // Cek apakah filter sudah diterapkan dengan memeriksa apakah placeholder masih terlihat
  if (!document.getElementById("placeholder").classList.contains("hidden")) {
    alert("Silakan filter data terlebih dahulu sebelum melakukan preview.");
    return;
  }
  // Daftar ID tabel yang dipakai (sesuai dengan showTables() di fungsi fetchAndDisplayData)
  const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal"];
  
  // Cek tabel mana yang saat ini tidak tersembunyi
  const visibleTables = tableIds.filter(id => !document.getElementById(id).classList.contains("hidden"));
  
  // Jika yang tampil hanya satu dan itu adalah tabel yang sama dengan pilihan, maka kembalikan ke tampilan awal (semua tabel tampil)
  if (visibleTables.length === 1 && visibleTables[0] === selectedTableId) {
    tableIds.forEach(id => {
      document.getElementById(id).classList.remove("hidden");
    });
  } else {
    // Sembunyikan semua tabel kecuali tabel yang dipilih
    tableIds.forEach(id => {
      if (id === selectedTableId) {
        document.getElementById(id).classList.remove("hidden");
      } else {
        document.getElementById(id).classList.add("hidden");
      }
    });
  }
};


    // Fungsi untuk mengambil data dari masing-masing endpoint dan menampilkannya pada tabel HTML
    function fetchAndDisplayData() {
      const cabang = document.getElementById("cabang").value;
      const aircraft_type = document.getElementById("aircraft").value;
  
      if (!cabang || !aircraft_type) {
        alert("Silakan pilih Cabang dan Aircraft Type terlebih dahulu.");
        return;
      }
  
      // Mengambil data dari ketiga tabel secara paralel
      Promise.all([
        fetch(`/api/gse_data?cabang=${encodeURIComponent(cabang)}&aircraft_type=${encodeURIComponent(aircraft_type)}`)
          .then(res => res.json()),
        fetch(`/api/sdm_data?cabang=${encodeURIComponent(cabang)}&aircraft_type=${encodeURIComponent(aircraft_type)}`)
          .then(res => res.json()),
        fetch(`/api/customers?cabang=${encodeURIComponent(cabang)}&aircraft_type=${encodeURIComponent(aircraft_type)}`)
          .then(res => res.json())
      ])
      .then(([gseData, sdmData, customersData]) => {
        // Tampilkan data ke tabel masing-masing
        populateTable("TableGSE", gseData);
        populateTable("TableSDM", sdmData);
        populateTable("TableOperasi", customersData);
  
        // Memastikan semua tabel yang tadinya hidden menjadi terlihat
        showTables();
  
        // Panggil fungsi hitungan (misalnya calculateTotals) jika diperlukan
        calculateTotals();
      })
      .catch(error => console.error("Error fetching data:", error));
    }
  

    // Fungsi untuk mengisi tabel dengan data yang didapat
    function populateTable(tableId, data) {
      const tableBody = document.querySelector(`#${tableId} tbody`);
      tableBody.innerHTML = ""; // Kosongkan data lama
      data.forEach(rowData => {
        const row = document.createElement("tr");
        // Asumsikan setiap objek rowData memiliki property yang akan ditampilkan secara berurutan
        for (let key in rowData) {
          const td = document.createElement("td");
          if (["id", "Cabang", "Aircraft_Type"].includes(key)) continue;
          td.textContent = rowData[key];
          row.appendChild(td);
        }
        tableBody.appendChild(row);
      });
    }
  
    // Fungsi untuk menampilkan tabel yang tadinya disembunyikan
    function showTables() {
      // Array id tabel yang akan ditampilkan
      const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal"];
      tableIds.forEach(id => {
        document.getElementById(id).classList.remove("hidden");
      });
  
      // Jika tombol Reset disembunyikan, maka tampilkan kembali tombol Reset
      document.querySelector("button[type='backbutton']").classList.remove("hidden");
      // Sembunyikan tombol Filter jika diinginkan
      document.querySelector("button[type='submitbutton']").classList.add("hidden");
    }

    function parseRupiah(value) {
      // Pastikan value merupakan string
      if (typeof value !== 'string') {
        value = value.toString();
      }
      // Jika ada prefix "Rp" dan spasi, hapus juga
      let cleaned = value.replace(/Rp\s?/g, "");
      // Hapus semua titik (pemisah ribuan)
      cleaned = cleaned.replace(/\./g, "");
      // Ganti koma (jika ada) menjadi titik sebagai pemisah desimal
      cleaned = cleaned.replace(/,/g, ".");
      // Konversi ke number
      return parseFloat(cleaned) || 0;
    }
    
  
    function formatCurrency(value) {
      // Pastikan value bertipe number
      const number = parseFloat(value);
      // Menggunakan toLocaleString dengan locale 'id-ID' untuk format ribuan dengan titik dan desimal dengan koma
      return "Rp " + number.toLocaleString('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    // Fungsi perhitungan, misalnya menghitung total cost dari tabel-tabel dan menghitung nilai-nilai di TableTotal
    function calculateTotals() {
      let totalGSE = 0;
      let totalSDM = 0;
      let Sboperasi = 0;
    
      // TableGSE: asumsikan kolom Cost berada pada index 4 (kolom kelima)
      document.querySelectorAll("#TableGSE tbody tr").forEach(row => {
        let cellText = row.cells[4]?.textContent || "";
        // Gunakan parseRupiah untuk memastikan "130.000" menjadi 130000
        let cost = parseRupiah(cellText);
        console.log("TableGSE - Cost:", cellText, "parsed:", cost);
        totalGSE += cost;
      });
    
      // TableSDM: asumsikan kolom Cost berada pada index 4 (kolom kelima)
      document.querySelectorAll("#TableSDM tbody tr").forEach(row => {
        let cellText = row.cells[4]?.textContent || "";
        let cost = parseRupiah(cellText);
        console.log("TableSDM - Cost:", cellText, "parsed:", cost);
        totalSDM += cost;
      });
    
      // TableOperasi: asumsikan kolom TC berada pada index 2 (kolom ketiga)
      document.querySelectorAll("#TableOperasi tbody tr").forEach(row => {
        let cellText = row.cells[2]?.textContent || "";
        let tc = parseRupiah(cellText);
        console.log("TableOperasi - TC:", cellText, "parsed:", tc);
        Sboperasi += tc;
      });
    
      let operasional = totalGSE + totalSDM;
      let profitMargin = (Sboperasi * 0.1) + operasional;
      let totalTarif = operasional + profitMargin + Sboperasi;
    
      // Tampilkan hasil dengan format yang diinginkan
      document.getElementById("totalGSE").textContent = formatCurrency(totalGSE);
      document.getElementById("totalSDM").textContent = formatCurrency(totalSDM);
      document.getElementById("Sboperasi").textContent = formatCurrency(Sboperasi);
      document.getElementById("operasional").textContent = formatCurrency(operasional);
      document.getElementById("profit_margin").textContent = formatCurrency(profitMargin);
      document.getElementById("total_tarif").textContent = formatCurrency(totalTarif);
    }
    
    // Panggil fungsi untuk load filter options saat halaman sudah siap
    loadFilterOptions();
  
    // =======================================================
// Fitur Edit Mode: Mengaktifkan mode edit pada tabel tertentu
// =======================================================

// Fungsi untuk menambahkan tombol edit di atas tabel (untuk TableGSE dan TableSDM)
function addEditButton(tableId) {
  if (tableId !== 'TableGSE' && tableId !== 'TableSDM') return; // hanya untuk tabel yang relevan

  const tableEl = document.getElementById(tableId);
  // Periksa apakah sudah ada container tombol edit di atas tabel
  if (!tableEl.previousElementSibling || !tableEl.previousElementSibling.classList.contains('edit-btn-container')) {
    const container = document.createElement('div');
    container.className = 'edit-btn-container';
    container.style.marginBottom = '8px'; // jarak 8px dari tabel

    const button = document.createElement('button');
    button.textContent = 'Edit';
    // Terapkan class default untuk tombol (akan diubah nanti jika mode save)
    button.classList.add('edit-btn');
    
    // Pasang event handler untuk toggle edit mode
    button.addEventListener('click', function() {
      toggleEditMode(tableId, button);
    });

    container.appendChild(button);
    tableEl.parentNode.insertBefore(container, tableEl);
  }
}

function toggleEditMode(tableId, button) {
  const table = document.getElementById(tableId);
  const isEditing = button.textContent === 'Save';

  if (isEditing) {
    // Nonaktifkan mode edit: nonaktifkan contentEditable dan hapus listener format (opsional)
    button.textContent = 'Edit';
    button.classList.remove('save-btn');
    button.classList.add('edit-btn');
    table.querySelectorAll('tbody tr').forEach(row => {
      [1, 2, 3].forEach(index => {
        const cell = row.cells[index];
        if (cell) {
          cell.contentEditable = "false";
          // Jika diinginkan, Anda bisa juga menghapus event listener format di sini:
          cell.removeEventListener('blur', formatRateCell);
          cell.removeEventListener('blur', formatDurationCell);
        }
      });
    });
    // Perbarui perhitungan total
    calculateTotals();
  } else {
    // Aktifkan mode edit: aktifkan contentEditable untuk kolom Qty, Durasi, dan Rate per Hour
    button.textContent = 'Save';
    button.classList.remove('edit-btn');
    button.classList.add('save-btn');
    table.querySelectorAll('tbody tr').forEach(row => {
      // Kolom Qty (index 1)
      let qtyCell = row.cells[1];
      if (qtyCell) {
        qtyCell.contentEditable = "true";
        qtyCell.addEventListener('input', () => recalcCostForRow(row));
      }
      // Kolom Durasi (index 2)
      let durationCell = row.cells[2];
      if (durationCell) {
        durationCell.contentEditable = "true";
        durationCell.addEventListener('input', () => recalcCostForRow(row));
        durationCell.addEventListener('blur', formatDurationCell);
      }
      // Kolom Rate per Hour (index 3)
      let rateCell = row.cells[3];
      if (rateCell) {
        rateCell.contentEditable = "true";
        rateCell.addEventListener('input', () => recalcCostForRow(row));
        rateCell.addEventListener('blur', formatRateCell);
      }
    });
  }
}


// Fungsi untuk menghitung ulang nilai Cost untuk sebuah baris
function recalcCostForRow(row) {
  const qtyCell = row.cells[1];
  const durationCell = row.cells[2];
  const rateCell = row.cells[3];
  const costCell = row.cells[4];

  // Untuk Qty: asumsikan tidak ada format khusus (bisa saja memakai titik jika memang angka desimal diperlukan)
  let qty = parseFloat(qtyCell.textContent.replace(/[^0-9.]/g, '')) || 0;
  // Untuk Durasi: izinkan koma sebagai desimal; hapus karakter lain selain angka dan koma,
  // lalu ganti koma dengan titik untuk parsing.
  let duration = parseFloat(
    durationCell.textContent.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
  // Untuk Rate per Hour: hapus semua titik dan karakter non-digit,
  // sehingga "100.000" ataupun "100000" akan menjadi 100000.
  let rate = parseInt(rateCell.textContent.replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;

  let cost = qty * duration * rate;
  costCell.textContent = formatCurrency(cost);
}

function formatRateCell(e) {
  let cell = e.target;
  let rawValue = cell.textContent;
  // Hapus semua titik dan karakter non-digit
  rawValue = rawValue.replace(/\./g, '').replace(/[^0-9]/g, '');
  let number = parseInt(rawValue) || 0;
  // Format dengan pemisah ribuan; tidak ada desimal.
  cell.textContent = number.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  // Perbarui nilai cost untuk baris terkait
  recalcCostForRow(cell.parentNode);
}

function formatDurationCell(e) {
  let cell = e.target;
  let rawValue = cell.textContent;
  // Hanya perbolehkan angka dan koma
  rawValue = rawValue.replace(/[^0-9,]/g, '');
  let number = parseFloat(rawValue.replace(',', '.')) || 0;
  // Format kembali dengan menggunkan locale id-ID (menghasilkan koma sebagai pemisah desimal)
  cell.textContent = number.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  recalcCostForRow(cell.parentNode);
}

// =======================================================
// Penyesuaian pada fungsi toggleTable untuk menambahkan tombol edit
// =======================================================
window.toggleTable = function(selectedTableId) {
  // Cek apakah filter sudah diterapkan dengan memeriksa apakah placeholder masih terlihat
  if (!document.getElementById("placeholder").classList.contains("hidden")) {
    alert("Silakan filter data terlebih dahulu sebelum melakukan preview.");
    return;
  }
  // Daftar ID tabel yang dipakai
  const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal"];
  
  // Cek tabel mana yang saat ini tidak tersembunyi
  const visibleTables = tableIds.filter(id => !document.getElementById(id).classList.contains("hidden"));
  
  // Jika yang tampil hanya satu dan itu adalah tabel yang sama dengan pilihan, maka kembalikan ke tampilan awal
  if (visibleTables.length === 1 && visibleTables[0] === selectedTableId) {
    tableIds.forEach(id => {
      document.getElementById(id).classList.remove("hidden");
    });
    // Hapus tombol edit jika ada
    document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());
  } else {
    // Sembunyikan semua tabel kecuali tabel yang dipilih
    tableIds.forEach(id => {
      if (id === selectedTableId) {
        document.getElementById(id).classList.remove("hidden");
      } else {
        document.getElementById(id).classList.add("hidden");
      }
    });
    // Jika tabel yang dipilih adalah TableGSE atau TableSDM, tambahkan tombol edit di atasnya
    if (selectedTableId === 'TableGSE' || selectedTableId === 'TableSDM') {
      addEditButton(selectedTableId);
    } else {
      // Hapus tombol edit jika bukan tabel yang bisa diedit
      document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());
    }
  }
};

// =======================================================
// Penyesuaian pada tombol Reset: Hapus juga tombol edit jika ada
// =======================================================
document.querySelector("button[type='backbutton']").addEventListener("click", function(event) {
  event.preventDefault();
  // Reset form filter
  document.getElementById("cabang").value = "";
  document.getElementById("aircraft").value = "";
  
  // Hanya mengosongkan tbody untuk tabel selain TableTotal
  document.querySelectorAll("table:not(#TableTotal) tbody").forEach(tbody => tbody.innerHTML = "");

  // Sembunyikan kembali tabel-tabel tersebut
  const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal"];
  tableIds.forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });

  // Tampilkan tombol Filter dan sembunyikan tombol Reset
  document.querySelector("button[type='submitbutton']").classList.remove("hidden");
  document.querySelector("button[type='backbutton']").classList.add("hidden");

  // Tampilkan kembali placeholder
  document.getElementById("placeholder").classList.remove("hidden");

  // Hapus tombol edit jika ada
  document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());
});


    // Menangani event klik tombol Filter
    document.querySelector("button[type='submitbutton']").addEventListener("click", function(event) {
      event.preventDefault();
      document.getElementById("placeholder").classList.add("hidden");
      fetchAndDisplayData();
    });
  
    // Event listener untuk tombol Reset, misalnya mengosongkan form, menyembunyikan tabel, dan mengembalikan tampilan awal
    document.querySelector("button[type='backbutton']").addEventListener("click", function(event) {
      event.preventDefault();
      // Reset form filter
      document.getElementById("cabang").value = "";
      document.getElementById("aircraft").value = "";
      
      // Hanya mengosongkan tbody untuk tabel selain TableTotal
      document.querySelectorAll("table:not(#TableTotal) tbody").forEach(tbody => tbody.innerHTML = "");

      // Sembunyikan kembali tabel-tabel tersebut
      const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal"];
      tableIds.forEach(id => {
        document.getElementById(id).classList.add("hidden");
      });
  
      // Tampilkan tombol Filter dan sembunyikan tombol Reset
      document.querySelector("button[type='submitbutton']").classList.remove("hidden");
      document.querySelector("button[type='backbutton']").classList.add("hidden");

      document.getElementById("placeholder").classList.remove("hidden");
    });
  });
  