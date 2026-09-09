// Simulasi konsumsi daya (watt) per ruangan.
// AC menyala -> watt naik ke rentang tinggi (simulasi kompresor AC aktif).
// AC mati -> watt tetap rendah (standby: lampu, colokan lain, dll).

const WATT_STANDBY_MIN = 15;
const WATT_STANDBY_MAX = 40;
const WATT_AC_ON_MIN = 650;
const WATT_AC_ON_MAX = 900;

function calculateRoomWatt(isACOn) {
  if (isACOn) {
    return Math.round(WATT_AC_ON_MIN + Math.random() * (WATT_AC_ON_MAX - WATT_AC_ON_MIN));
  }
  return Math.round(WATT_STANDBY_MIN + Math.random() * (WATT_STANDBY_MAX - WATT_STANDBY_MIN));
}

function calculateAllWatt(acState) {
  const result = {};
  Object.keys(acState).forEach(room => {
    result[room] = calculateRoomWatt(acState[room]);
  });
  return result;
}
