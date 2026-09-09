let acState = { ruang_tamu: false, kamar_1: false, kamar_2: false, ruang_kerja: false, dapur: false };
let latestData = null;
let selectedRoom = null;
let historyData = [];
let latestWatt = { ruang_tamu: 0, kamar_1: 0, kamar_2: 0, ruang_kerja: 0, dapur: 0 };

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const lastUpdateEl = document.getElementById('lastUpdate');
const sensorAlert = document.getElementById('sensorAlert');

function isRoomOffline(roomData) {
  return !roomData || roomData.status === 'offline' || roomData.temperature == null;
}

function tempClass(t) {
  if (t == null) return 'offline';
  if (t >= 31) return 'hot';
  if (t >= 28) return 'warm';
  return 'cool';
}
function tempStatusNote(t) {
  if (t == null) return "Sensor offline";
  if (t < 22) return "Sedikit sejuk";
  if (t <= 28) return "Dalam rentang nyaman";
  if (t <= 32) return "Mulai hangat";
  return "Panas, pertimbangkan AC";
}
function humidStatusNote(h) {
  if (h == null) return "Sensor offline";
  if (h < 40) return "Udara cenderung kering";
  if (h <= 60) return "Kelembaban ideal";
  if (h <= 75) return "Sedikit lembab";
  return "Lembab tinggi";
}

