const { BUTTONS, mainMenu, typeMenu } = require('../keyboards');
const { userStates, comments } = require('../state');
const { MAX_PEOPLE, MAX_HOURS, MAX_COMMENT,REPORT_TIME, hideToken, IMPORT_FILE } = require('../config');
const { parseNumber, isNonEmpty, parseJson, parseId, parseDateTime, parseHours, parseCount, parseMinutes, isValidDayText } = require('../utils/validators');
const { getUser } = require('../storage');
const storage = require('../storage');
const format = require('../utils/format');
let chart = require('../utils/chart');
const csv = require('../utils/csv');
const config = require('../config');
const broadcaster = require('../broadcast');
const alerts = require('../alerts');
const weatherService = require('../weather');

const handleStart = (ctx) => {
  ctx.reply(
    'Привіт! Я бот для запису на фотозйомку. ' +
      'Обери дію в меню нижче або скористайся командою /help.',
    mainMenu
  );
};

const handleBook = (ctx) => {
  userStates.set(ctx.from.id, { step: 'type', data: {} });
  ctx.reply('📸 Крок 1/4. Оберіть тип зйомки:', typeMenu);
};

const handleStatus = (ctx) =>
  ctx.reply('📊 Тут буде поточний статус твоєї заявки на фотозйомку.', mainMenu);

const handleHelp = (ctx) =>
  ctx.reply(
    'Доступні команди:\n\n' +
      '/start -привітання та показ меню\n' +
      '/book -подати заявку на фотозйомку\n' +
      '/group -підказка щодо формату зйомки (/group 4 2)\n' +
      '/comment -коментар до заявки (/comment Потрібен білий фон)\n' +
      '/profile -як фотограф зв’яжеться з вами\n' +
      '/data -передати ім’я у форматі JSON (/data {"name":"Анна"})\n' +
      '/register -реєстрація (ім’я та роль)\n' +
      '/me -показати мої збережені дані\n' +
      '/add <дата> <час> <тип> <годин> -додати заявку (/add 2026-11-05 10:00 портрет 2)\n' +
      '/list -останні заявки\n' +
      '/get <номер> -показати заявку\n' +
      '/edit <номер> <годин> -змінити тривалість\n' +
      '/del <номер> -видалити заявку\n' +
      '/import -імпорт заявок з файлу import/bookings.csv\n' +
      '/time -поточний час (Київ і UTC)\n' +
      '/last <години> -заявки за останні години (/last 24)\n' +
      '/day <ДД.ММ.РРРР> -заявки за добу (/day 26.10.2026)\n' +
      '/today -заявки за сьогодні\n' +
      '/report <години> -зведення за тривалістю за період (/report 24)\n' +
      '/top <кількість> -найдовші заявки (/top 5)\n' +
      '/daily -увімкнути або вимкнути щоденний звіт\n' +
      '/remind <хвилини> <текст> -нагадування (/remind 30 Підготувати камеру)\n' +
      '/live -останні показання від джерел (симулятор)\n' +
      '/trend <години> <датчик> -текстова діаграма показань (/trend 6 теплиця-1)\n' +
      '/chart <години> <датчик> -графік показань картинкою (/chart 6 теплиця-1)\n' +
      '/reminders -мої нагадування\n' +
      '/subscribe <тема> -підписатися на тему (report, alert, news)\n' +
      '/unsubscribe <тема> -відписатися від теми\n' +
      '/subscriptions -мої підписки\n' +
      '/id -дізнатися свій Telegram ID\n' +
      '/broadcast <текст> -розсилка новин (лише адміністратор)\n' +
      '/weather <місто> -погода зараз (без міста: Київ)\n' +
      '/compare -погода надворі й остання заявка\n' +
      '/forecast <місто> -прогноз на три дні\n' +
      '/status -перевірити статус заявки\n' +
      '/help -список усіх команд\n' +
      '/cancel -скасувати поточний діалог\n\n' +
      'Також бот сам надсилає підтвердження заявки та нагадування за 24 години до зйомки.',
  );

const handleCancel = (ctx) => {
  comments.delete(ctx.from.id);
  if (userStates.delete(ctx.from.id)) {
    ctx.reply('Діалог скасовано.', mainMenu);
  } else {
    ctx.reply('Немає активного діалогу.', mainMenu);
  }
};

