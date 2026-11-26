// Перевірка дашборда без запуску сервера: викликаємо dashboard.handle з підробленими req/res.
// Потрібні дані: node seed_chart.js (хоча б по 2 показання датчика за 6 годин) і DASHBOARD_TOKEN у .env
let config = require('./config');
let storage = require('./storage');
let dashboard = require('./dashboard');

storage.loadData();
let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log('  OK   ' + label);
    passed = passed + 1;
  } else {
    console.log('  FAIL ' + label);
    failed = failed + 1;
  }
}

function call(method, url) {
  let out = { status: 0, headers: {}, body: '' };
  let res = {
    writeHead: function (status, headers) { out.status = status; out.headers = headers; },
    end: function (body) { out.body = body; },
  };
  let handled = dashboard.handle({ method: method, url: url }, res);
  return { handled: handled, out: out };
}

if (!config.DASHBOARD_TOKEN) {
  console.log('DASHBOARD_TOKEN не заданий у .env: спочатку виконайте крок 1.');
  process.exit(1);
}
let token = config.DASHBOARD_TOKEN;
let sensors = Object.keys(storage.latestBySensor());

console.log('Доступ:');
let r = call('GET', '/dashboard');
check('без токена → 401', r.out.status === 401);
r = call('GET', '/dashboard?token=wrong');
check('неправильний токен → 401', r.out.status === 401);
r = call('POST', '/dashboard?token=' + token);
check('POST → 405', r.out.status === 405);
r = call('GET', '/readings');
check('чужий маршрут дашборд не обробляє', r.handled === false);

console.log('Сторінка:');
r = call('GET', '/dashboard?token=' + token);
check('правильний токен → 200', r.out.status === 200);
check('тип вмісту text/html', String(r.out.headers['Content-Type']).indexOf('text/html') === 0);
check('Cache-Control: no-store', r.out.headers['Cache-Control'] === 'no-store');
check('Referrer-Policy: no-referrer', r.out.headers['Referrer-Policy'] === 'no-referrer');
check('є автооновлення (meta refresh)', r.out.body.indexOf('http-equiv="refresh"') !== -1);
check('є датчики (потрібен seed_chart.js)', sensors.length > 0);
check('є картки датчиків', r.out.body.indexOf('class="card') !== -1);
check('є зведення', r.out.body.indexOf('Зведення') !== -1);
check('є графіки', r.out.body.indexOf('<img') !== -1);

console.log('Екранування:');
check('escapeHtml("<b>x</b>")', dashboard.escapeHtml('<b>x</b>') === '&lt;b&gt;x&lt;/b&gt;');
check('escapeHtml(лапки і &)', dashboard.escapeHtml('a&"\'') === 'a&amp;&quot;&#39;');

console.log('Стан відносно норми:');
check('нижче норми', dashboard.statusOf(config.ALERT_MIN - 1).css === 'low');
check('у нормі', dashboard.statusOf((config.ALERT_MIN + config.ALERT_MAX) / 2).css === 'ok');
check('вище норми', dashboard.statusOf(config.ALERT_MAX + 1).css === 'high');

console.log('Графік:');
r = call('GET', '/chart.png?token=' + token);
check('без sensor → 400', r.out.status === 400);
if (sensors.length > 0) {
  let name = encodeURIComponent(sensors[0]);
  r = call('GET', '/chart.png?token=' + token + '&sensor=' + name + '&hours=6');
  check('є sensor → 200 image/png', r.out.status === 200 && r.out.headers['Content-Type'] === 'image/png');
  check('підпис PNG 89 50 4e 47', r.out.body[0] === 0x89 && r.out.body[1] === 0x50 && r.out.body[2] === 0x4e && r.out.body[3] === 0x47);
}
r = call('GET', '/chart.png?token=' + token + '&sensor=nema-takogo&hours=6');
check('невідомий датчик → 404', r.out.status === 404);
r = call('GET', '/chart.png?token=' + token + '&sensor=x&hours=abc');
check('hours=abc → 400', r.out.status === 400);
r = call('GET', '/chart.png?token=' + token + '&sensor=x&hours=999');
check('hours=999 → 400', r.out.status === 400);

console.log('Пройдено: ' + passed + ', помилок: ' + failed);