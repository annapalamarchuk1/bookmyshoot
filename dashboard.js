let config = require('./config');
let storage = require('./storage');
let chart = require('./utils/chart');
let format = require('./utils/format');

let PERIOD_HOURS = 6;                 
let STALE_MS = 10 * 60 * 1000;           
let TABLE_ROWS = 10;                    

function escapeHtml(text) {
  let result = String(text);
  result = result.split('&').join('&amp;');  
  result = result.split('<').join('&lt;');
  result = result.split('>').join('&gt;');
  result = result.split('"').join('&quot;');
  result = result.split("'").join('&#39;');
  return result;
}
function toReading(record) {
  if (record.telegramId !== 0) {
    return null;
  }
  let value = Number(record.duration);
  if (Number.isNaN(value)) {
    return null;
  }
  return {
    sensor: String(record.type),
    value: value,
    createdAt: record.createdAt,
    time: new Date(record.createdAt).getTime(),
  };
}
function readingsLastHours(hours) {
  let records = storage.listBookingsLastHours(hours);
  let result = [];
  for (let record of records) {
    let reading = toReading(record);
    if (reading !== null) {
      result.push(reading);
    }
  }
  result.sort((a, b) => b.time - a.time);
  return result;
}
function latestReadings() {
  let latest = storage.latestBySensor();
  let result = Object.create(null);
  for (let name of Object.keys(latest)) {
    let reading = toReading(latest[name]);
    if (reading !== null) {
      result[name] = reading;
    }
  }
  return result;
}
function groupBySensor(readings) {
  let groups = Object.create(null);
  for (let reading of readings) {
    if (groups[reading.sensor] === undefined) {
      groups[reading.sensor] = [];
    }
    groups[reading.sensor].push(reading);
  }
  return groups;
}
function calcSummary(readings) {
  if (readings.length === 0) {
    return null;
  }
  let min = readings[0].value;
  let max = readings[0].value;
  let sum = 0;
  for (let reading of readings) {
    if (reading.value < min) {
      min = reading.value;
    }
    if (reading.value > max) {
      max = reading.value;
    }
    sum = sum + reading.value;
  }
  return { count: readings.length, min: min, avg: sum / readings.length, max: max };
}
function statusOf(value) {
  if (value < config.ALERT_MIN) {
    return { css: 'low', text: 'нижче норми' };
  }
  if (value > config.ALERT_MAX) {
    return { css: 'high', text: 'вище норми' };
  }
  return { css: 'ok', text: 'у нормі' };
}
function timeText(ms) {
  return new Date(ms).toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kiev', hour12: false });
}

function buildCard(reading, nowMs) {
  let age = nowMs - reading.time;
  let status = statusOf(reading.value);
  let css = status.css;
  let note = status.text;

  if (age > STALE_MS) {
    css = 'stale';
    note = 'немає свіжих даних';
  }

  return '<div class="card ' + css + '">'
    + '<div class="name">' + escapeHtml(reading.sensor) + '</div>'+ '<div class="name">' + reading.sensor + '</div>'
    + '<div class="note">' + note + ' · ' + escapeHtml(format.formatAgo(reading.createdAt)) + '</div>'
    + '</div>';
}