function renderSensorAlert() {
  if (!sensorAlert || !latestData) return;
  const rt = latestData.rooms && latestData.rooms.ruang_tamu;
  const isOffline = isRoomOffline(rt);
  sensorAlert.classList.toggle('show', isOffline);
  if (isOffline && rt && rt.lastSeen) {
    const ls = new Date(rt.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    sensorAlert.textContent = `⚠ Ruang Tamu — Sensor DHT11 Offline · last seen ${ls} · cek kabel D4 / WiFi & MQTT (192.168.1.13:1883)`;
  } else if (isOffline) {
    sensorAlert.textContent = '⚠ Ruang Tamu — Sensor DHT11 Offline · cek kabel D4 / koneksi WiFi & MQTT (192.168.1.13:1883)';
  }
}

function renderSummary() {
  if (!latestData) return;
  const rooms = latestData.rooms;
  const onlineTemps = Object.keys(rooms).filter(r => !isRoomOffline(rooms[r])).map(r => rooms[r].temperature);
  const onlineHumids = Object.keys(rooms).filter(r => !isRoomOffline(rooms[r])).map(r => rooms[r].humidity);

  if (onlineTemps.length > 0) {
    const avgTemp = onlineTemps.reduce((a, b) => a + b, 0) / onlineTemps.length;
    const avgHumid = onlineHumids.reduce((a, b) => a + b, 0) / onlineHumids.length;
    document.getElementById('avgTemp').textContent = avgTemp.toFixed(1) + '°';
    document.getElementById('avgHumid').textContent = avgHumid.toFixed(1) + '%';
    const sub = document.querySelector('.summary-grid .summary-card:nth-child(1) .ssub');
    if (sub) sub.textContent = onlineTemps.length + '/5 ruangan online';
    document.querySelector('.summary-grid .summary-card:nth-child(2) .ssub').textContent = onlineTemps.length + '/5 ruangan online';
  } else {
    document.getElementById('avgTemp').textContent = '--°';
    document.getElementById('avgHumid').textContent = '--%';
  }

  const totalWatt = Object.values(latestWatt).reduce((a, b) => a + b, 0);
  document.getElementById('totalWatt').textContent = totalWatt.toLocaleString('id-ID') + ' W';

  const acOn = Object.keys(acState).filter(r => acState[r]).length;
  document.getElementById('acOnCount').textContent = acOn + '/5 AC aktif';

  let hottest = null, hottestTemp = -999;
  Object.keys(rooms).forEach(r => {
    if (isRoomOffline(rooms[r])) return;
    if (rooms[r].temperature > hottestTemp) { hottestTemp = rooms[r].temperature; hottest = r; }
  });
  document.getElementById('hottestRoom').textContent = hottest ? (ROOM_LABELS[hottest] || '—') : '—';
  document.getElementById('hottestTemp').textContent = hottest ? hottestTemp.toFixed(1) + '°C' : '—';

  const motion = latestData.pintu_masuk && latestData.pintu_masuk.motion_detected;
  document.getElementById('doorSummary').textContent = motion ? 'Terdeteksi' : 'Clear';
  document.getElementById('doorSummaryCard').classList.toggle('alert', !!motion);
}

function renderFloorplan() {
  if (!latestData) return;
  Object.keys(ROOM_LABELS).forEach(room => {
    const roomData = latestData.rooms[room];
    if (!roomData) return;
    const el = document.querySelector(`.room-tile[data-room="${room}"]`);
    if (!el) return;

    const offline = isRoomOffline(roomData);
    const tempEl = el.querySelector('.rtemp');
    if (offline) {
      tempEl.textContent = '--°';
      tempEl.className = 'rtemp offline';
      el.querySelector('.rwatt').textContent = 'Sensor Offline';
      el.classList.add('offline');
    } else {
      tempEl.textContent = roomData.temperature.toFixed(1) + '°';
      tempEl.className = 'rtemp ' + tempClass(roomData.temperature);
      el.querySelector('.rwatt').textContent = (latestWatt[room] || 0) + ' W';
      el.classList.remove('offline');
    }

    const chip = el.querySelector('.ac-chip');
    const isOn = acState[room];
    if (offline && room === 'ruang_tamu') {
      chip.textContent = 'OFFLINE';
      chip.className = 'ac-chip off';
    } else {
      chip.textContent = isOn ? 'AC ON' : 'AC OFF';
      chip.className = 'ac-chip ' + (isOn ? 'on' : 'off');
    }

    el.classList.toggle('active', room === selectedRoom);
  });

  const motion = latestData.pintu_masuk && latestData.pintu_masuk.motion_detected;
  document.getElementById('doorText').textContent = motion ? 'Gerakan terdeteksi' : 'Tidak ada gerakan';
  const badge = document.getElementById('doorBadge');
  badge.textContent = motion ? 'TERDETEKSI' : 'CLEAR';
  badge.className = 'door-badge ' + (motion ? 'detected' : 'clear');
}

function renderDetail() {
  const container = document.getElementById('detailContent');
  if (!selectedRoom || !latestData) {
    container.innerHTML = '<div class="detail-empty">Pilih ruangan di denah<br>untuk melihat detail</div>';
    return;
  }
  const roomData = latestData.rooms[selectedRoom];
  if (!roomData) return;
  const isOn = acState[selectedRoom];
  const watt = latestWatt[selectedRoom] || 0;
  const offline = isRoomOffline(roomData);

  if (offline && selectedRoom === 'ruang_tamu') {
    const lastSeenTxt = roomData.lastSeen ? formatWaktu(roomData.lastSeen) : '—';
    container.innerHTML = `
      <div class="detail-room-name">${ROOM_LABELS[selectedRoom]} <span class="offline-badge">OFFLINE</span></div>
      <div class="metric-row">
        <div class="metric-box temp offline">
          <div class="mlabel">Suhu</div>
          <div class="mval">—</div>
          <div class="mnote">Sensor DHT11 terputus</div>
        </div>
        <div class="metric-box humid offline">
          <div class="mlabel">Kelembaban</div>
          <div class="mval">—</div>
          <div class="mnote">Sensor DHT11 terputus</div>
        </div>
      </div>
      <div class="metric-box offline" style="margin-bottom:12px;">
        <div class="mlabel">Status Sensor</div>
        <div class="mval" style="font-size:15px; color:var(--danger);">Offline</div>
        <div class="mnote">Last seen: ${lastSeenTxt}<br>Cek kabel D4, power 3V3, WiFi Kos ijo & MQTT 192.168.1.13:1883</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="detail-room-name">${ROOM_LABELS[selectedRoom]}</div>
    <div class="metric-row">
      <div class="metric-box temp">
        <div class="mlabel">Suhu</div>
        <div class="mval">${roomData.temperature.toFixed(1)}°C</div>
        <div class="mnote">${tempStatusNote(roomData.temperature)}</div>
      </div>
      <div class="metric-box humid">
        <div class="mlabel">Kelembaban</div>
        <div class="mval">${roomData.humidity.toFixed(1)}%</div>
        <div class="mnote">${humidStatusNote(roomData.humidity)}</div>
      </div>
    </div>
    <div class="metric-row">
      <div class="metric-box watt">
        <div class="mlabel">Konsumsi Daya</div>
        <div class="mval">${watt} W</div>
        <div class="mnote">${isOn ? 'AC sedang aktif' : 'Mode standby'}</div>
      </div>
    </div>
    <div class="ac-panel">
      <div>
        <div class="actext">Air Conditioner</div>
        <div class="acstate ${isOn ? 'on' : 'off'}">${isOn ? 'Menyala' : 'Mati'}</div>
      </div>
      <button class="toggle-switch ${isOn ? 'on' : ''}" data-toggle-room="${selectedRoom}" aria-label="Toggle AC">
        <span class="knob"></span>
      </button>
    </div>
  `;
}

function selectRoom(room) {
  selectedRoom = room;
  renderFloorplan();
  renderDetail();
}

function toggleAC(room) {
  acState[room] = !acState[room];
  renderFloorplan();
  renderDetail();
  renderSummary();
}

document.getElementById('roomsGrid').addEventListener('click', (e) => {
  const tile = e.target.closest('.room-tile');
  if (tile) selectRoom(tile.dataset.room);
});
document.getElementById('detailContent').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-toggle-room]');
  if (btn) toggleAC(btn.dataset.toggleRoom);
});

