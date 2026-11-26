
let SENSORS = [
  { name: 'сайт', base: 2.5, amplitude: 1, noise: 0.2 },
  { name: 'instagram', base: 2, amplitude: 0.8, noise: 0.2 },
];

let PERIOD = 60;           
let ANOMALY_CHANCE = 0.03; 
let ANOMALY_SIZE = 4;     

function makeRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function generateValue(sensor, step, random) {
  let wave = sensor.amplitude * Math.sin(step / PERIOD * 2 * Math.PI);
  let noise = (random() - 0.5) * 2 * sensor.noise;
  let value = sensor.base + wave + noise;
  if (random() < ANOMALY_CHANCE) {
    value = value + ANOMALY_SIZE;
  }
  return Math.round(value * 10) / 10;
}

module.exports = { SENSORS, PERIOD, ANOMALY_CHANCE, ANOMALY_SIZE, makeRandom, generateValue };