// GANTI kode Function Node "Gabungkan & Batasi 200" dengan ini
// Sekarang menyimpan histori SEMUA ruangan, bukan cuma dapur

let fileContent = (typeof msg.payload === 'string') ? msg.payload : '';
let dataBaru = global.get('smartHomeData');

let history = [];
try {
    if (fileContent && fileContent.trim().length > 0) {
        history = JSON.parse(fileContent);
    }
} catch (e) {
    node.warn('File histori lama tidak valid, mulai dari kosong.');
    history = [];
}

if (!Array.isArray(history)) {
    history = [];
}

// simpan snapshot suhu & kelembaban SEMUA ruangan, plus status pintu
history.push({
    timestamp: dataBaru.timestamp,
    motion_detected: dataBaru.pintu_masuk.motion_detected,
    rooms: {
        ruang_tamu: {
            temperature: dataBaru.rooms.ruang_tamu.temperature,
            humidity: dataBaru.rooms.ruang_tamu.humidity
        },
        kamar_1: {
            temperature: dataBaru.rooms.kamar_1.temperature,
            humidity: dataBaru.rooms.kamar_1.humidity
        },
        kamar_2: {
            temperature: dataBaru.rooms.kamar_2.temperature,
            humidity: dataBaru.rooms.kamar_2.humidity
        },
        ruang_kerja: {
            temperature: dataBaru.rooms.ruang_kerja.temperature,
            humidity: dataBaru.rooms.ruang_kerja.humidity
        },
        dapur: {
            temperature: dataBaru.rooms.dapur.temperature,
            humidity: dataBaru.rooms.dapur.humidity
        }
    }
});

if (history.length > 200) {
    history = history.slice(history.length - 200);
}

msg.payload = JSON.stringify(history, null, 2);
return msg;
