let http = require('http');
let config = require('./config');
let storage = require('./storage');
let alerts = require('./alerts');
let dashboard = require('./dashboard');

let MAX_BODY = 10 * 1024;  
let MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;  
let MAX_FUTURE_MS = 5 * 60 * 1000;         
let ALERT_RECENT_MS = 10 * 60 * 1000;    

function isValidTime(text) {
  if (typeof text !== 'string') {
    return false;
  }
  let moment = new Date(text);
  if (isNaN(moment.getTime()) || moment.toISOString() !== text) {
    return false;
  }
  let age = Date.now() - moment.getTime();
  return age <= MAX_AGE_MS && age >= -MAX_FUTURE_MS;
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let body = '';
    let tooLarge = false;
    req.on('data', function (chunk) {
      if (tooLarge) {
        return;   // завелике: решту ігноруємо, з'єднання не обриваємо
      }
      body = body + chunk;
      if (body.length > MAX_BODY) {
        tooLarge = true;
        reject(new Error('too large'));
      }
    });
    req.on('end', function () {
      resolve(body);
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, object) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(object));
}

async function handleRequest(bot, req, res) {
  if (dashboard.handle(req, res)) {
    return; 
  }
  if (req.url !== '/readings') {
    sendJson(res, 404, { ok: false, error: 'not found' });
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'use POST' });
    return;
  }
  if (req.headers['x-api-key'] !== config.INGEST_KEY) {
    sendJson(res, 401, { ok: false, error: 'wrong key' });
    return;
  }
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    res.setHeader('Connection', 'close');
    sendJson(res, 413, { ok: false, error: 'body too large' });
    return;
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'invalid json' });
    return;
  }

  // 5) перевірка вмісту: джерело, тривалість, час вимірювання
  if (data === null || typeof data !== 'object' || typeof data.source !== 'string' || data.source === '' || data.source.length > 30) {
    sendJson(res, 400, { ok: false, error: 'invalid source' });
    return;
  }
  if (typeof data.duration !== 'number' || !Number.isFinite(data.duration) || data.duration <= 0 || data.duration > config.MAX_HOURS) {
    sendJson(res, 400, { ok: false, error: 'invalid duration' });
    return;
  }
  if (!isValidTime(data.time)) {
    sendJson(res, 400, { ok: false, error: 'invalid time' });
    return;
  }

  let record;
  try {
    record = storage.addDeviceReading(data.source, data.duration, data.time);
  } catch (error) {
    console.error('ingest (збереження):', error.message);
    sendJson(res, 500, { ok: false, error: 'save failed' });
    return;
  }

  if (record === null) {
    sendJson(res, 200, { ok: true, duplicate: true });  
    return;
  }

  if (Date.now() - new Date(record.createdAt).getTime() < ALERT_RECENT_MS) {
    alerts.checkBooking(bot, record);
  }
  sendJson(res, 201, { ok: true, id: record.id });
}

function start(bot) {
  if (!config.INGEST_KEY) {
    console.log('INGEST_KEY не вказано в .env: приймання показань від датчиків вимкнено.');
    return null;
  }

  let server = http.createServer(function (req, res) {
    handleRequest(bot, req, res).catch(function (error) {
      console.error('ingest:', error.message);
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: 'server error' });
      }
    });
  });

  server.listen(config.INGEST_PORT, config.INGEST_HOST, function () {
    let base = 'http://' + config.INGEST_HOST + ':' + server.address().port;
    console.log('Приймання показань: ' + base + '/readings');
    if (config.DASHBOARD_TOKEN) {
      console.log('Дашборд: ' + base + '/dashboard?token=' + config.DASHBOARD_TOKEN);
    } else {
      console.log('DASHBOARD_TOKEN не вказано в .env: дашборд вимкнено.');
    }
  });
  return server;
}

module.exports = { start };