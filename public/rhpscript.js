let currentEditingCard = null;

document.addEventListener('DOMContentLoaded', function() {
  fetchAndRenderCards();
});

/* 
  Fungsi formatCurrency hanya untuk tampilan.
  Contoh: nilai 1234 akan ditampilkan sebagai "Rp. 1.234,00".
*/
function formatCurrency(num) {
  let intNum = Math.floor(num);
  let s = intNum.toString();
  // Menambahkan titik sebagai separator ribuan
  let formatted = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return "Rp. " + formatted + ",00";
}

/* 
  Fungsi unformatCurrencyDisplay menghapus tampilan format (prefix "Rp. " dan suffix ",00")
  tanpa mengubah separator ribuan. Hasilnya adalah string seperti "1.234".
*/
function unformatCurrencyDisplay(formatted) {
  return formatted.replace("Rp. ", "").replace(",00", "").trim();
}

/* 
  Fungsi parseCurrency mengubah string seperti "1.234" menjadi nilai numerik.
  Di sini, titik (separator ribuan) dihapus agar menghasilkan angka murni.
*/
function parseCurrency(value) {
  return parseInt(value.replace(/\./g, ''), 10);
}

function fetchAndRenderCards() {
  fetch('/api/filters_rate')
    .then(response => response.json())
    .then(data => {
      const cabangArray = data.cabang;
      cabangArray.forEach((cabang, index) => {
        Promise.all([
          fetch(`/api/gse_data_by_cabang?cabang=${encodeURIComponent(cabang)}`)
            .then(res => res.json()),
          fetch(`/api/sdm_data_by_cabang?cabang=${encodeURIComponent(cabang)}`)
            .then(res => res.json())
        ])
        .then(([gseData, sdmData]) => {
          // Hilangkan duplikat berdasarkan kombinasi Rate_per_Hours_GSE dan Keterangan
          const uniqueGSEData = gseData.filter((item, idx, self) => {
            return idx === self.findIndex(t => t.Rate_per_Hours_GSE === item.Rate_per_Hours_GSE && t.Keterangan === item.Keterangan);
          });
          const uniqueSDMData = sdmData.filter((item, idx, self) => {
            return idx === self.findIndex(t => t.Rate_per_Hours_GSE === item.Rate_per_Hours_GSE && t.Keterangan === item.Keterangan);
          });

          // Ambil nilai untuk perhitungan (menghapus separator ribuan)
          const rates = [];
          uniqueGSEData.forEach(item => {
            if(item.Rate_per_Hours_GSE) {
              let raw = item.Rate_per_Hours_GSE.toString(); // Misalnya "1.234"
              let num = parseCurrency(raw);
              if (!isNaN(num)) { rates.push(num); }
            }
          });
          uniqueSDMData.forEach(item => {
            if(item.Rate_per_Hours_GSE) {
              let raw = item.Rate_per_Hours_GSE.toString();
              let num = parseCurrency(raw);
              if (!isNaN(num)) { rates.push(num); }
            }
          });

          let highest = '-', lowest = '-', total = '-';
          let totalNumeric = 0;
          if (rates.length > 0) {
            highest = Math.max(...rates);
            lowest = Math.min(...rates);
            totalNumeric = rates.reduce((sum, val) => sum + val, 0);
            highest = formatCurrency(highest);
            lowest = formatCurrency(lowest);
            total = formatCurrency(totalNumeric);
          }

          // Buat tabel untuk GSE
          let gseTable = '<table class="gse-table" onclick="event.stopPropagation()" border="1" cellpadding="5" cellspacing="0">';
          gseTable += '<tr><th>Beban</th><th>Rate per Hour</th></tr>';
          uniqueGSEData.forEach(item => {
            let cellValue = '';
            if(item.Rate_per_Hours_GSE) {
              let num = parseCurrency(item.Rate_per_Hours_GSE.toString());
              cellValue = formatCurrency(num);
            }
            gseTable += `<tr><td>${item.Keterangan || ''}</td><td class="rate-cell">${cellValue}</td></tr>`;
          });
          gseTable += '</table>';

          // Buat tabel untuk SDM
          let sdmTable = '<table class="sdm-table" onclick="event.stopPropagation()" border="1" cellpadding="5" cellspacing="0">';
          sdmTable += '<tr><th>Beban</th><th>Rate per Hour</th></tr>';
          uniqueSDMData.forEach(item => {
            let cellValue = '';
            if(item.Rate_per_Hours_GSE) {
              let num = parseCurrency(item.Rate_per_Hours_GSE.toString());
              cellValue = formatCurrency(num);
            }
            sdmTable += `<tr><td>${item.Keterangan || ''}</td><td class="rate-cell">${cellValue}</td></tr>`;
          });
          sdmTable += '</table>';

          // Buat card untuk tiap cabang
          const cardId = `card-${index}`;
          const cardHTML = `
            <div class="card" id="${cardId}" data-total="${totalNumeric}" data-cabang="${cabang}" onclick="toggleDetails('${cardId}')">
              <div class="card-header">
                <div class="card-row">
                  <div class="card-column" id="nama-cabang-${index}">${cabang}</div>
                  <div class="card-column" id="highest-${index}" style="color: green;">Highest: ${highest}</div>
                  <div class="card-column" id="lowest-${index}" style="color: red;">Lowest: ${lowest}</div>
                  <div class="card-column" id="total-${index}">Total: ${total}</div>
                </div>
                <div class="action-buttons" style="display: none;">
                  <button class="edit-btn" onclick="editCard(event, '${cardId}')">Edit</button>
                  <button class="save-btn" onclick="saveCard(event, '${cardId}')" style="display:none;">Save</button>
                </div>
                <span class="toggle" id="toggle-${cardId}">&#8250;</span>
              </div>
              <div class="details" id="details-${cardId}" style="display: none;">
                <div class="detail-section">
                  <h4>GSE Data</h4>
                  <div class="table-card">${gseTable}</div>
                </div>
                <div class="detail-section">
                  <h4>SDM Data</h4>
                  <div class="table-card">${sdmTable}</div>
                </div>
              </div>
            </div>
          `;
          document.getElementById('card-container').innerHTML += cardHTML;
        })
        .catch(err => console.error("Error fetching data untuk cabang", cabang, err));
      });
    })
    .catch(err => console.error("Error fetching filters rate:", err));
}

