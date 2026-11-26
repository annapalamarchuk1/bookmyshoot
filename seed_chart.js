let storage = require('./storage');
let signal = require('./utils/signal');
storage.loadData();
let random = signal.makeRandom(42);
let now = Date.now();
for (let step = 0; step < 72; step++) {
  let time = new Date(now - (71 - step) * 5 * 60 * 1000).toISOString();
  for (let sensor of signal.SENSORS) {
    let value = signal.generateValue(sensor, step, random);
    storage.addDeviceReading(sensor.name, value, time);
  }
}
console.log('Додано показань: 144 (2 датчики × 72 кроки по 5 хвилин).');