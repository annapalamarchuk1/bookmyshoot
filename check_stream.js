let os = require('os');
let path = require('path');
let fs = require('fs');

let config = require('./config');
config.DATA_FILE = path.join(os.tmpdir(), 'check_stream_data.json');
fs.rmSync(config.DATA_FILE, { force: true });
config.INGEST_KEY = 'check-key';
config.INGEST_PORT = 0;
config.BROADCAST_PAUSE_MS = 1;

let storage = require('./storage');
let ingest = require('./ingest');
let outbox = require('./utils/outbox');

storage.loadData();
storage.addSubscriber('alert', 1);

let fakeBot = {
  telegram: {
    sendMessage: function () {
      return Promise.resolve();
    },
  },
};

let url = '';
let networkUp = false;     
let loseResponses = 0;    

async function send(reading) {
  if (!networkUp) {
    throw new TypeError('fetch failed');
  }
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'check-key' },
    body: JSON.stringify(reading),
  });
  if (loseResponses > 0) {
    loseResponses = loseResponses - 1;
    throw new Error('timeout');
  }
  if (!response.ok) {
    let error = new Error('Бот відповів помилкою ' + response.status);
    error.status = response.status;
    throw error;
  }
}

function reading(source, duration, secondsAgo) {
  return { source: source, duration: duration, time: new Date(Date.now() - secondsAgo * 1000).toISOString() };
}

// Значення у базі за часом вимірювання (від найстарішого)
function valuesInDatabase() {
  return storage.listBookings().slice().reverse().map(function (record) {
    return record.duration;
  });
}

async function main() {
  let server = ingest.start(fakeBot);
  await new Promise(function (resolve) {
    server.on('listening', resolve);
  });
  url = 'http://127.0.0.1:' + server.address().port + '/readings';

  let queue = [];
  outbox.addToQueue(queue, reading('сайт', 2, 50), 10);
  outbox.addToQueue(queue, reading('instagram', 1.5, 49), 10);
  outbox.addToQueue(queue, reading('сайт', 2.5, 40), 10);
  outbox.addToQueue(queue, reading('instagram', 3, 39), 10);

  console.log('1) мережі немає:        ', await outbox.flushQueue(queue, send));

  networkUp = true;
  console.log('2) мережа з\'явилась:    ', await outbox.flushQueue(queue, send));
  console.log('   у базі:', valuesInDatabase());

  outbox.addToQueue(queue, reading('сайт', 3.5, 30), 10);
  loseResponses = 1;
  console.log('3) відповідь загубилась:', await outbox.flushQueue(queue, send));
  console.log('   повторна відправка:  ', await outbox.flushQueue(queue, send));
  console.log('   у базі (без дубліката):', valuesInDatabase());

  outbox.addToQueue(queue, reading('сайт', 1.2, 45), 10);
  console.log('4) запізніле показання: ', await outbox.flushQueue(queue, send));
  console.log('   у базі за часом:', valuesInDatabase());

  outbox.addToQueue(queue, { source: '', duration: 1, time: new Date().toISOString() }, 10);
  outbox.addToQueue(queue, reading('instagram', 2.8, 5), 10);
  console.log('5) некоректне в черзі:  ', await outbox.flushQueue(queue, send));

  let small = [];
  let lost = 0;
  for (let i = 1; i <= 5; i++) {
    lost = lost + outbox.addToQueue(small, reading('сайт', i, 0), 3);
  }
  console.log('6) черга на 3 місця, додали 5: втрачено', lost, '| у черзі лишились значення', small.map(function (r) {
    return r.duration;
  }));

  server.close();
  fs.rmSync(config.DATA_FILE, { force: true });
}
main();