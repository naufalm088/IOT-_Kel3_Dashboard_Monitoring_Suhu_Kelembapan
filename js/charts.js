// Menyimpan instance chart per ruangan, key = nama ruangan
const roomCharts = {}; // { ruang_tamu: { temp: Chart, humid: Chart } }
const roomActiveMetric = {}; // { ruang_tamu: 'temp' | 'humid' }

function buildRoomMonitorCards() {
  const grid = document.getElementById('roomMonitorGrid');
  grid.innerHTML = '';

  Object.keys(ROOM_LABELS).forEach(room => {
    roomActiveMetric[room] = 'temp';

    const card = document.createElement('div');
    card.className = 'room-monitor-card';
    card.innerHTML = `
      <div class="rmc-header">
        <div class="rmc-name">${ROOM_LABELS[room]}</div>
        <div class="rmc-dot" style="background:${ROOM_COLORS[room]}"></div>
      </div>
      <div class="rmc-current">
        <div class="rmc-stat">Suhu <b id="rmc-temp-${room}">--°C</b></div>
        <div class="rmc-stat">Lembab <b id="rmc-humid-${room}">--%</b></div>
      </div>
      <div class="rmc-chart-wrap"><canvas id="rmc-chart-${room}"></canvas></div>
      <div class="rmc-tabs">
        <div class="rmc-tab active" data-room="${room}" data-metric="temp">Suhu</div>
        <div class="rmc-tab" data-room="${room}" data-metric="humid">Kelembaban</div>
      </div>
      <button class="rmc-export-btn" data-export-room="${room}" disabled>Export CSV — ${ROOM_LABELS[room]}</button>
    `;
    grid.appendChild(card);

    const ctx = document.getElementById(`rmc-chart-${room}`).getContext('2d');
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#546268', font: { family: 'IBM Plex Mono', size: 8 }, maxTicksLimit: 4 } },
        y: { grid: { color: '#1b2426' }, ticks: { color: '#546268', font: { family: 'IBM Plex Mono', size: 9 } } }
      }
    };

    const tempChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ data: [], borderColor: ROOM_COLORS[room], backgroundColor: ROOM_COLORS[room] + '22', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true }] },
      options: JSON.parse(JSON.stringify(commonOptions))
    });

    roomCharts[room] = { temp: tempChart, humidData: null, tempData: null, labels: null };
  });

  // event delegation untuk tab switch
  grid.addEventListener('click', (e) => {
    const tab = e.target.closest('.rmc-tab');
    if (tab) {
      const room = tab.dataset.room;
      const metric = tab.dataset.metric;
      roomActiveMetric[room] = metric;

      const card = tab.closest('.room-monitor-card');
      card.querySelectorAll('.rmc-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      renderRoomChart(room);
    }
  });
}

function renderRoomChart(room) {
  const store = roomCharts[room];
  if (!store || !store.labels) return;

  const metric = roomActiveMetric[room];
  const data = metric === 'temp' ? store.tempData : store.humidData;
  const color = metric === 'temp' ? '#f0a860' : '#4d9fe8';

  store.temp.data.labels = store.labels;
  store.temp.data.datasets[0].data = data;
  store.temp.data.datasets[0].borderColor = color;
  store.temp.data.datasets[0].backgroundColor = color + '22';
  store.temp.update('none');
}

function updateAllRoomCharts(historyArray) {
  if (!historyArray || historyArray.length === 0) return;

  const validEntries = historyArray.filter(e => e.rooms);
  if (validEntries.length === 0) return;

  const labels = validEntries.map(e => {
    const d = new Date(e.timestamp);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  });

  Object.keys(ROOM_LABELS).forEach(room => {
    const store = roomCharts[room];
    if (!store) return;

    store.labels = labels;
    store.tempData = validEntries.map(e => e.rooms[room] ? e.rooms[room].temperature : null);
    store.humidData = validEntries.map(e => e.rooms[room] ? e.rooms[room].humidity : null);

    renderRoomChart(room);

    const card = document.getElementById(`rmc-chart-${room}`)?.closest('.room-monitor-card');
    const last = validEntries[validEntries.length - 1];
    const lastRoom = last.rooms[room];
    const isOffline = !lastRoom || lastRoom.temperature == null;
    if (card) card.classList.toggle('offline', isOffline && room === 'ruang_tamu');
    if (lastRoom && !isOffline) {
      document.getElementById(`rmc-temp-${room}`).textContent = lastRoom.temperature.toFixed(1) + '°C';
      document.getElementById(`rmc-humid-${room}`).textContent = lastRoom.humidity.toFixed(1) + '%';
    } else if (isOffline) {
      document.getElementById(`rmc-temp-${room}`).textContent = '--°C';
      document.getElementById(`rmc-humid-${room}`).textContent = '--%';
    }
  });
}

function exportRoomCSV(room, historyArray) {
  const validEntries = historyArray.filter(e => e.rooms && e.rooms[room]);
  if (validEntries.length === 0) {
    alert(`Belum ada data histori untuk ${ROOM_LABELS[room]}.`);
    return;
  }
  const rows = [['Tanggal & Waktu', 'Suhu (°C)', 'Kelembaban (%)']];
  validEntries.forEach(entry => {
    rows.push([formatWaktu(entry.timestamp), entry.rooms[room].temperature.toFixed(1), entry.rooms[room].humidity.toFixed(1)]);
  });
  downloadCSV(`log_${room}.csv`, rows);
}

// watt chart (real-time, terpisah dari histori suhu/kelembaban)
let wattChartsInitialized = false;
