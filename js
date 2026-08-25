const API_URL = "http://localhost:1880/api/sensor";
const POLL_INTERVAL_MS = 5000;
const MAX_POINTS = 60; // 60 x 5s = 5 minutes of history

const tempValueEl = document.getElementById('tempValue');
const humidValueEl = document.getElementById('humidValue');
const tempBarEl = document.getElementById('tempBar');
const humidBarEl = document.getElementById('humidBar');
const tempNoteEl = document.getElementById('tempNote');
const humidNoteEl = document.getElementById('humidNote');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const lastUpdateEl = document.getElementById('lastUpdate');

const ctx = document.getElementById('trendChart').getContext('2d');
const trendChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Suhu (°C)',
        data: [],
        borderColor: '#c1502e',
        backgroundColor: 'rgba(193,80,46,0.08)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Kelembaban (%)',
        data: [],
        borderColor: '#2e6f8e',
        backgroundColor: 'rgba(46,111,142,0.08)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#dde3d4' }, ticks: { font: { family: 'IBM Plex Mono', size: 10 }, maxTicksLimit: 6 } },
      y: {
        position: 'left', min: 15, max: 40,
        grid: { color: '#dde3d4' },
        ticks: { font: { family: 'IBM Plex Mono', size: 10 } },
        title: { display: true, text: '°C', font: { family: 'IBM Plex Mono', size: 10 } }
      },
      y1: {
        position: 'right', min: 0, max: 100,
        grid: { display: false },
        ticks: { font: { family: 'IBM Plex Mono', size: 10 } },
        title: { display: true, text: '%', font: { family: 'IBM Plex Mono', size: 10 } }
      }
    }
  }
});

function tempStatusNote(t) {
  if (t < 22) return "Sedikit sejuk untuk ruangan kerja.";
  if (t <= 28) return "Dalam rentang nyaman.";
  if (t <= 32) return "Mulai hangat, pertimbangkan ventilasi.";
  return "Panas — periksa sirkulasi udara.";
}

function humidStatusNote(h) {
  if (h < 40) return "Udara cenderung kering.";
  if (h <= 60) return "Kelembaban ideal.";
  if (h <= 75) return "Sedikit lembab, masih wajar.";
  return "Lembab tinggi — risiko jamur/embun.";
}

async function fetchData() {
  try {
    // 1. Memanggil/menghubungi API
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    // 2. Mengubah respon API ke format JSON
    const data = await res.json();

    // 3. Mengolah data hasil API (suhu & kelembaban)
    if (data.temperature == null || data.humidity == null) {
      throw new Error('Data belum tersedia');
    }

    tempValueEl.textContent = data.temperature.toFixed(1);
    humidValueEl.textContent = data.humidity.toFixed(1);
    tempBarEl.style.width = Math.min(100, (data.temperature / 50) * 100) + '%';
    humidBarEl.style.width = Math.min(100, data.humidity) + '%';
    tempNoteEl.textContent = tempStatusNote(data.temperature);
    humidNoteEl.textContent = humidStatusNote(data.humidity);

    statusDot.classList.remove('off');
    statusText.textContent = 'Terhubung ke Node-RED';

    const t = data.timestamp ? new Date(data.timestamp) : new Date();
    const label = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdateEl.textContent = 'Terakhir update: ' + label;

    trendChart.data.labels.push(label);
    trendChart.data.datasets[0].data.push(data.temperature);
    trendChart.data.datasets[1].data.push(data.humidity);
    if (trendChart.data.labels.length > MAX_POINTS) {
      trendChart.data.labels.shift();
      trendChart.data.datasets[0].data.shift();
      trendChart.data.datasets[1].data.shift();
    }
    trendChart.update('none');

  } catch (err) {
    statusDot.classList.add('off');
    statusText.textContent = 'Terputus — cek Node-RED';
    console.error(err);
  }
}

fetchData(); // Eksekusi pertama kali saat halaman dimuat
setInterval(fetchData, POLL_INTERVAL_MS); // Mengulang panggilan setiap 5 detik