async function fetchData() {
  try {
    const res = await fetch(CONFIG.API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.rooms) throw new Error('Struktur data tidak sesuai');

    latestData = data;
    latestWatt = calculateAllWatt(acState);

    renderFloorplan();
    renderDetail();
    renderSummary();
    renderSensorAlert();

    const t = data.timestamp ? new Date(data.timestamp) : new Date();
    const label = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    statusDot.classList.remove('off');
    statusText.textContent = 'Terhubung';
    lastUpdateEl.textContent = label;

  } catch (err) {
    statusDot.classList.add('off');
    statusText.textContent = 'Terputus';
    console.error(err);
  }
}

function downloadCSV(filename, rows) {
  const csvContent = rows.map(row =>
    row.map(cell => {
      const str = String(cell);
      return str.includes(',') ? `"${str}"` : str;
    }).join(',')
  ).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatWaktu(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// event delegation untuk tombol export per-ruangan (dibuat dinamis di charts.js)
document.getElementById('roomMonitorGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-export-room]');
  if (btn) exportRoomCSV(btn.dataset.exportRoom, historyData);
});

document.getElementById('exportDoorBtn').addEventListener('click', () => exportDoorDetailCSV(historyData));
document.getElementById('exportDoorHourlyBtn').addEventListener('click', () => exportDoorHourlyCSV(historyData));

async function fetchHistory() {
  try {
    const res = await fetch(CONFIG.HISTORY_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Format histori tidak sesuai');

    historyData = data;

    const motionCount = data.filter(e => e.motion_detected).length;
    const validRoomEntries = data.filter(e => e.rooms).length;

    document.querySelectorAll('[data-export-room]').forEach(btn => btn.disabled = validRoomEntries === 0);
    document.getElementById('exportDoorBtn').disabled = motionCount === 0;
    document.getElementById('exportDoorHourlyBtn').disabled = motionCount === 0;

    updateAllRoomCharts(data);
    updateDoorAnalytics(data);

  } catch (err) {
    console.error(err);
  }
}

buildRoomMonitorCards();
initDoorChart();
fetchData();
setInterval(fetchData, CONFIG.POLL_INTERVAL_MS);
fetchHistory();
setInterval(fetchHistory, CONFIG.HISTORY_POLL_MS);