const handleGroup = (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const people = parseNumber(parts[1]);
  const hours = parseNumber(parts[2]);

  if (parts.length !== 3 || people === null || hours === null) {
    ctx.reply(
      'Потрібно два числа: кількість людей і тривалість у годинах.\n' +
        'Приклад: /group 4 2',
      mainMenu
    );
    return;
  }
  if (!Number.isInteger(people) || people < 1) {
    ctx.reply('Кількість людей — ціле число від 1. Приклад: /group 4 2', mainMenu);
    return;
  }
  if (hours <= 0) {
    ctx.reply('Тривалість має бути більшою за 0 годин. Приклад: /group 4 2', mainMenu);
    return;
  }

  if (people > MAX_PEOPLE || hours > MAX_HOURS) {
    ctx.reply(
      `🚫 Перевищено ліміт студії (до ${MAX_PEOPLE} людей, до ${MAX_HOURS} год). ` +
        'Напишіть адміністратору — підберемо індивідуальні умови.',
      mainMenu
    );
  } else if (people > 5 && hours > 4) {
    ctx.reply(
      '🔥 Складна зйомка: велика група і довга сесія. ' +
        'Потрібні 2 фотографи — запишіться через /book та вкажіть це в коментарі.',
      mainMenu
    );
  } else if (people === 1) {
    ctx.reply('👤 Індивідуальна зйомка: підійде тип «Портрет».', mainMenu);
  } else if (people <= 5) {
    ctx.reply('👨‍👩‍👧 Комфортна група: підійдуть «Сімейна» або «Love story».', mainMenu);
  } else {
    ctx.reply('👥 Велика група (6–10 осіб): потрібен асистент, тип «Подія».', mainMenu);
  }
};

const handleComment = (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const comment = parts.slice(1).join(' ').trim();
  if (!isNonEmpty(comment)) {
    ctx.reply('Напишіть коментар після команди. Приклад: /comment Потрібен білий фон', mainMenu);
    return;
  }
  if (comment.length > MAX_COMMENT) {
    ctx.reply(
      `Коментар задовгий: ${comment.length} символів, максимум ${MAX_COMMENT}. Скоротіть його.`,
      mainMenu
    );
    return;
  }
  comments.set(ctx.from.id, comment);
  ctx.reply(`📝 Коментар збережено: «${comment}»`, mainMenu);
};

const handleProfile = (ctx) => {
  let username = null;
  try {
    username = ctx.from.username.toLowerCase();
  } catch (error) {
    console.log('/profile: у користувача немає username:', error.message);
  }
  if (username) {
    ctx.reply(`👤 Фотограф зв’яжеться з вами в Telegram: @${username}`, mainMenu);
  } else {
    ctx.reply(
      'У вас не встановлено юзернейм у Telegram. Додайте його в налаштуваннях, ' +
        'щоб фотограф міг із вами зв’язатися.',
      mainMenu
    );
  }
};

const handleData = (ctx) => {
  const text = ctx.message.text.replace(/^\/data(@\w+)?\s*/, '');
  const data = parseJson(text);
  if (data === null || typeof data !== 'object') {
    ctx.reply('Не вдалося розпізнати JSON. Приклад: /data {"name":"Анна"}', mainMenu);
    return;
  }
  if (!isNonEmpty(data.name)) {
    ctx.reply('У JSON немає поля name з текстом. Приклад: /data {"name":"Анна"}', mainMenu);
    return;
  }
  ctx.reply(`👤 Ім’я клієнта: ${data.name.trim()}`, mainMenu);
};

const handleRegister = (ctx) => {
  userStates.set(ctx.from.id, { step: 'reg_name', data: {} });
  ctx.reply('Реєстрація. Крок 1/2. Як вас звати?');
};

const handleMe = (ctx) => {
  const user = getUser(ctx.from.id);
  if (user === null) {
    ctx.reply('Ти ще не зареєстрований. Напиши /register', mainMenu);
    return;
  }
  const since = new Date(user.createdAt)
    .toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
  ctx.reply(`Ти — ${user.name}, роль: ${user.role}\nЗареєстровано: ${since}`, mainMenu);
};

