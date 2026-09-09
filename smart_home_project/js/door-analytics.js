let doorHourlyChart;

function initDoorChart() {
  doorHourlyChart = new Chart(document.getElementById('doorHourlyChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00'),
      datasets: [{
        label: 'Jumlah deteksi',
        data: Array(24).fill(0),
        backgroundColor: '#f0a86088',
        borderColor: '#f0a860',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#546268', font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 12 }
        },
        y: {
          grid: { color: '#1b2426' },
          ticks: { color: '#546268', font: { family: 'IBM Plex Mono', size: 9 }, stepSize: 1 },
          beginAtZero: true
        }
      }
    }
  });
}

function computeHourlyBreakdown(historyArray) {
  const hourly = Array(24).fill(0);
  const detectedEntries = historyArray.filter(e => e.motion_detected);

  detectedEntries.forEach(entry => {
    const hour = new Date(entry.timestamp).getHours();
    hourly[hour]++;
  });

  return { hourly, detectedEntries };
}

function updateDoorAnalytics(historyArray) {
  if (!historyArray || historyArray.length === 0) return;

  const { hourly, detectedEntries } = computeHourlyBreakdown(historyArray);

  doorHourlyChart.data.datasets[0].data = hourly;
  doorHourlyChart.update('none');

  document.getElementById('doorTotalCount').textContent = detectedEntries.length;

  if (detectedEntries.length > 0) {
    const maxCount = Math.max(...hourly);
    const peakHour = hourly.indexOf(maxCount);
    document.getElementById('doorPeakHour').textContent = maxCount > 0
      ? `${String(peakHour).padStart(2, '0')}:00`
      : '—';

    const last = detectedEntries[detectedEntries.length - 1];
    const lastTime = new Date(last.timestamp);
    document.getElementById('doorLastSeen').textContent = lastTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } else {
    document.getElementById('doorPeakHour').textContent = '—';
    document.getElementById('doorLastSeen').textContent = '—';
  }
}

function exportDoorDetailCSV(historyArray) {
  const detected = historyArray.filter(e => e.motion_detected);
  if (detected.length === 0) {
    alert('Belum ada kejadian gerakan terdeteksi di histori saat ini.');
    return;
  }
  const rows = [['No', 'Tanggal', 'Jam', 'Hari']];
  detected.forEach((entry, idx) => {
    const d = new Date(entry.timestamp);
    rows.push([
      idx + 1,
      d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      d.toLocaleDateString('id-ID', { weekday: 'long' })
    ]);
  });
  downloadCSV('log_pintu_masuk_detail.csv', rows);
}

function exportDoorHourlyCSV(historyArray) {
  const { hourly, detectedEntries } = computeHourlyBreakdown(historyArray);
  if (detectedEntries.length === 0) {
    alert('Belum ada data untuk direkap.');
    return;
  }
  const rows = [['Jam', 'Jumlah Deteksi']];
  hourly.forEach((count, hour) => {
    rows.push([`${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`, count]);
  });
  downloadCSV('log_pintu_rekap_per_jam.csv', rows);
}
