let config = require('./config');
let signal = require('./utils/signal');
let outbox = require('./utils/outbox');

let MAX_QUEUE = 100;  

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function sendReading(reading) {
  let response = await fetch(config.INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.INGEST_KEY },
    body: JSON.stringify(reading),
    signal: AbortSignal.timeout(config.HTTP_TIMEOUT_MS),
  });
  if (!response.ok) {
    let error = new Error('Бот відповів помилкою ' + response.status);
    error.status = response.status; 
    throw error;
  }
  return await response.json();
}

async function main() {
  let seconds = Number(process.argv[2]) || 5;
  let ticks = Number(process.argv[3]) || 0;
  let seed = Number(process.argv[4]) || 0;

  let random = Math.random;
  if (seed !== 0) {
    random = signal.makeRandom(seed);
  }

  console.log('Симулятор запущено: інтервал ' + seconds + ' с. Зупинити — Ctrl+C.');
  let queue = [];
  let step = 0;
  while (ticks === 0 || step < ticks) {
    let values = [];
    let lost = 0;
    for (let sensor of signal.SENSORS) {
      let value = signal.generateValue(sensor, step, random);
      values.push(sensor.name + ' ' + value);
      let reading = { source: sensor.name, duration: value, time: new Date().toISOString() };
      lost = lost + outbox.addToQueue(queue, reading, MAX_QUEUE);
    }
    if (lost > 0) {
      console.error('Черга переповнена: втрачено найстаріших показань: ' + lost);
    }

    let result = await outbox.flushQueue(queue, sendReading);
    let text = '#' + step + ' ' + values.join(', ') + ' → надіслано ' + result.sent + ', у черзі ' + result.left;
    if (result.dropped > 0) {
      text = text + ', відхилено ' + result.dropped;
    }
    if (result.error !== null) {
      text = text + ' (' + result.error + ')';
    }
    console.log(text);

    step = step + 1;
    await sleep(seconds * 1000);
  }
  console.log('Симулятор завершив роботу. У черзі лишилось: ' + queue.length);
}

main();