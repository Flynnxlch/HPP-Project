// === Fungsi Format Currency (untuk cost dan rate) ===
function formatCurrency(num) {
    return "Rp " + Number(num).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // === Fungsi Format Number (untuk durasi) ===
  function formatNumber(num) {
    // Format sebagai angka biasa dengan desimal memakai koma (tanpa prefix currency)
    return Number(num).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
  
  // === Fungsi untuk menghilangkan format dari currency (menghapus "Rp ", titik, dan mengganti koma dengan titik) ===
  function unformatCurrency(formatted) {
    // Hapus "Rp " dan hapus semua titik, kemudian ganti koma menjadi titik
    return parseFloat(formatted.replace(/Rp\s?/, "").replace(/\./g, "").replace(/,/g, "."));
  }
  
  // === Attach Formatting untuk Input Rate per Hour (currency) ===
  function attachCurrencyFormatting(input) {
    input.addEventListener("focus", function() {
      // Hapus formatting sehingga user dapat mengedit angka murni
      let value = input.value;
      if (value) {
        let num = unformatCurrency(value);
        input.value = isNaN(num) ? "" : num;
      }
    });
    input.addEventListener("blur", function() {
      let num = parseFloat(input.value);
      if (!isNaN(num)) {
        input.value = formatCurrency(num);
      } else {
        input.value = "";
      }
    });
  }
  
  // === Attach Formatting untuk Input Durasi (number dengan koma sebagai desimal) ===
  function attachNumberFormatting(input) {
    input.addEventListener("focus", function() {
      // Hapus thousand separator (titik) dan ganti koma ke titik untuk memudahkan edit
      let value = input.value;
      if (value) {
        let num = Number(value.replace(/\./g, "").replace(/,/g, "."));
        input.value = isNaN(num) ? "" : num;
      }
    });
    input.addEventListener("blur", function() {
      let num = parseFloat(input.value);
      if (!isNaN(num)) {
        input.value = formatNumber(num);
      } else {
        input.value = "";
      }
    });
  }
  
  // === Tab Navigation & Inisialisasi ===
  document.addEventListener("DOMContentLoaded", function() {
    // Tab Navigation
    const filterForm = document.getElementById("filterform");
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", function() {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
  
        const tabContents = document.querySelectorAll(".tab-content");
        tabContents.forEach(content => content.classList.remove("active"));
        

        const target = tab.getAttribute("data-tab");
        const targetContent = document.getElementById(target);
        if (targetContent) {
          targetContent.classList.add("active");
        }
  
        // Jika tab preview, generate ulang preview
        if (target === "preview") {
          generatePreview();
        }

        if (target === "home") {
          filterForm.style.display = "none";
        } else {
          filterForm.style.display = "flex";
        }
      });
    });
  
    // Attach kalkulasi dan formatting ke baris default untuk GSE & SDM
    document.querySelectorAll("#tableGSE tbody tr").forEach(row => {
      attachCalcListeners(row, "gse-cost", "tableGSE", "subtotalGSE");
      // Attach formatting untuk input rate dan durasi
      row.querySelectorAll("input.rate-input").forEach(attachCurrencyFormatting);
      row.querySelectorAll("input.durasi-input").forEach(attachNumberFormatting);
      updateRowCost(row, "gse-cost");
    });
    document.querySelectorAll("#tableSDM tbody tr").forEach(row => {
      attachCalcListeners(row, "sdm-cost", "tableSDM", "subtotalSDM");
      row.querySelectorAll("input.rate-input").forEach(attachCurrencyFormatting);
      row.querySelectorAll("input.durasi-input").forEach(attachNumberFormatting);
      updateRowCost(row, "sdm-cost");
    });
    
    // Attach validasi untuk Operasi qty (percentage) pada baris default
    document.querySelectorAll("input[name='operasi_qty']").forEach(input => {
      attachOperasiQtyValidation(input);
    });
    // Untuk baris Operasi juga attach formatting pada rate per hour dan durasi (jika diinginkan)
    document.querySelectorAll("#tableOperasi tbody tr").forEach(row => {
      row.querySelectorAll("input.rate-input").forEach(attachCurrencyFormatting);
      row.querySelectorAll("input.durasi-input").forEach(attachNumberFormatting);
    });
    
    // Update cost operasi awal (jika ada)
    updateAllOperasiCosts();
  });
  
  // === Kalkulasi Baris & Subtotal untuk GSE & SDM ===
  function updateRowCost(row, costClass) {
    let qty = parseFloat(row.querySelector("input[name$='qty']").value) || 0;
    let durasiInput = row.querySelector("input[name$='durasi']");
    let rateInput = row.querySelector("input[name$='rate']");
    // Untuk durasi dan rate, kita asumsikan nilai belum diformat (sesudah focus)
    let durasi = parseFloat(durasiInput ? durasiInput.value.replace(",", ".") : 0) || 0;
    let rate = parseFloat(rateInput ? rateInput.value.replace(/[Rp\s\.]/g, "").replace(",", ".") : 0) || 0;
    let cost = qty * durasi * rate;
    row.querySelector("." + costClass).textContent = formatCurrency(cost);
    return cost;
  }
  
  function updateSubtotal(tableId, costClass, subtotalElementId) {
    let total = 0;
    let table = document.getElementById(tableId);
    let rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      total += updateRowCost(row, costClass);
    });
    document.getElementById(subtotalElementId).textContent = formatCurrency(total);
    // Setelah update subtotal untuk GSE atau SDM, perbarui cost Operasi
    if (tableId === "tableGSE" || tableId === "tableSDM") {
      updateAllOperasiCosts();
    }
  }
  
  function attachCalcListeners(row, costClass, tableId, subtotalElementId) {
    let inputs = row.querySelectorAll("input.calc-input");
    inputs.forEach(input => {
      input.addEventListener("input", function() {
        updateRowCost(row, costClass);
        updateSubtotal(tableId, costClass, subtotalElementId);
      });
    });
  }
  
  // === Fungsi Ambil Nilai Subtotal Secara Numerik untuk GSE & SDM ===
  function getSubtotalValue(tableId) {
    let total = 0;
    let table = document.getElementById(tableId);
    let rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      let qtyInput = row.querySelector("input[name$='qty']");
      let durasiInput = row.querySelector("input[name$='durasi']");
      let rateInput = row.querySelector("input[name$='rate']");
      let qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
      let durasi = parseFloat(durasiInput ? durasiInput.value.replace(",", ".") : 0) || 0;
      let rate = parseFloat(rateInput ? rateInput.value.replace(/[Rp\s\.]/g, "").replace(",", ".") : 0) || 0;
      total += qty * durasi * rate;
    });
    return total;
  }
  
  // === Update Cost untuk Semua Baris Operasi ===
  function updateAllOperasiCosts() {
    let gseTotal = getSubtotalValue("tableGSE");
    let sdmTotal = getSubtotalValue("tableSDM");
    let baseTotal = gseTotal + sdmTotal;
    let operasiRows = document.querySelectorAll("#tableOperasi tbody tr");
    operasiRows.forEach(row => {
      let qtyInput = row.querySelector("input[name='operasi_qty']");
      let percentage = parseFloat(qtyInput.value) || 0;
      // Perhitungan: (subtotal GSE + subtotal SDM) × (persentase / 100)
      let cost = baseTotal * (percentage / 100);
      let costCell = row.querySelector(".operasi-cost");
      costCell.textContent = formatCurrency(cost);
    });
  }
  
  // === Validasi dan Update untuk Operasi Qty (Persentase) ===
  function attachOperasiQtyValidation(input) {
    input.setAttribute("max", "100");
    input.addEventListener("focus", function() {
      this.dataset.oldValue = this.value;
    });
    input.addEventListener("input", function() {
      let sum = 0;
      document.querySelectorAll("input[name='operasi_qty']").forEach(inp => {
        sum += parseFloat(inp.value) || 0;
      });
      if (sum > 100) {
        alert("Total percentage cannot exceed 100%");
        this.value = this.dataset.oldValue || 0;
      } else {
        this.dataset.oldValue = this.value;
        updateAllOperasiCosts();
      }
    });
  }
  
  // === Pembuatan Baris Baru ===
  function createNewRow(type) {
    let tr = document.createElement("tr");
    if (type === "gse") {
      tr.innerHTML = `
        <td>
          <select name="gse_item">
            <option value="">Pilih Service GSE</option>
            <option value="ATW">ATW</option>
            <option value="ATN">ATN</option>
            <option value="BTT Elektrik">BTT Elektrik</option>
            <option value="BTT">BTT</option>
            <option value="HLL">HLL</option>
            <option value="MDL">MDL</option>
            <option value="CBL">CBL</option>
            <option value="CBL-T">CBL-T</option>
            <option value="PBS">PBS</option>
            <option value="TPS">TPS</option>
            <option value="ATB">ATB</option>
            <option value="BCT">BCT</option>
            <option value="PDL">PDL</option>
            <option value="LPD">LPD</option>
            <option value="CDL">CDL</option>
            <option value="Wheel Chock">Wheel Chock</option>
            <option value="Safety Cone">Safety Cone</option>
            <option value="LST">LST</option>
            <option value="WST">WST</option>
          </select>
        </td>
        <td><input type="number" name="gse_qty" class="calc-input"></td>
        <td><input type="text" name="gse_durasi" class="calc-input durasi-input" inputmode="decimal"></td>
        <td><input type="text" name="gse_rate" class="calc-input rate-input" inputmode="decimal"></td>
        <td class="gse-cost">Rp 0.00</td>
        <td><button class="removeRow">Remove</button></td>
      `;
    } else if (type === "sdm") {
      tr.innerHTML = `
        <td>
          <select name="sdm_item">
            <option value="">Pilih Service SDM</option>
            <option value="Ramp Coordinator">Ramp Coordinator</option>
            <option value="Marshalling">Marshalling</option>
            <option value="Wing Man">Wing Man</option>
            <option value="Avsec Make up -Break Down">Avsec Make up -Break Down</option>
            <option value="Avsec Apron">Avsec Apron</option>
            <option value="Pax Handling (Arrival Asisst) TD">Pax Handling (Arrival Asisst) TD</option>
            <option value="Check In">Check In</option>
            <option value="Boarding Gate">Boarding Gate</option>
            <option value="Lost & Found">Lost & Found</option>
            <option value="Help Desk">Help Desk</option>
            <option value="Transfer Desk">Transfer Desk</option>
            <option value="Loading Master">Loading Master</option>
            <option value="Guide Man">Guide Man</option>
            <option value="A/C Cleaner">A/C Cleaner</option>
            <option value="Porter Apron">Porter Apron</option>
            <option value="Porter Make Up - Break Down">Porter Make Up - Break Down</option>
          </select>
        </td>
        <td><input type="number" name="sdm_qty" class="calc-input"></td>
        <td><input type="text" name="sdm_durasi" class="calc-input durasi-input" inputmode="decimal"></td>
        <td><input type="text" name="sdm_rate" class="calc-input rate-input" inputmode="decimal"></td>
        <td class="sdm-cost">Rp 0.00</td>
        <td><button class="removeRow">Remove</button></td>
      `;
    } else if (type === "operasi") {
      tr.innerHTML = `
        <td>
          <select name="operasi_item">
            <option value="">Pilih Service Operasi</option>
            <option value="Beban Promosi & Adm. Umum">Beban Promosi & Adm. Umum</option>
            <option value="Beban Kantor Pusat">Beban Kantor Pusat</option>
            <option value="Kendaraan Operasional">Kendaraan Operasional</option>
            <option value="Alat Komunikasi">Alat Komunikasi</option>
            <option value="Beban Sewa Sistem & Utilitas">Beban Sewa Sistem & Utilitas</option>
            <option value="Beban GH Support">Beban GH Support</option>
            <option value="Beban Kantor GH">Beban Kantor GH</option>
            <option value="Beban Klaim">Beban Klaim</option>
          </select>
        </td>
        <td>
          <div class="percentage-container">
            <input type="number" name="operasi_qty" max="100">
          </div>
        </td>
        <td><input type="text" name="operasi_durasi" class="durasi-input" inputmode="decimal"></td>
        <td><input type="text" name="operasi_rate" class="rate-input" inputmode="decimal"></td>
        <!-- Kolom Cost Operasi tampil sebagai elemen td read-only -->
        <td class="operasi-cost">Rp 0.00</td>
        <td><button class="removeRow">Remove</button></td>
      `;
      let qtyInput = tr.querySelector("input[name='operasi_qty']");
      if (qtyInput) {
        attachOperasiQtyValidation(qtyInput);
      }
    }
    return tr;
  }
  
  function addRow(tableId, type, costClass, subtotalElementId) {
    let tableBody = document.querySelector(`#${tableId} tbody`);
    let newRow = createNewRow(type);
    tableBody.appendChild(newRow);
  
    if (type === "gse" || type === "sdm") {
      attachCalcListeners(newRow, costClass, tableId, subtotalElementId);
    }
    
    // Attach formatting untuk rate dan durasi pada baris baru
    newRow.querySelectorAll("input.rate-input").forEach(attachCurrencyFormatting);
    newRow.querySelectorAll("input.durasi-input").forEach(attachNumberFormatting);
    
    newRow.querySelector(".removeRow").addEventListener("click", function() {
      newRow.remove();
      if (type === "gse" || type === "sdm") {
        updateSubtotal(tableId, costClass, subtotalElementId);
      }
      if (type === "operasi") {
        updateAllOperasiCosts();
      }
    });
  }
  
  function updateSubmitButtonState() {
    const gseRows = document.querySelectorAll("#tableGSE tbody tr").length;
    const sdmRows = document.querySelectorAll("#tableSDM tbody tr").length;
    const operasiRows = document.querySelectorAll("#tableOperasi tbody tr").length;
    const submitButton = document.querySelector("#filterform button[type='submitbutton']");
        
    // Aktifkan tombol hanya jika masing-masing tabel memiliki minimal 3 baris
    if (gseRows >= 3 && sdmRows >= 3 && operasiRows >= 3) {
      submitButton.disabled = false;
      submitButton.style.opacity = "1";
    } else {
      submitButton.disabled = true;
      submitButton.style.opacity = "0.5";
    }
  }
  

  // === Event Listener untuk Tombol Add ===
  document.getElementById("addGSE").addEventListener("click", function() {
    addRow("tableGSE", "gse", "gse-cost", "subtotalGSE");
  });
  document.getElementById("addSDM").addEventListener("click", function() {
    addRow("tableSDM", "sdm", "sdm-cost", "subtotalSDM");
  });
  document.getElementById("addOperasi").addEventListener("click", function() {
    addRow("tableOperasi", "operasi");
  });
  
  // === Pasang Event Listener Remove untuk Baris Default ===
  document.querySelectorAll("#tableGSE .removeRow").forEach(button => {
    button.addEventListener("click", function() {
      let row = button.closest("tr");
      row.remove();
      updateSubtotal("tableGSE", "gse-cost", "subtotalGSE");
    });
  });
  document.querySelectorAll("#tableSDM .removeRow").forEach(button => {
    button.addEventListener("click", function() {
      let row = button.closest("tr");
      row.remove();
      updateSubtotal("tableSDM", "sdm-cost", "subtotalSDM");
    });
  });
  document.querySelectorAll("#tableOperasi .removeRow").forEach(button => {
    button.addEventListener("click", function() {
      button.closest("tr").remove();
      updateAllOperasiCosts();
    });
  });
  
  // === Preview Data ===
  function generatePreview() {
    let previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = ''; // Bersihkan konten preview sebelumnya
    generatePreviewForTable('GSE Data', 'tableGSE', previewContent);
    generatePreviewForTable('SDM Data', 'tableSDM', previewContent);
    generatePreviewForTable('Operasi Data', 'tableOperasi', previewContent);
  }
  
  function generatePreviewForTable(title, tableId, container) {
    let table = document.getElementById(tableId);
    let rows = table.querySelectorAll("tbody tr");
    if (rows.length === 0) return; // Lewati jika tidak ada data
  
    let sectionDiv = document.createElement('div');
    sectionDiv.style.marginBottom = "30px";
  
    let heading = document.createElement('h3');
    heading.textContent = title;
    sectionDiv.appendChild(heading);
  
    let previewTable = document.createElement('table');
    let thead = table.querySelector("thead").cloneNode(true);
    // Hapus kolom terakhir (Action) pada header
    let headerRow = thead.querySelector("tr");
    if (headerRow && headerRow.lastElementChild) {
      headerRow.removeChild(headerRow.lastElementChild);
    }
    previewTable.appendChild(thead);
  
    let tbody = document.createElement('tbody');
    rows.forEach(row => {
      let newRow = document.createElement('tr');
      let cells = row.querySelectorAll("td");
      cells.forEach((cell, index) => {
        // Lewati kolom Action (kolom terakhir)
        if (index === cells.length - 1) return;
        let newCell = document.createElement('td');
        let control = cell.querySelector("input, select");
        newCell.textContent = control ? control.value : cell.textContent;
        newRow.appendChild(newCell);
      });
      tbody.appendChild(newRow);
    });
    previewTable.appendChild(tbody);
    sectionDiv.appendChild(previewTable);
    container.appendChild(sectionDiv);
  }