function toggleDetails(id) {
  const card = document.getElementById(id);
  if (card.classList.contains('editing')) return;
  if (currentEditingCard && currentEditingCard !== id) {
    alert("Silakan simpan terlebih dahulu kartu yang sedang diedit.");
    return;
  }
  const detailsEl = document.getElementById('details-' + id);
  const toggleIcon = document.getElementById('toggle-' + id);
  const actionButtons = card.querySelector('.action-buttons');
  if (detailsEl.style.display === 'block') {
    detailsEl.style.display = 'none';
    toggleIcon.innerHTML = "&#8250;";
    if (actionButtons) actionButtons.style.display = 'none';
  } else {
    detailsEl.style.display = 'block';
    toggleIcon.innerHTML = "&#8249;";
    if (actionButtons && !card.classList.contains('editing')) {
      actionButtons.style.display = 'flex';
    }
  }
}

function editCard(event, cardId) {
  event.stopPropagation();
  if (currentEditingCard && currentEditingCard !== cardId) {
    alert("Anda sedang mengedit kartu lain. Silakan simpan terlebih dahulu.");
    return;
  }
  currentEditingCard = cardId;
  const card = document.getElementById(cardId);
  card.classList.add('editing');
  const editBtn = card.querySelector('.edit-btn');
  const saveBtn = card.querySelector('.save-btn');
  editBtn.style.display = 'none';
  saveBtn.style.display = 'inline-block';
  // Saat edit, tampilkan nilai tanpa format (hapus "Rp. " dan ",00")
  const rateCells = card.querySelectorAll('.rate-cell');
  rateCells.forEach(cell => {
    cell.innerText = unformatCurrencyDisplay(cell.innerText);
    cell.setAttribute('contenteditable', 'true');
    cell.style.border = '1px dashed #ccc';
    cell.style.backgroundColor = '#fff';
  });
}

