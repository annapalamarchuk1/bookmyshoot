let os = require('os');
let path = require('path');
let fs = require('fs');

let config = require('./config');
config.DATA_FILE = path.join(os.tmpdir(), 'check_simulator_data.json');
fs.rmSync(config.DATA_FILE, { force: true });
config.INGEST_KEY = 'check-key';
config.INGEST_PORT = 0;
config.BROADCAST_PAUSE_MS = 1;

let storage = require('./storage');
let ingest = require('./ingest');
let signal = require('./utils/signal');

storage.loadData();
storage.addSubscriber('alert', 1);

let alertsSent = [];
let fakeBot = {
  telegram: {
    sendMessage: function (userId, text) {
      alertsSent.push(text.split('\n')[0]);
      return Promise.resolve();
    },
  },
};

let counter = 0;
function nextTime() {
  counter = counter + 1;
  return new Date(Date.now() - 60 * 1000 + counter * 1000).toISOString();
}

async function post(url, key, body) {
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: body,
  });
  return response.status;
}

async function main() {
  let server = ingest.start(fakeBot);
  await new Promise(function (resolve) {
    server.on('listening', resolve);
  });
  let url = 'http://127.0.0.1:' + server.address().port + '/readings';

  console.log('1) правильний запит:   ', await post(url, 'check-key', '{"source":"сайт","duration":2.4,"time":"' + nextTime() + '"}'));
  console.log('2) неправильний ключ:  ', await post(url, 'wrong', '{"source":"сайт","duration":2.4,"time":"' + nextTime() + '"}'));
  console.log('3) зламаний JSON:      ', await post(url, 'check-key', '{source:'));
  console.log('4) значення — текст:   ', await post(url, 'check-key', '{"source":"сайт","duration":"2.4","time":"' + nextTime() + '"}'));

  let random = signal.makeRandom(177);
  for (let step = 0; step < 6; step++) {
    for (let sensor of signal.SENSORS) {
      let value = signal.generateValue(sensor, step, random);
      await post(url, 'check-key', JSON.stringify({ source: sensor.name, duration: value, time: nextTime() }));
    }
  }
  await new Promise(function (resolve) {
    setTimeout(resolve, 50);   // даємо розсилці час дійти до «бота»
  });

  let latest = storage.latestBySensor();
  let names = Object.keys(latest);
  console.log('Джерел із показаннями:', names.length, '| останній номер запису:', storage.listBookings()[0].id);
  console.log('Сповіщення про аномалії:', alertsSent);

  server.close();
  fs.rmSync(config.DATA_FILE, { force: true });
}
main();