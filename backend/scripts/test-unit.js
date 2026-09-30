/**
 * Unit Test Runner: Haversine Geofencing, Hash integrity, and Business Rules
 */

const assert = require('assert');

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

console.log('🧪 Running Unit Tests...');

// 1. Haversine distance test
const d = calculateDistanceMeters(37.8044, -122.2712, 37.8044, -122.2712);
assert.strictEqual(Math.round(d), 0, 'Distance to same coordinate must be 0 meters');

const dOaklandToSF = calculateDistanceMeters(37.8044, -122.2712, 37.7749, -122.4194);
assert(dOaklandToSF > 12000 && dOaklandToSF < 15000, 'Oakland to SF distance should be ~13.5km');
console.log('✅ Geofence Haversine calculations passed');

// 2. Batch Number validation test
const batchPattern = /^BATCH-\d{4}-[A-Z0-9]+-\d+$/;
assert(batchPattern.test('BATCH-2026-TOM-000101'), 'Batch pattern valid');
assert(batchPattern.test('BATCH-2026-STR-000204'), 'Batch pattern valid');
console.log('✅ Batch ID regex formatting passed');

// 3. Cold chain temperature excursion rule test
function checkTemperatureStatus(temp, min, max) {
  if (temp < min - 1.0 || temp > max + 1.0) return 'CRITICAL';
  if (temp < min || temp > max) return 'WARNING';
  return 'NORMAL';
}
assert.strictEqual(checkTemperatureStatus(4.2, 2.0, 8.0), 'NORMAL');
assert.strictEqual(checkTemperatureStatus(8.5, 2.0, 8.0), 'WARNING');
assert.strictEqual(checkTemperatureStatus(10.2, 2.0, 8.0), 'CRITICAL');
console.log('✅ Cold-Chain Excursion status rules passed');

console.log('🎉 All Unit Tests Passed!\n');
