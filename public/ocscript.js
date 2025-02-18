// Variabel global untuk melacak kartu yang sedang dalam mode edit
let currentEditingCard = null;

document.addEventListener('DOMContentLoaded', function() {
  fetchAndRenderCards();
});

function fetchAndRenderCards() {
  fetch('/api/filters_sysoc')
    .then(response => response.json())
    .then(data => {
      const cabangArray = data.cabang; // Array nama cabang
      cabangArray.forEach((cabang, index) => {
        // Ambil data dari endpoint overhead dan customers
        Promise.all([
          fetch(`/api/overhead_by_cabang?cabang=${encodeURIComponent(cabang)}`)
            .then(res => res.json()),
          fetch(`/api/customers_by_cabang?cabang=${encodeURIComponent(cabang)}`)
            .then(res => res.json())
        ])
        .then(([overheadData, customerData]) => {
          // Filter data untuk menghilangkan duplikat
          const uniqueOverheadData = overheadData.filter((item, idx, self) => {
            return idx === self.findIndex(t => t.Standar === item.Standar && t.Keterangan === item.Keterangan);
          });
          const uniqueCustomerData = customerData.filter((item, idx, self) => {
            return idx === self.findIndex(t => t.Standar === item.Standar && t.Keterangan === item.Keterangan);
          });

          // Kumpulkan nilai Standar dari data unik (konversi string percentage ke angka)
          const percentages = [];
          uniqueOverheadData.forEach(item => {
            if(item.Standar) {
              const parsedValue = parseFloat(item.Standar.replace('%','').replace(',', '.').trim());
              if (!isNaN(parsedValue)) {
                percentages.push(parsedValue);
              }
            }
          });
          uniqueCustomerData.forEach(item => {
            if(item.Standar) {
              const parsedValue = parseFloat(item.Standar.replace('%','').replace(',', '.').trim());
              if (!isNaN(parsedValue)) {
                percentages.push(parsedValue);
              }
            }
          });

          let highest = '-';
          let lowest = '-';
          let total = '-';
          let totalNumeric = 0;
          if (percentages.length > 0) {
            highest = Math.max(...percentages);
            lowest = Math.min(...percentages);
            totalNumeric = percentages.reduce((sum, val) => sum + val, 0);
            highest = highest + '%';
            lowest = lowest + '%';
            total = totalNumeric.toFixed(2).replace('.', ',') + '%';
          }

          // Buat tabel untuk data Overhead dengan class khusus agar bisa dibedakan
          let overheadTable = '<table class="overhead-table" onclick="event.stopPropagation()" border="1" cellpadding="5" cellspacing="0"><tr><th>Beban</th><th>Percentage</th></tr>';
          uniqueOverheadData.forEach(item => {
            overheadTable += `<tr><td>${item.Keterangan || ''}</td><td class="percentage-cell">${item.Standar || ''}</td></tr>`;
          });
          overheadTable += '</table>';

          // Buat tabel untuk data Customers
          let customerTable = '<table class="customers-table" onclick="event.stopPropagation()" border="1" cellpadding="5" cellspacing="0"><tr><th>Beban</th><th>Percentage</th></tr>';
          uniqueCustomerData.forEach(item => {
            customerTable += `<tr><td>${item.Keterangan || ''}</td><td class="percentage-cell">${item.Standar || ''}</td></tr>`;
          });
          customerTable += '</table>';

          // Buat card dengan atribut data-total dan data-cabang (untuk referensi update)
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
                <!-- Tombol Action: Edit & Save, tersembunyi secara default -->
                <div class="action-buttons" style="display: none;">
                  <button class="edit-btn" onclick="editCard(event, '${cardId}')">Edit</button>
                  <button class="save-btn" onclick="saveCard(event, '${cardId}')" style="display:none;">Save</button>
                </div>
                <span class="toggle" id="toggle-${cardId}">&#8250;</span>
              </div>
              <div class="details" id="details-${cardId}" style="display: none;">
                <div class="detail-section">
                  <h4>Overhead Data</h4>
                  <div class="table-card">
                    ${overheadTable}
                  </div>
                </div>
                <div class="detail-section">
                  <h4>Customer Data</h4>
                  <div class="table-card">
                    ${customerTable}
                  </div>
                </div>
              </div>
            </div>
          `;
          document.getElementById('card-container').innerHTML += cardHTML;
        })
        .catch(err => console.error("Error fetching data untuk cabang", cabang, err));
      });
    })
    .catch(err => console.error("Error fetching filters sysoc:", err));
}

function toggleDetails(id) {
  const card = document.getElementById(id);
  // Jika card sedang dalam mode edit, jangan lakukan toggle
  if (card.classList.contains('editing')) {
    return;
  }
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
    if (actionButtons) {
      actionButtons.style.display = 'none';
    }
  } else {
    detailsEl.style.display = 'block';
    toggleIcon.innerHTML = "&#8249;";
    if (actionButtons && !card.classList.contains('editing')) {
      actionButtons.style.display = 'flex';
    }
  }
}

// Fungsi untuk memformat nilai percentage (memaksa penggunaan koma dan penambahan "%" di akhir)
function formatPercentage(value) {
  let original = value.trim();
  original = original.replace('.', ',');
  if (!original.endsWith('%')) {
    original += '%';
  }
  original = original.replace(/\s+/g, '');
  let numberPart = original.slice(0, -1).replace(',', '.');
  let num = parseFloat(numberPart);
  if (isNaN(num)) {
    return '0,00%';
  }
  return num.toFixed(2).replace('.', ',') + '%';
}

// Fungsi untuk mengaktifkan mode edit pada kartu
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

  // Jadikan semua sel percentage dalam card dapat diedit
  const percentageCells = card.querySelectorAll('.percentage-cell');
  percentageCells.forEach(cell => {
    cell.setAttribute('contenteditable', 'true');
    cell.style.border = '1px dashed #ccc';
    cell.style.backgroundColor = '#fff';
  });
}

// Fungsi untuk menyimpan perubahan dan mengupdate database
function saveCard(event, cardId) {
  event.stopPropagation();
  const card = document.getElementById(cardId);
  const cabang = card.getAttribute('data-cabang');

  // Format nilai percentage di dalam sel dan kumpulkan nilai untuk update header
  const percentageCells = card.querySelectorAll('.percentage-cell');
  let allValues = [];
  percentageCells.forEach(cell => {
    let formatted = formatPercentage(cell.innerText);
    cell.innerText = formatted;
    cell.removeAttribute('contenteditable');
    cell.style.border = 'none';
    cell.style.backgroundColor = 'transparent';
    let numeric = parseFloat(formatted.replace('%','').replace(',', '.'));
    if (!isNaN(numeric)) {
      allValues.push(numeric);
    }
  });

  // Update header Highest dan Lowest berdasarkan nilai baru
  if (allValues.length > 0) {
    const newHighest = Math.max(...allValues);
    const newLowest = Math.min(...allValues);
    // Mengasumsikan id header menggunakan index yang sama seperti card (gunakan substring dari cardId)
    const index = cardId.split('-')[1];
    const highestElem = document.getElementById(`highest-${index}`);
    const lowestElem = document.getElementById(`lowest-${index}`);
    highestElem.innerText = `Highest: ${newHighest}%`;
    lowestElem.innerText = `Lowest: ${newLowest}%`;
  }

  // Kumpulkan data update untuk tabel overhead
  let overheadData = [];
  const overheadRows = card.querySelectorAll('.overhead-table tr');
  overheadRows.forEach((row, idx) => {
    if (idx > 0) { // skip header
      const cells = row.querySelectorAll('td');
      const keterangan = cells[0].innerText.trim();
      const standar = cells[1].innerText.trim();
      overheadData.push({ Keterangan: keterangan, Standar: standar });
    }
  });

  // Kumpulkan data update untuk tabel customers
  let customersData = [];
  const customersRows = card.querySelectorAll('.customers-table tr');
  customersRows.forEach((row, idx) => {
    if (idx > 0) {
      const cells = row.querySelectorAll('td');
      const keterangan = cells[0].innerText.trim();
      const standar = cells[1].innerText.trim();
      customersData.push({ Keterangan: keterangan, Standar: standar });
    }
  });

  // Kirim update ke endpoint server (PUT) untuk tabel overhead
  let overheadPromise = Promise.resolve();
  if (overheadData.length > 0) {
    overheadPromise = fetch('/api/overhead_by_cabang', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cabang: cabang,
        data: overheadData
      })
    });
  }

  // Kirim update untuk tabel customers
  let customersPromise = Promise.resolve();
  if (customersData.length > 0) {
    customersPromise = fetch('/api/customers_by_cabang', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cabang: cabang,
        data: customersData
      })
    });
  }

  // Setelah kedua update selesai, keluarkan mode edit dan perbarui Total
  Promise.all([overheadPromise, customersPromise]).then(responses => {
    card.classList.remove('editing');
    const editBtn = card.querySelector('.edit-btn');
    const saveBtn = card.querySelector('.save-btn');
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    currentEditingCard = null;
    
    // Perbarui atribut data-total dan header Total
    let totalNumeric = allValues.reduce((sum, val) => sum + val, 0);
    card.setAttribute('data-total', totalNumeric);
    const index = cardId.split('-')[1];
    const totalElem = document.getElementById(`total-${index}`);
    totalElem.innerText = `Total: ${totalNumeric.toFixed(2).replace('.', ',')}%`;
  }).catch(err => {
    console.error(err);
    alert("Terjadi kesalahan saat menyimpan data.");
  });
}

// Fungsi untuk sorting card berdasarkan nilai Total
function sortCards(order) {
  if (currentEditingCard) {
    alert("Selesaikan pengeditan pada kartu yang sedang aktif sebelum melakukan sorting.");
    return;
  }
  const container = document.getElementById('card-container');
  const cards = Array.from(container.getElementsByClassName('card'));
  cards.sort((a, b) => {
    const totalA = parseFloat(a.getAttribute('data-total'));
    const totalB = parseFloat(b.getAttribute('data-total'));
    return order === 'asc' ? totalA - totalB : totalB - totalA;
  });
  container.innerHTML = '';
  cards.forEach(card => container.appendChild(card));
}