function saveCard(event, cardId) {
  event.stopPropagation();
  const card = document.getElementById(cardId);
  const cabang = card.getAttribute('data-cabang');
  const rateCells = card.querySelectorAll('.rate-cell');
  let allValues = [];
  let gseData = [];
  let sdmData = [];
  
  // Proses tiap baris di tabel GSE
  const gseRows = card.querySelectorAll('.gse-table tr');
  gseRows.forEach((row, idx) => {
    if (idx > 0) {
      const cells = row.querySelectorAll('td');
      const keterangan = cells[0].innerText.trim();
      let raw = cells[1].innerText.trim();
      if(raw.indexOf("Rp.") !== -1) {
        raw = unformatCurrencyDisplay(raw);
      }
      let numeric = parseCurrency(raw);
      if (!isNaN(numeric)) { allValues.push(numeric); }
      // Data yang dikirim ke server adalah nilai input asli, misalnya "1.234"
      gseData.push({ Keterangan: keterangan, Rate_per_Hours_GSE: raw });
    }
  });
  
  // Proses tiap baris di tabel SDM
  const sdmRows = card.querySelectorAll('.sdm-table tr');
  sdmRows.forEach((row, idx) => {
    if (idx > 0) {
      const cells = row.querySelectorAll('td');
      const keterangan = cells[0].innerText.trim();
      let raw = cells[1].innerText.trim();
      if(raw.indexOf("Rp.") !== -1) {
        raw = unformatCurrencyDisplay(raw);
      }
      let numeric = parseCurrency(raw);
      if (!isNaN(numeric)) { allValues.push(numeric); }
      sdmData.push({ Keterangan: keterangan, Rate_per_Hours_GSE: raw });
    }
  });
  
  // Update tampilan header (Highest, Lowest) berdasarkan perhitungan
  if (allValues.length > 0) {
    const newHighest = Math.max(...allValues);
    const newLowest = Math.min(...allValues);
    const index = cardId.split('-')[1];
    const highestElem = document.getElementById(`highest-${index}`);
    const lowestElem = document.getElementById(`lowest-${index}`);
    highestElem.innerText = `Highest: ${formatCurrency(newHighest)}`;
    lowestElem.innerText = `Lowest: ${formatCurrency(newLowest)}`;
  }
  
  // Kirim data ke server menggunakan nilai input asli (tanpa "Rp. " dan ",00")
  let gsePromise = Promise.resolve();
  if (gseData.length > 0) {
    gsePromise = fetch('/api/gse_data_by_cabang', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cabang: cabang, data: gseData })
    });
  }
  
  let sdmPromise = Promise.resolve();
  if (sdmData.length > 0) {
    sdmPromise = fetch('/api/sdm_data_by_cabang', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cabang: cabang, data: sdmData })
    });
  }
  
  Promise.all([gsePromise, sdmPromise]).then(() => {
    card.classList.remove('editing');
    const editBtn = card.querySelector('.edit-btn');
    const saveBtn = card.querySelector('.save-btn');
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    currentEditingCard = null;
    let totalNumeric = allValues.reduce((sum, val) => sum + val, 0);
    card.setAttribute('data-total', totalNumeric);
    const index = cardId.split('-')[1];
    const totalElem = document.getElementById(`total-${index}`);
    totalElem.innerText = `Total: ${formatCurrency(totalNumeric)}`;
  }).catch(err => {
    console.error(err);
    alert("Terjadi kesalahan saat menyimpan data.");
  });
}

function sortCards(order) {
  if (currentEditingCard) {
    alert("Selesaikan pengeditan pada kartu yang sedang aktif sebelum melakukan sorting.");
    return;
  }
  const container = document.getElementById('card-container');
  const cards = Array.from(container.getElementsByClassName('card'));
  cards.sort((a, b) => {
    const totalA = parseInt(a.getAttribute('data-total'), 10);
    const totalB = parseInt(b.getAttribute('data-total'), 10);
    return order === 'asc' ? totalA - totalB : totalB - totalA;
  });
  container.innerHTML = '';
  cards.forEach(card => container.appendChild(card));
}
