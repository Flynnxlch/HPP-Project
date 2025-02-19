function inputData(event) {
  event.preventDefault();
  window.location.href = "SysInput.html";
}

function moreData() {
  alert("More Data dipilih");
}


document.addEventListener("DOMContentLoaded", function() {

  const userRole = localStorage.getItem("userRole");
    if(userRole !== "master"){
      // Nonaktifkan link untuk user non-master
      document.getElementById("linkSysoc").style.pointerEvents = "none";
      document.getElementById("linkSysRHP").style.pointerEvents = "none";
      document.getElementById("linkSysoc").style.opacity = "0.5";
      document.getElementById("linkSysRHP").style.opacity = "0.5";
    }
  

    document.getElementById("logout-link").addEventListener("click", function(e) {
      e.preventDefault();
      exitApp();
    });
    
    function exitApp() {
      // Hapus data login (misal role user) di localStorage
      localStorage.removeItem("userRole");
      // Redirect ke halaman login
      window.location.href = "Syslog.html";
    }

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

  // Fungsi resetView untuk mengurangi duplikasi kode pada Reset tampilan
  window.toggleTable = function(selectedTableId) {
    // Pastikan filter sudah diterapkan
    if (!document.getElementById("placeholder").classList.contains("hidden")) {
      alert("Silakan filter data terlebih dahulu sebelum melakukan preview.");
      return;
    }
    
    // Selalu sembunyikan container summaryCards saat preview aktif
    document.getElementById("summaryCards").classList.add("hidden");
    
    const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal", "TableOverhead"];
    
    // Jika opsi preview yang dipilih adalah Operasional (yang melibatkan TableOperasi & TableOverhead)
    if (selectedTableId === "TableOperasi") {
      // Cek apakah kedua tabel Operasional sudah visible dan hanya kedua tabel yang visible
      let visible = tableIds.filter(id => !document.getElementById(id).classList.contains("hidden"));
      let isOperasionalPreviewActive = 
           visible.length === 2 &&
           visible.includes("TableOperasi") &&
           visible.includes("TableOverhead");
      
      if (isOperasionalPreviewActive) {
        // Jika sudah dalam preview mode untuk Operasional, kembalikan ke tampilan full
        tableIds.forEach(id => {
          document.getElementById(id).classList.remove("hidden");
        });
        document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());
        document.getElementById("summaryCards").classList.remove("hidden");
      } else {
        // Aktifkan preview mode untuk Operasional: tampilkan hanya TableOperasi dan TableOverhead
        tableIds.forEach(id => {
          if (id === "TableOperasi" || id === "TableOverhead") {
            document.getElementById(id).classList.remove("hidden");
          } else {
            document.getElementById(id).classList.add("hidden");
          }
        });
        document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());
        // Pastikan summaryCards tetap tersembunyi saat preview
        document.getElementById("summaryCards").classList.add("hidden");
      }
    } else {
      // Untuk opsi preview GSE atau SDM
      // Cek apakah preview sudah aktif (hanya satu tabel visible)
      let visible = tableIds.filter(id => !document.getElementById(id).classList.contains("hidden"));
      let isPreviewActive = visible.length === 1 && visible[0] === selectedTableId;
      
      if (isPreviewActive) {
        // Jika sudah dalam preview mode, kembalikan ke tampilan full view
        tableIds.forEach(id => {
          document.getElementById(id).classList.remove("hidden");
        });
        document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());
        document.getElementById("summaryCards").classList.remove("hidden");
      } else {
        // Preview mode: tampilkan hanya tabel yang dipilih
        tableIds.forEach(id => {
          if (id === selectedTableId) {
            document.getElementById(id).classList.remove("hidden");
          } else {
            document.getElementById(id).classList.add("hidden");
          }
        });
        
        // Jika opsi yang dipilih adalah TableGSE atau TableSDM, tambahkan tombol edit
        if (selectedTableId === "TableGSE" || selectedTableId === "TableSDM") {
          addEditButton(selectedTableId);
        } else {
          document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());
        }
        
        // Pastikan summaryCards tersembunyi saat preview mode
        document.getElementById("summaryCards").classList.add("hidden");
      }
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

    // Mengambil data dari empat tabel secara paralel
    Promise.all([
      fetch(`/api/gse_data?cabang=${encodeURIComponent(cabang)}&aircraft_type=${encodeURIComponent(aircraft_type)}`)
        .then(res => res.json()),
      fetch(`/api/sdm_data?cabang=${encodeURIComponent(cabang)}&aircraft_type=${encodeURIComponent(aircraft_type)}`)
        .then(res => res.json()),
      fetch(`/api/customers?cabang=${encodeURIComponent(cabang)}&aircraft_type=${encodeURIComponent(aircraft_type)}`)
        .then(res => res.json()),
      fetch(`/api/overhead?cabang=${encodeURIComponent(cabang)}&aircraft_type=${encodeURIComponent(aircraft_type)}`)
        .then(res => res.json())
    ])
    .then(([gseData, sdmData, customersData, overheadData]) => {
      // Tampilkan data ke tabel masing-masing
      populateTable("TableGSE", gseData);
      populateTable("TableSDM", sdmData);
      populateTableOperasi(customersData);   // atau nama data yg sesuai (data operasional)
      populateTableOverhead(overheadData);

      // Memastikan semua tabel yang tadinya hidden menjadi terlihat
      showTables();

      // Panggil fungsi hitungan (misalnya calculateTotals) jika diperlukan
      calculateTotals();

      // Attach event listeners untuk persentase (TC) 
      attachOperasionalListeners();
    })
    .catch(error => console.error("Error fetching data:", error));
  }

  function populateTableOperasi(data) {
    const tableBody = document.querySelector("#TableOperasi tbody");
    tableBody.innerHTML = "";
    data.forEach(rowData => {
      const row = document.createElement("tr");
      // Simpan data atribut jika perlu
      row.dataset.id = rowData.id;
      row.dataset.cabang = rowData.cabang;
      row.dataset.aircraftType = rowData.aircraft_type;
      
      // Kolom 1: Keterangan (deskripsi)
      const descCell = document.createElement("td");
      descCell.textContent = rowData.Keterangan || "";
      row.appendChild(descCell);
      
      // Kolom 2: Persentase (Standar)
      const percentCell = document.createElement("td");
      // Jika nilai Standar sudah mengandung "%" gunakan apa adanya, jika tidak, tambahkan "%"
      let standar = rowData.Standar ? rowData.Standar.toString() : "0";
      percentCell.textContent = standar.includes("%") ? standar : standar + "%";
      row.appendChild(percentCell);
      
      // Kolom 3: TC (kosong, nanti diisi secara realtime)
      const tcCell = document.createElement("td");
      tcCell.textContent = "";
      row.appendChild(tcCell);
      
      tableBody.appendChild(row);
    });
  }
  
  /*
    Fungsi populateTableOverhead() serupa dengan populateTableOperasi()
  */
  function populateTableOverhead(data) {
    const tableBody = document.querySelector("#TableOverhead tbody");
    tableBody.innerHTML = "";
    data.forEach(rowData => {
      const row = document.createElement("tr");
      row.dataset.id = rowData.id;
      row.dataset.cabang = rowData.cabang;
      row.dataset.aircraftType = rowData.aircraft_type;
      
      const descCell = document.createElement("td");
      descCell.textContent = rowData.Keterangan || "";
      row.appendChild(descCell);
      
      const percentCell = document.createElement("td");
      let standar = rowData.Standar ? rowData.Standar.toString() : "0";
      percentCell.textContent = standar.includes("%") ? standar : standar + "%";
      row.appendChild(percentCell);
      
      const tcCell = document.createElement("td");
      tcCell.textContent = "";
      row.appendChild(tcCell);
      
      tableBody.appendChild(row);
    });
  }
  

  // Fungsi untuk mengisi tabel dengan data yang didapat
  function populateTable(tableId, data) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    tableBody.innerHTML = ""; // Kosongkan data lama
    data.forEach(rowData => {
      const row = document.createElement("tr");

      if (rowData.id) row.dataset.id = rowData.id;
      if (rowData.cabang) row.dataset.cabang = rowData.cabang;
      if (rowData.aircraft_type) row.dataset.aircraftType = rowData.aircraft_type;
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
    const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal", "TableOverhead"];
    tableIds.forEach(id => {
      document.getElementById(id).classList.remove("hidden");
    });

    // Jika tombol Reset disembunyikan, maka tampilkan kembali tombol Reset
    document.querySelector("button[type='backbutton']").classList.remove("hidden");
    // Sembunyikan tombol Filter jika diinginkan
    document.querySelector("button[type='submitbutton']").classList.add("hidden");

    document.getElementById("summaryCards").classList.remove("hidden");
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
  
  function parsePercentage(value) {
    // Hapus karakter "%" dan spasi, ganti koma dengan titik
    let cleaned = value.replace("%", "").trim().replace(",", ".");
    let num = parseFloat(cleaned);
    // Jika gagal parsing, kembalikan 0; jika berhasil, bagi dengan 100
    return isNaN(num) ? 0 : num / 100;
  }
  
  // Fungsi parsing localized number yang sudah ada (contoh: "Rp 1.234,56" menjadi 1234.56)
  function parseLocalizedNumber(value) {
    if (typeof value !== 'string') value = value.toString();
    // Hapus "Rp" dan spasi, hapus titik, dan ganti koma dengan titik
    let cleaned = value.replace(/Rp\s?/g, "").trim().replace(/\./g, "");
    return parseFloat(cleaned.replace(/,/g, '.')) || 0;
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

  function recalcTCForOperasiRow(row) {
    // Cek operasional
    let operasionalElem = document.getElementById("operasional");
    let operasionalText = operasionalElem?.textContent || "";
    if (!operasionalText.trim()) {
      // Pastikan kita punya fallback
      operasionalText = "Rp 0,00";
    }
    let operasionalValue = parseLocalizedNumber(operasionalText);
  
    // Cek persentase
    let percentageText = row.cells[1]?.textContent.trim() || "0%";
    let percentage = parsePercentage(percentageText);
  
    // Hitung
    let tc = operasionalValue * percentage;
    // Tulis ke kolom TC (index 2)
    row.cells[2].textContent = formatCurrency(tc);
    calculateTotals();
  }
  
  function recalcTCForOverheadRow(row) {
    let operasionalElem = document.getElementById("operasional");
    let operasionalText = operasionalElem?.textContent || "";
    if (!operasionalText.trim()) {
      operasionalText = "Rp 0,00";
    }
    let operasionalValue = parseLocalizedNumber(operasionalText);
  
    let percentageText = row.cells[1]?.textContent.trim() || "0%";
    let percentage = parsePercentage(percentageText);
  
    let tc = operasionalValue * percentage;
    row.cells[2].textContent = formatCurrency(tc);
    calculateTotals();
  }
  
  function attachOperasionalListeners() {
    // TableOperasi
    document.querySelectorAll("#TableOperasi tbody tr").forEach(row => {
      const percentageCell = row.cells[1];
      // Pastikan row.cells[1] ada
      if (percentageCell) {
        percentageCell.contentEditable = "true";
        percentageCell.addEventListener("input", () => recalcTCForOperasiRow(row));
        percentageCell.addEventListener("blur", () => {
          let rawValue = percentageCell.textContent.replace(/[^0-9,]/g, '');
          let num = parseLocalizedNumber(rawValue);
          percentageCell.textContent = num.toLocaleString('id-ID', {
            minimumFractionDigits: 1, 
            maximumFractionDigits: 1
          }) + '%';
          recalcTCForOperasiRow(row);
        });
      }
      // Hitung langsung saat pertama kali
      recalcTCForOperasiRow(row);
    });
  
    // TableOverhead
    document.querySelectorAll("#TableOverhead tbody tr").forEach(row => {
      const percentageCell = row.cells[1];
      if (percentageCell) {
        percentageCell.contentEditable = "true";
        percentageCell.addEventListener("input", () => recalcTCForOverheadRow(row));
        percentageCell.addEventListener("blur", () => {
          let rawValue = percentageCell.textContent.replace(/[^0-9,]/g, '');
          let num = parseLocalizedNumber(rawValue);
          percentageCell.textContent = num.toLocaleString('id-ID', {
            minimumFractionDigits: 1, 
            maximumFractionDigits: 1
          }) + '%';
          recalcTCForOverheadRow(row);
        });
      }
      recalcTCForOverheadRow(row);
    });
  }
  
  /*
    Pastikan:
    - calculateTotals() dipanggil saat data dari TableGSE dan TableSDM sudah tersedia
    - attachOperasionalListeners() dipanggil setelah tabel TableOperasi dan TableOverhead di-populate
    Sehingga, setiap baris pada kedua tabel akan menampilkan nilai TC yang dihitung secara realtime.
  */
  
  // Contoh pemanggilan (sesuaikan dengan logika fetching & populating tabel Anda)
  calculateTotals();
  attachOperasionalListeners();
  

  

  // Fungsi perhitungan, misalnya menghitung total cost dari tabel-tabel dan menghitung nilai-nilai di TableTotal
  function calculateTotals() {
    let totalGSE = 0;
    let totalSDM = 0;
    let Sboperasi = 0;
    let totalOverhead = 0;
    
    // TableGSE: asumsikan kolom Cost berada pada index 4 (kolom kelima)
    document.querySelectorAll("#TableGSE tbody tr").forEach(row => {
      let cellText = row.cells[4]?.textContent || "";
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
    // Ambil nilai dari cell TC, pastikan formatnya konsisten (misalnya "Rp 1.234,56")
    let tcText = row.cells[2]?.textContent || "";
    let tcValue = parseLocalizedNumber(tcText);
    Sboperasi += tcValue;
  });
  
  // Hitung total untuk TableOverhead (kolom TC pada index 2)
  document.querySelectorAll("#TableOverhead tbody tr").forEach(row => {
    let tcText = row.cells[2]?.textContent || "";
    let tcValue = parseLocalizedNumber(tcText);
    totalOverhead += tcValue;
  });
    

    let operasional = totalGSE + totalSDM;
    let operasionalToT = operasional + Sboperasi;
    let hpp = operasionalToT + totalOverhead;
    let marginal = hpp * 0.10;
    let valuejual = hpp + marginal;

    
    // Tampilkan hasil dengan format yang diinginkan
    document.getElementById("totalGSE").textContent = formatCurrency(totalGSE);
    document.getElementById("totalSDM").textContent = formatCurrency(totalSDM);
    document.getElementById("Sboperasi").textContent = formatCurrency(Sboperasi);
    document.getElementById("totalOverhead").textContent = formatCurrency(totalOverhead);
    document.getElementById("operasional").textContent = formatCurrency(operasional);
    document.getElementById("profit_margin").textContent = formatCurrency(operasionalToT);

    document.getElementById("HPPvalue").textContent = formatCurrency(hpp);
    document.getElementById("marginal").textContent = formatCurrency(marginal);
    document.getElementById("Valuejual").textContent = formatCurrency(valuejual);
  }

  // =======================================================
  // Fitur Edit Mode: Mengaktifkan mode edit pada tabel tertentu
  // =======================================================

  // Fungsi helper untuk membersihkan string format mata uang (misalnya menghilangkan "Rp ")
  function cleanCurrencyString(value) {
    let cleaned = value.replace(/Rp\s*/g, "");   // Hapus "Rp" dan spasi di depannya
    cleaned = cleaned.replace(/,00$/, "");        // Hapus trailing ",00" jika ada
    return cleaned.trim();
  }

  function toggleEditMode(tableId, button) {
    const table = document.getElementById(tableId);
    const isEditing = button.textContent === 'Save';
  
    if (isEditing) {
      // --- Mode Save: Nonaktifkan edit dan kumpulkan update untuk semua baris ---
      button.textContent = 'Edit';
      button.classList.remove('save-btn');
      button.classList.add('edit-btn');
  
      // Array untuk menyimpan promise update setiap baris
      const updatePromises = [];
  
      table.querySelectorAll('tbody tr').forEach(row => {
        // Nonaktifkan contentEditable hanya untuk kolom Qty dan Durasi
        [1, 2].forEach(index => {
          const cell = row.cells[index];
          if (cell) {
            cell.contentEditable = "false";
          }
        });
        // Pastikan kolom Rate per Hour (index 3) tetap non-editable
        if (row.cells[3]) {
          row.cells[3].contentEditable = "false";
        }
  
        // Ambil identifier dan nilai dari baris
        const id = row.dataset.id;
        const cabang = row.dataset.cabang;
        const aircraftType = row.dataset.aircraftType;
  
        // Ambil nilai langsung dari cell
        const Qty = row.cells[1].textContent.trim();
        const Durasi = row.cells[2].textContent.trim();
        // Ambil nilai Rate per Hour meskipun tidak diedit
        const RatePerHour = row.cells[3].textContent.trim();
        const rawCost = row.cells[4].textContent.trim();
        const Cost = cleanCurrencyString(rawCost);
  
        const updateData = {
          Qty,
          Durasi,
          RatePerHour,
          Cost
        };
  
        if (id) {
          updateData.id = id;
        } else {
          updateData.cabang = cabang;
          updateData.aircraft_type = aircraftType;
        }
  
        let endpoint = "";
        if (tableId === 'TableGSE') {
          endpoint = '/api/gse_data';
        } else if (tableId === 'TableSDM') {
          endpoint = '/api/sdm_data';
        } else {
          return;
        }
  
        const promise = fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }).then(response => response.json());
  
        updatePromises.push(promise);
      });
  
      Promise.all(updatePromises)
        .then(results => {
          console.log("Semua update berhasil:", results);
          alert("Data berhasil disimpan untuk semua baris.");
          calculateTotals();
        })
        .catch(error => {
          console.error("Error dalam update baris:", error);
          alert("Terjadi kesalahan saat menyimpan data.");
        });
  
    } else {
      // --- Mode Edit: Hanya Qty dan Durasi yang dapat diedit ---
      button.textContent = 'Save';
      button.classList.remove('edit-btn');
      button.classList.add('save-btn');
  
      table.querySelectorAll('tbody tr').forEach(row => {
        const qtyCell = row.cells[1];
        if (qtyCell) {
          qtyCell.contentEditable = "true";
          qtyCell.addEventListener('input', () => recalcCostForRow(row));
        }
        const durationCell = row.cells[2];
        if (durationCell) {
          durationCell.contentEditable = "true";
          durationCell.addEventListener('input', () => recalcCostForRow(row));
          durationCell.addEventListener('blur', formatDurationCell);
        }
        // Pastikan kolom Rate per Hour (index 3) dan Cost (index 4) tidak bisa diedit
        if (row.cells[3]) row.cells[3].contentEditable = "false";
        if (row.cells[4]) row.cells[4].contentEditable = "false";
      });
    }
  }
  

  // Fungsi untuk menghitung ulang nilai Cost untuk sebuah baris
  function recalcCostForRow(row) {
    const qtyCell = row.cells[1];
    const durationCell = row.cells[2];
    const rateCell = row.cells[3];
    const costCell = row.cells[4];

    let qty = parseFloat(qtyCell.textContent.replace(/[^0-9.]/g, '')) || 0;
    let duration = parseFloat(durationCell.textContent.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
    let rate = parseInt(rateCell.textContent.replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;

    let cost = qty * duration * rate;
    costCell.textContent = formatCurrency(cost);
  }

  function formatRateCell(e) {
    let cell = e.target;
    let rawValue = cell.textContent;
    rawValue = rawValue.replace(/\./g, '').replace(/[^0-9]/g, '');
    let number = parseInt(rawValue) || 0;
    cell.textContent = number.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    recalcCostForRow(cell.parentNode);
  }

  function formatDurationCell(e) {
    let cell = e.target;
    let rawValue = cell.textContent;
    rawValue = rawValue.replace(/[^0-9,]/g, '');
    let number = parseFloat(rawValue.replace(',', '.')) || 0;
    cell.textContent = number.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    recalcCostForRow(cell.parentNode);
  }

  // =======================================================
  // Penyesuaian pada tombol Reset: gunakan fungsi resetView()
  // =======================================================
  document.querySelector("button[type='backbutton']").addEventListener("click", function(event) {
    event.preventDefault();
    resetView();
  });

  // Menangani event klik tombol Filter
  document.querySelector("button[type='submitbutton']").addEventListener("click", function(event) {
    event.preventDefault();
    document.getElementById("placeholder").classList.add("hidden");
    fetchAndDisplayData();
  });

  // Event listener untuk tombol Reset lainnya (jika ada)
  document.querySelector("button[type='backbutton']").addEventListener("click", function(event) {
    event.preventDefault();
    resetView();
  });

  // Panggil fungsi untuk load filter options saat halaman sudah siap
  loadFilterOptions();
  
    // =======================================================
// Fitur Edit Mode: Mengaktifkan mode edit pada tabel tertentu
// =======================================================

// Fungsi untuk menambahkan tombol edit di atas tabel (untuk TableGSE dan TableSDM)
function addEditButton(tableId) {
  // Hanya untuk TableGSE dan TableSDM
  if (tableId !== 'TableGSE' && tableId !== 'TableSDM') return;

  // Hapus semua container tombol edit yang sudah ada di seluruh dokumen
  document.querySelectorAll('.edit-btn-container').forEach(el => el.remove());

  const tableEl = document.getElementById(tableId);
  const container = document.createElement('div');
  container.className = 'edit-btn-container';
  container.style.marginBottom = '8px'; // jarak 8px dari tabel

  const button = document.createElement('button');
  button.textContent = 'Edit';
  button.classList.add('edit-btn');
  
  // Pasang event handler untuk toggle edit mode
  button.addEventListener('click', function() {
    toggleEditMode(tableId, button);
  });
  
  container.appendChild(button);
  tableEl.parentNode.insertBefore(container, tableEl);
}



// Fungsi helper untuk membersihkan string format mata uang (misalnya menghilangkan "Rp ")
function cleanCurrencyString(value) {
  let cleaned = value.replace(/Rp\s*/g, "");   // Hapus "Rp" dan spasi di depannya
  cleaned = cleaned.replace(/,00$/, "");        // Hapus trailing ",00" jika ada
  return cleaned.trim();
}

function toggleEditMode(tableId, button) {
  const table = document.getElementById(tableId);
  const isEditing = button.textContent === 'Save';

  if (isEditing) {
    // Mode Save: Nonaktifkan edit dan simpan data
    button.textContent = 'Edit';
    button.classList.remove('save-btn');
    button.classList.add('edit-btn');

    const updatePromises = [];
    table.querySelectorAll('tbody tr').forEach(row => {
      // Nonaktifkan edit untuk kolom Qty dan Durasi (indeks 1 dan 2)
      [1, 2].forEach(index => {
        const cell = row.cells[index];
        if (cell) {
          cell.contentEditable = "false";
        }
      });
      // Pastikan kolom Rate per Hour (indeks 3) dan Cost (indeks 4) tidak dapat diedit
      if (row.cells[3]) row.cells[3].contentEditable = "false";
      if (row.cells[4]) row.cells[4].contentEditable = "false";

      // Ambil data dari baris
      const id = row.dataset.id;
      const cabang = row.dataset.cabang;
      const aircraftType = row.dataset.aircraftType;
      const Qty = row.cells[1].textContent.trim();
      const Durasi = row.cells[2].textContent.trim();
      const RatePerHour = row.cells[3].textContent.trim();
      const rawCost = row.cells[4].textContent.trim();
      const Cost = cleanCurrencyString(rawCost);

      const updateData = { Qty, Durasi, RatePerHour, Cost };
      if (id) {
        updateData.id = id;
      } else {
        updateData.cabang = cabang;
        updateData.aircraft_type = aircraftType;
      }

      let endpoint = "";
      if (tableId === 'TableGSE') {
        endpoint = '/api/gse_data';
      } else if (tableId === 'TableSDM') {
        endpoint = '/api/sdm_data';
      } else {
        return;
      }

      const promise = fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      }).then(response => response.json());

      updatePromises.push(promise);
    });

    Promise.all(updatePromises)
      .then(results => {
        console.log("Semua update berhasil:", results);
        alert("Data berhasil disimpan untuk semua baris.");
        calculateTotals();
      })
      .catch(error => {
        console.error("Error dalam update baris:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
      });
  } else {
    // Mode Edit: hanya kolom Qty dan Durasi yang dapat diedit
    button.textContent = 'Save';
    button.classList.remove('edit-btn');
    button.classList.add('save-btn');

    table.querySelectorAll('tbody tr').forEach(row => {
      // Kolom Qty (indeks 1)
      const qtyCell = row.cells[1];
      if (qtyCell) {
        qtyCell.contentEditable = "true";
        qtyCell.addEventListener('input', () => recalcCostForRow(row));
      }
      // Kolom Durasi (indeks 2)
      const durationCell = row.cells[2];
      if (durationCell) {
        durationCell.contentEditable = "true";
        durationCell.addEventListener('input', () => recalcCostForRow(row));
        durationCell.addEventListener('blur', formatDurationCell);
      }
      // Pastikan kolom Rate per Hour (indeks 3) dan Cost (indeks 4) tidak dapat diedit
      const rateCell = row.cells[3];
      if (rateCell) {
        rateCell.contentEditable = "false";
      }
      const costCell = row.cells[4];
      if (costCell) {
        costCell.contentEditable = "false";
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
  const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal", "TableOverhead"];
  tableIds.forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });

  document.getElementById("summaryCards").classList.add("hidden");

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
      const tableIds = ["TableGSE", "TableSDM", "TableOperasi", "TableTotal", "TableOverhead"];
      tableIds.forEach(id => {
        document.getElementById(id).classList.add("hidden");
      });
  
      // Tampilkan tombol Filter dan sembunyikan tombol Reset
      document.querySelector("button[type='submitbutton']").classList.remove("hidden");
      document.querySelector("button[type='backbutton']").classList.add("hidden");

      document.getElementById("placeholder").classList.remove("hidden");
    });
  });
  