function buildPage(token, nowMs) {
  let latest = latestReadings();
  let names = Object.keys(latest);
  names.sort();

  let html = '<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<meta http-equiv="refresh" content="' + config.DASHBOARD_REFRESH_S + '">'   // браузер сам перезавантажує сторінку
    + '<title>Дашборд</title>'
    + '<style>'
    + 'body{font-family:Segoe UI,Arial,sans-serif;background:#f4f6f8;color:#13293d;margin:0;padding:16px 20px;}'
    + 'h1{font-size:24px;margin:0 0 4px;}'
    + 'h2{font-size:18px;margin:24px 0 8px;}'
    + '.small{color:#5b6b7a;font-size:13px;}'
    + '.cards{display:flex;flex-wrap:wrap;gap:12px;}'
    + '.card{background:#fff;border-radius:10px;padding:12px 16px;min-width:170px;border-left:6px solid #2ea05a;box-shadow:0 1px 3px rgba(0,0,0,.12);}'
    + '.card.low{border-left-color:#1c7293;}'
    + '.card.high{border-left-color:#c83c3c;}'
    + '.card.stale{border-left-color:#999;opacity:.65;}'
    + '.card .name{font-weight:600;}'
    + '.card .value{font-size:32px;font-weight:700;margin:4px 0;}'
    + '.card .note{font-size:13px;color:#5b6b7a;}'
    + 'table{border-collapse:collapse;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12);}'
    + 'th,td{padding:6px 14px;border-bottom:1px solid #e3e8ed;text-align:left;}'
    + 'th{background:#e8eef3;}'
    + 'img{max-width:100%;height:auto;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.12);margin-bottom:8px;}'
    + 'code{background:#e8eef3;padding:2px 5px;border-radius:4px;}'
    + '</style></head><body>';

  html = html + '<h1>Дашборд датчиків</h1>';
  html = html + '<div class="small">Оновлено о ' + timeText(nowMs) + ' · сторінка оновлюється кожні '
      + config.DASHBOARD_REFRESH_S + ' с · норма: від ' + config.ALERT_MIN + ' до ' + config.ALERT_MAX
      + '</div>';

  if (names.length === 0) {
    html = html
        + '<p>Показань ще немає. Запустіть симулятор: <code>node simulator.js 2</code></p></body></html>';
    return html;
  }

  html = html + '<h2>Зараз</h2><div class="cards">';
  for (let name of names) {
    html = html + buildCard(latest[name], nowMs);
  }
  html = html + '</div>';

  // 2. Зведення за період
  let recent = readingsLastHours(PERIOD_HOURS);
  let groups = groupBySensor(recent);
  html = html + '<h2>Зведення за ' + PERIOD_HOURS
      + ' год</h2><table><tr><th>Датчик</th><th>Показань</th><th>Мін</th><th>Середнє</th><th>Макс</th></tr>';
  for (let name of names) {
    let summary = calcSummary(groups[name] || []);
    if (summary === null) {
      html = html + '<tr><td>' + escapeHtml(name) + '</td><td colspan="4">немає даних</td></tr>';
    } else {
      html = html + '<tr><td>' + escapeHtml(name) + '</td><td>' + summary.count + '</td><td>'
          + summary.min.toFixed(1)
          + '</td><td>' + summary.avg.toFixed(1) + '</td><td>' + summary.max.toFixed(1) + '</td></tr>';
    }
  }
  html = html + '</table>';

  // 3. Графіки: браузер сам запитає кожну картинку окремим запитом /chart.png
  html = html + '<h2>Графіки за ' + PERIOD_HOURS + ' год</h2>';
  for (let name of names) {
    let src = '/chart.png?token=' + encodeURIComponent(token) + '&sensor=' + encodeURIComponent(name)
        + '&hours=' + PERIOD_HOURS;
    html = html + '<div><b>' + escapeHtml(name) + '</b><br><img src="' + escapeHtml(src)
        + '" alt="графік ' + escapeHtml(name) + '"></div>';
  }

  html = html + '<h2>Останні показання</h2><table><tr><th>Час</th><th>Датчик</th><th>Значення</th></tr>';
  for (let i = 0; i < recent.length && i < TABLE_ROWS; i++) {   // recent: нові зверху
    html = html + '<tr><td>' + timeText(recent[i].time) + '</td><td>'
        + escapeHtml(recent[i].sensor)
        + '</td><td>' + recent[i].value.toFixed(1) + '</td></tr>';
  }
  html = html + '</table></body></html>';
  return html;
}

function sendText(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',           
    'Referrer-Policy': 'no-referrer',      
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}
function handle(req, res) {
  let pathname = req.url.split('?')[0];
  if (pathname !== '/dashboard' && pathname !== '/chart.png') {
    return false;
  }
  if (!config.DASHBOARD_TOKEN) {
    return false;                         
  }
  if (req.method !== 'GET') {
    sendText(res, 405, 'text/plain; charset=utf-8', 'Використовуйте GET');
    return true;
  }

  let query;
  try {
    query = new URL(req.url, 'http://localhost').searchParams;
  } catch (error) {
    sendText(res, 400, 'text/plain; charset=utf-8', 'Некоректна адреса');
    return true;
  }
  let token = query.get('token');
  if (token !== config.DASHBOARD_TOKEN) {
    sendText(res, 401, 'text/plain; charset=utf-8', 'Потрібен правильний токен: /dashboard?token=...');
    return true;
  }
  if (pathname === '/dashboard') {
    sendText(res, 200, 'text/html; charset=utf-8', buildPage(token, Date.now()));
    return true;
  }

  // /chart.png?sensor=...&hours=...
  let sensor = query.get('sensor');
  let hours = Number(query.get('hours') || PERIOD_HOURS);
  if (!sensor || !(hours >= 1 && hours <= 72)) {   // така перевірка відсіює й NaN
    sendText(res, 400, 'text/plain; charset=utf-8', 'Потрібні sensor і hours (від 1 до 72)');
    return true;
  }
  let records = readingsLastHours(hours);   // нові зверху
  let points = [];
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].sensor === sensor) {
      points.push({ time: records[i].time, value: records[i].value });
    }
  }
  if (points.length < 2) {
    sendText(res, 404, 'text/plain; charset=utf-8', 'Для графіка потрібно щонайменше 2 показання');
    return true;
  }

  let image = chart.chartToPng(chart.downsample(points, 300), { min: config.ALERT_MIN, max: config.ALERT_MAX });
  sendText(res, 200, 'image/png', image);
  return true;
}

module.exports = { handle, buildPage, escapeHtml, statusOf };