const handleAdd = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let startsAt = parseDateTime(parts[1], parts[2]);
  let type = parts[3];
  let duration = parseNumber(parts[4]);
  if (startsAt === null || !type || type.length > 30 ||
      duration === null || duration <= 0 || duration > MAX_HOURS) {
    ctx.reply('Формат: /add <дата> <час> <тип> <годин>, наприклад /add 2026-11-05 10:00 портрет 2');
    return;
  }
  try {
    let record = storage.addBooking(ctx.from.id, startsAt, type, duration);
    ctx.reply('Додано: ' + format.formatBooking(record));
    alerts.checkBooking(ctx, record);   // тривалість поза межами → сповіщення підписникам (у фоні)
  } catch (error) {
    console.error('add:', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
  }
};

const handleList = (ctx) => {
  let items = storage.listBookings();
  if (items.length === 0) {
    ctx.reply('Заявок ще немає. Додай першу: /add 2026-11-05 10:00 портрет 2');
    return;
  }
  let text = 'Останні заявки:';
  for (let record of items) {
    text = text + '\n' + format.formatBooking(record);
  }
  ctx.reply(text);
};

const handleGet = (ctx) => {
  let id = parseId(ctx.message.text.split(/\s+/)[1]);
  if (id === null) {
    ctx.reply('Формат: /get <номер>, наприклад /get 3');
    return;
  }
  let record = storage.getBooking(id);
  if (record === null) {
    ctx.reply(format.NOT_FOUND_TEXT);
    return;
  }
  ctx.reply(format.formatBooking(record));
};

const handleEdit = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let id = parseId(parts[1]);
  let duration = parseNumber(parts[2]);
  if (id === null || duration === null || duration <= 0 || duration > MAX_HOURS) {
    ctx.reply('Формат: /edit <номер> <годин>, наприклад /edit 1 3');
    return;
  }
  try {
    let record = storage.updateBooking(id, duration);
    if (record === null) {
      ctx.reply(format.NOT_FOUND_TEXT);
      return;
    }
    ctx.reply('Оновлено: ' + format.formatBooking(record));
  } catch (error) {
    console.error('edit:', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
  }
};

const handleDel = (ctx) => {
  let id = parseId(ctx.message.text.split(/\s+/)[1]);
  if (id === null) {
    ctx.reply('Формат: /del <номер>, наприклад /del 3');
    return;
  }
  let record = storage.getBooking(id);
  if (record === null) {
    ctx.reply(format.NOT_FOUND_TEXT);
    return;
  }
  userStates.set(ctx.from.id, { step: 'confirm_delete', recordId: id });
  ctx.reply('Видалити ' + format.formatBooking(record) + '?\nНапиши «так» для підтвердження або /cancel.');
};
const MAX_IMPORT = 500;  

const handleImport = (ctx) => {
  let text;
  try {
    text = csv.readCsvFile(IMPORT_FILE);
  } catch (error) {
    console.error('import (читання файлу):', error.message);
    ctx.reply('Не вдалося прочитати файл імпорту.');
    return;
  }
  if (text === null) {
    ctx.reply('Файл імпорту не знайдено. Покладіть файл bookings.csv у папку import і повторіть /import.');
    return;
  }

  let result = csv.bookingsFromCsv(text);
  if (result.good.length === 0) {
    ctx.reply(format.formatImportReport(0, result.errors) + '\nУ файлі немає жодного коректного рядка.');
    return;
  }
  if (result.good.length > MAX_IMPORT) {
    ctx.reply('Забагато записів: ' + result.good.length + '. За один раз можна імпортувати не більше ' + MAX_IMPORT + '.');
    return;
  }
  try {
    storage.addManyBookings(ctx.from.id, result.good);
  } catch (error) {
    console.error('import (збереження):', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
    return;
  }
  ctx.reply(format.formatImportReport(result.good.length, result.errors));
};
const handleTime = (ctx) => {
  let now = new Date();
  let kyiv = now.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
  ctx.reply('Зараз у Києві: ' + kyiv + '\nUTC (так час зберігається у файлі): ' + now.toISOString());
};
const handleLast = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let hours = parseHours(parts[1]);
  if (hours === null) {
    ctx.reply('Формат: /last <години>, наприклад /last 24 (від 0 до 720). Без числа: за останні 24 години.');
    return;
  }
  let items = storage.listBookingsLastHours(hours);
  ctx.reply(format.formatPeriodReport('За останні ' + hours + ' год', items));
};
const handleDay = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let dayText = parts[1];
  if (!dayText || !isValidDayText(dayText)) {
    ctx.reply('Формат: /day ДД.ММ.РРРР, наприклад /day 26.10.2026');
    return;
  }
  let items = storage.listBookingsByDay(dayText);
  ctx.reply(format.formatPeriodReport('За ' + dayText, items));
};
const handleToday = (ctx) => {
  let today = new Date().toLocaleDateString('uk-UA', { timeZone: 'Europe/Kiev' });
  let items = storage.listBookingsByDay(today);
  ctx.reply(format.formatPeriodReport('Сьогодні (' + today + ')', items));
};

