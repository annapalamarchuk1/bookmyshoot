let fs = require('fs');
let path = require('path');
let signal = require('./utils/signal');
let chart = require('./utils/chart');
let sensor = signal.SENSORS[0];
let random = signal.makeRandom(42);
let start = Date.parse('2026-11-05T08:00:00.000Z');
let points = [];
for (let step = 0; step < 72; step++) {
  points.push({ time: start + step * 5 * 60 * 1000, value: signal.generateValue(sensor, step, random) });
}
let image = chart.chartToPng(points, { min: 10, max: 30 });
let file = path.join(__dirname, 'chart_check.png');
fs.writeFileSync(file, image);
let signatureHex = [];
for (let i = 0; i < 8; i++) {
  signatureHex.push(image[i].toString(16).padStart(2, '0'));
}
console.log('Точок на графіку:', points.length);
console.log('Підпис PNG:', signatureHex.join(' '));
console.log('Розмір зображення:', image.readUInt32BE(16) + '×' + image.readUInt32BE(20), 'пікселів');
console.log('Файл записано:', file);
console.log('Міні-діаграма:', chart.sparkline(chart.downsample(points, 30).map(function (p) { return p.value; })));