const handleReport = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let hours = parseHours(parts[1]);
  if (hours === null) {
    ctx.reply('Формат: /report <години>, наприклад /report 24 (від 0 до 720). Без числа: за останні 24 години.');
    return;
  }
  let records = storage.listBookingsLastHours(hours);   // відбираємо за періодом
  ctx.reply(format.formatStatsReport('За останні ' + hours + ' год', records));   // рахуємо
};

const handleTop = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let count = parseCount(parts[1]);
  if (count === null) {
    ctx.reply('Формат: /top <кількість>, наприклад /top 5 (від 1 до 20). Без числа: 5.');
    return;
  }
  let items = storage.listTopBookings(count);
  if (items.length === 0) {
    ctx.reply('Заявок ще немає. Додай першу: /add 2026-11-05 10:00 портрет 2');
    return;
  }
  let text = 'Найдовші заявки:';
  for (let record of items) {
    text = text + '\n' + format.formatBooking(record);
  }
  ctx.reply(text);
};

const handleDaily = (ctx) => {
  try {
    if (storage.isSubscribed('report', ctx.from.id)) {
      storage.removeSubscriber('report', ctx.from.id);
      ctx.reply('Щоденний звіт вимкнено.');
    } else {
      storage.addSubscriber('report', ctx.from.id);
      ctx.reply('Щоденний звіт увімкнено: щодня о ' + REPORT_TIME + ' за Києвом.');
    }
  } catch (error) {
    console.error('daily:', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
  }
};
const handleRemind = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let minutes = parseMinutes(parts[1]);
  let text = parts.slice(2).join(' ').trim();   // усе після числа: текст нагадування
  if (minutes === null || text === '' || text.length > 200) {
    ctx.reply('Формат: /remind <хвилини> <текст>, наприклад /remind 30 Підготувати камеру (від 1 до 10080 хвилин, текст до 200 символів).');
    return;
  }
  let dueAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  try {
    let reminder = storage.addReminder(ctx.from.id, text, dueAt);
    ctx.reply('Нагадаю: ' + format.formatReminder(reminder));
  } catch (error) {
    console.error('remind:', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
  }
};
const handleReminders = (ctx) => {
  let items = storage.listUserReminders(ctx.from.id);
  if (items.length === 0) {
    ctx.reply('Активних нагадувань немає. Додай: /remind 30 Підготувати камеру');
    return;
  }
  let text = 'Твої нагадування:';
  for (let reminder of items) {
    text = text + '\n' + format.formatReminder(reminder);
  }
  ctx.reply(text);
};

// ---------- ЛР15: підписки, розсилка ----------

const isTopic = (name) => {
  for (let topic in config.TOPICS) {
    if (topic === name) {
      return true;
    }
  }
  return false;
};

const topicsText = () => {
  let text = '';
  for (let topic in config.TOPICS) {
    text = text + '\n' + topic + ' — ' + config.TOPICS[topic];
  }
  return text;
};

const handleSubscribe = (ctx) => {
  let topic = ctx.message.text.split(/\s+/)[1];
  if (!isTopic(topic)) {
    ctx.reply('Формат: /subscribe <тема>. Теми:' + topicsText());
    return;
  }
  try {
    storage.addSubscriber(topic, ctx.from.id);
    ctx.reply('Підписано: ' + config.TOPICS[topic] + '.');
  } catch (error) {
    console.error('subscribe:', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
  }
};

const handleUnsubscribe = (ctx) => {
  let topic = ctx.message.text.split(/\s+/)[1];
  if (!isTopic(topic)) {
    ctx.reply('Формат: /unsubscribe <тема>. Теми:' + topicsText());
    return;
  }
  try {
    storage.removeSubscriber(topic, ctx.from.id);
    ctx.reply('Відписано: ' + config.TOPICS[topic] + '.');
  } catch (error) {
    console.error('unsubscribe:', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
  }
};

const handleId = (ctx) => {
  ctx.reply('Твій Telegram ID: ' + ctx.from.id);
};

const handleSubscriptions = (ctx) => {
  let text = 'Твої підписки:';
  for (let topic in config.TOPICS) {
    let mark = '✖';
    if (storage.isSubscribed(topic, ctx.from.id)) {
      mark = '✔';
    }
    text = text + '\n' + mark + ' ' + topic + ' — ' + config.TOPICS[topic];
  }
  ctx.reply(text);
};

// async, бо всередині є await. Замість bot передаємо ctx: розсилці потрібен лише .telegram
const handleBroadcast = async (ctx) => {
  if (ctx.from.id !== config.ADMIN_ID) {
    ctx.reply('Ця команда лише для адміністратора.');
    return;
  }
  let text = ctx.message.text.split(/\s+/).slice(1).join(' ').trim();
  if (text === '' || text.length > 1000) {
    ctx.reply('Формат: /broadcast <текст> (до 1000 символів).');
    return;
  }
  let total = storage.listSubscribers('news').length;
  ctx.reply('Розсилку запущено. Підписників теми news: ' + total);

  let result = await broadcaster.broadcast(ctx, 'news', '📢 ' + text);   // чекаємо завершення розсилки
  ctx.reply('Розсилку завершено. Доставлено: ' + result.delivered + ', помилок: ' + result.failed);
};



const handleWeather = async (ctx) => {
  let city = ctx.message.text.split(/\s+/).slice(1).join(' ').trim();
  if (city === '') {
    city = config.DEFAULT_CITY;
  }
  if (city.length > 50) {
    ctx.reply('Назва міста задовга (до 50 символів).');
    return;
  }

  try {
    let weather = await weatherService.weatherForCity(city);
    if (weather === null) {
      ctx.reply('Місто «' + city + '» не знайдено.');
      return;
    }
    ctx.reply(format.formatWeather(weather));
  } catch (error) {
    console.error('weather:', error.message);
    ctx.reply('Не вдалося отримати погоду. Спробуй пізніше.');
  }
};

const shootAdvice = (weather) => {
  if (weather.temperature < 0) {
    return '❄ Надворі мороз: для зйомки на вулиці одягайтеся тепліше або оберіть студію.';
  }
  if (weather.wind > 30) {
    return '💨 Сильний вітер: для зйомки на вулиці краще обрати студію.';
  }
  if (weather.temperature > 30) {
    return '☀ Спекотно: для зйомки на вулиці оберіть ранок або вечір.';
  }
  return '👍 Погода підходить для зйомки на вулиці.';
};

const handleCompare = async (ctx) => {
  let latest = storage.listBookings()[0]; 
  if (latest === undefined) {
    ctx.reply('Заявок ще немає. Додай першу: /add 2026-11-05 10:00 портрет 2');
    return;
  }

  try {
    let weather = await weatherService.weatherForCity(config.DEFAULT_CITY);
    if (weather === null) {
      ctx.reply('Не вдалося визначити місто ' + config.DEFAULT_CITY + '.');
      return;
    }
    ctx.reply('Надворі (' + weather.city + '): ' + weather.temperature + ' °C, вітер ' + weather.wind + ' км/год\n'
      + 'Остання заявка: ' + format.formatBooking(latest) + '\n'
      + shootAdvice(weather));
  } catch (error) {
    console.error('compare:', error.message);
    ctx.reply('Не вдалося отримати погоду. Спробуй пізніше.');
  }
};

const handleForecast = async (ctx) => {
  let city = ctx.message.text.split(/\s+/).slice(1).join(' ').trim();
  if (city === '') {
    city = config.DEFAULT_CITY;
  }
  if (city.length > 50) {
    ctx.reply('Назва міста задовга (до 50 символів).');
    return;
  }

  try {
    let forecast = await weatherService.forecastForCity(city);
    if (forecast === null) {
      ctx.reply('Місто «' + city + '» не знайдено.');
      return;
    }
    ctx.reply(format.formatForecast(forecast));
  } catch (error) {
    console.error('forecast:', error.message);
    ctx.reply('Не вдалося отримати прогноз. Спробуй пізніше.');
  }
};

const handleLive = (ctx) => {
  let latest = storage.latestBySensor();
  let text = '';
  let shown = 0;
  for (let name in latest) {
    if (shown >= 10) {
      break;
    }
    let record = latest[name];
    text = text + '\n' + name + ': ' + record.duration + ' год (' + format.formatAgo(record.createdAt) + ')';
    shown = shown + 1;
  }
  if (text === '') {
    ctx.reply('Показань ще немає. Запусти симулятор: node simulator.js 2');
    return;
  }
  ctx.reply('Останні показання:' + text);
};

// ---------- ЛР19: графіки ----------

const pointsFor = (hours, sensor) => {
  let records;
  if (typeof storage.listReadingsLastHours === 'function') {
    records = storage.listReadingsLastHours(hours);
  } else {
    records = storage.listBookingsLastHours(hours);
  }
  let all = [];
  for (let record of records) {
    if (record.telegramId !== 0) {
      continue;  
    }
    let value = Number(record.duration);  
    if (Number.isNaN(value)) {
      continue;
    }
    all.push({ sensor: record.type, time: new Date(record.createdAt).getTime(), value: value });
  }
  if (sensor === '' && all.length > 0) {
    let newest = all[0];
    for (let item of all) {
      if (item.time > newest.time) {
        newest = item;
      }
    }
    sensor = newest.sensor;
  }
  let points = [];
  for (let item of all) {
    if (item.sensor === sensor) {
      points.push({ time: item.time, value: item.value });
    }
  }
  points.sort((a, b) => a.time - b.time);
  return { sensor: sensor, points: points };
};

const handleTrend = (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let hours = parseHours(parts[1]);
  if (hours === null) {
    ctx.reply('Формат: /trend <години> <датчик>, наприклад /trend 6 теплиця-1 (від 0 до 720 годин).');
    return;
  }
  let found = pointsFor(hours, parts.slice(2).join(' ').trim());
  if (found.points.length < 2) {
    ctx.reply('Для діаграми потрібно щонайменше 2 показання датчика за цей період.');
    return;
  }
  let groups = chart.downsample(found.points, 30);
  let values = [];
  let min = found.points[0].value;
  let max = found.points[0].value;
  for (let point of groups) {
    values.push(point.value);
  }
  for (let point of found.points) {
    if (point.value < min) {
      min = point.value;
    }
    if (point.value > max) {
      max = point.value;
    }
  }
  ctx.reply(found.sensor + ' (за ' + hours + ' год, показань: ' + found.points.length + ')\n'
    + chart.sparkline(values) + '\n'
    + 'мін ' + min.toFixed(1) + ' · макс ' + max.toFixed(1));
};

const handleChart = async (ctx) => {
  let parts = ctx.message.text.split(/\s+/);
  let hours = parseHours(parts[1]);
  if (hours === null) {
    ctx.reply('Формат: /chart <години> <датчик>, наприклад /chart 6 теплиця-1 (від 0 до 720 годин).');
    return;
  }
  let found = pointsFor(hours, parts.slice(2).join(' ').trim());
  if (found.points.length < 2) {
    ctx.reply('Для графіка потрібно щонайменше 2 показання датчика за цей період.');
    return;
  }
  let points = chart.downsample(found.points, 300);
  let image = chart.chartToPng(points, { min: config.ALERT_MIN, max: config.ALERT_MAX });
  try {
    await ctx.replyWithPhoto({ source: image }, {
      caption: found.sensor + ' · за ' + hours + ' год · показань: ' + found.points.length
        + '\nЗелений маркер — мінімум, червоний — максимум; помаранчевий пунктир — межі норми.',
    });
  } catch (error) {
    console.error('chart:', error.message);
    ctx.reply('Не вдалося надіслати графік. Спробуй пізніше.');
  }
};

module.exports = (bot) => {
   bot.command('day', handleDay);
  bot.command('today', handleToday);
  bot.command('last', handleLast);
  bot.start(handleStart);

  bot.command('book', handleBook);
  bot.command('group', handleGroup);
  bot.command('comment', handleComment);
  bot.command('profile', handleProfile);
  bot.command('data', handleData);
  bot.command('register', handleRegister);
  bot.command('me', handleMe);
  bot.command('add', handleAdd);
  bot.command('list', handleList);
  bot.command('get', handleGet);
  bot.command('edit', handleEdit);
  bot.command('del', handleDel);
  bot.command('import', handleImport);
  bot.command('live', handleLive);
  bot.command('trend', handleTrend);
  bot.command('chart', handleChart);
  bot.command('time', handleTime);
  bot.command('status', handleStatus);
  bot.command('daily', handleDaily);
  bot.command('remind', handleRemind);
  bot.command('reminders', handleReminders);
  bot.command('subscribe', handleSubscribe);
  bot.command('unsubscribe', handleUnsubscribe);
  bot.command('subscriptions', handleSubscriptions);
  bot.command('id', handleId);
  bot.command('broadcast', handleBroadcast);
  bot.command('weather', handleWeather);
  bot.command('compare', handleCompare);
  bot.command('forecast', handleForecast);
  bot.command('help', handleHelp);
  bot.command('cancel', handleCancel);
  bot.command('report', handleReport);
  bot.command('top', handleTop);

  bot.hears(BUTTONS.book, handleBook);
  bot.hears(BUTTONS.status, handleStatus);
  bot.hears(BUTTONS.help, handleHelp);

  bot.telegram
    .setMyCommands([
      { command: 'time', description: 'Поточний час (Київ і UTC)' },
      { command: 'last', description: 'Заявки за останні години' },
      { command: 'day', description: 'Заявки за добу' },
      { command: 'today', description: 'Заявки за сьогодні' },
      { command: 'start', description: 'Почати роботу з ботом' },
      { command: 'book', description: 'Подати заявку на фотозйомку' },
      { command: 'group', description: 'Підказка щодо формату зйомки' },
      { command: 'comment', description: 'Коментар до заявки' },
      { command: 'profile', description: 'Як фотограф зв’яжеться з вами' },
      { command: 'data', description: 'Передати ім’я у форматі JSON' },
      { command: 'register', description: 'Зареєструватися' },
      { command: 'me', description: 'Що бот про мене пам’ятає' },
      { command: 'add', description: 'Додати заявку' },
      { command: 'list', description: 'Останні заявки' },
      { command: 'get', description: 'Показати заявку за номером' },
      { command: 'edit', description: 'Змінити тривалість заявки' },
      { command: 'del', description: 'Видалити заявку' },
      { command: 'report', description: 'Зведення за період' },
      { command: 'top', description: 'Найдовші заявки' },
      { command: 'daily', description: 'Щоденний звіт (увімк./вимк.)' },
      { command: 'remind', description: 'Створити нагадування' },
      { command: 'reminders', description: 'Мої нагадування' },
      { command: 'subscribe', description: 'Підписатися на тему' },
      { command: 'unsubscribe', description: 'Відписатися від теми' },
      { command: 'live', description: 'Останні показання від джерел' },
      { command: 'trend', description: 'Текстова діаграма показань' },
      { command: 'chart', description: 'Графік показань' },
      { command: 'subscriptions', description: 'Мої підписки' },
      { command: 'id', description: 'Мій Telegram ID' },
      { command: 'broadcast', description: 'Розсилка новин (адміністратор)' },
      { command: 'weather', description: 'Погода зараз' },
      { command: 'compare', description: 'Погода надворі й остання заявка' },
      { command: 'forecast', description: 'Прогноз на три дні' },
      { command: 'import', description: 'Імпорт заявок з CSV-файлу' },
      { command: 'status', description: 'Статус моєї заявки' },
      { command: 'help', description: 'Список команд' },
      { command: 'cancel', description: 'Скасувати поточний діалог' },
    ])
    .catch((err) => console.log('Не вдалося встановити список команд:', hideToken(err.message)));
};