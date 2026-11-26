let NOT_FOUND_TEXT = 'Заявки з таким номером немає.';
let SAVE_FAILED_TEXT = 'Не вдалося зберегти зміни. Спробуй пізніше.';
let stats = require('./stats');

function formatBooking(record) {
  let when = new Date(record.startsAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
  return `#${record.id} · ${record.type} · ${when} · ${record.duration} год · ${record.status}`;
}
function formatImportReport(addedCount, errors) {
  let text = 'Імпортовано записів: ' + addedCount;
  if (errors.length > 0) {
    text = text + '\nПропущено рядків: ' + errors.length;
    let limit = 5;   // показуємо не більше 5 помилок
    for (let i = 0; i < errors.length && i < limit; i++) {
      text = text + '\n• ' + errors[i];
    }
    if (errors.length > limit) {
      text = text + '\n… і ще ' + (errors.length - limit);
    }
  }
  return text;
}
function formatAgo(iso) {
  let minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) { return 'щойно'; }
  if (minutes < 60) { return minutes + ' хв тому'; }
  let hours = Math.floor(minutes / 60);
  if (hours < 24) { return hours + ' год тому'; }
  let days = Math.floor(hours / 24);
  return days + ' дн тому';
}

function formatPeriodReport(title, items) {
  if (items.length === 0) {
    return title + ': записів немає.';
  }
  let text = title + ': ' + items.length;
  let limit = 10;
  for (let i = 0; i < items.length && i < limit; i++) {
    text = text + '\n' + formatBooking(items[i])
      + ' (' + formatAgo(items[i].createdAt) + ')';
  }
  if (items.length > limit) {
    text = text + '\n… і ще ' + (items.length - limit);
  }
  return text;
}
function formatStatsReport(title, records) {
  if (records.length === 0) {
    return title + ': записів немає.';
  }
  let groups = stats.groupByType(records);
  let text = title + ': ' + records.length + ' записів';
  let shown = 0;
  let hidden = 0;
  for (let name in groups) {
    if (shown >= 10) { hidden = hidden + 1; continue; }
    let s = stats.calcStats(groups[name]);
    text = text + '\n' + name + ': ' + s.count + ' шт, мін '
      + s.min + ', макс ' + s.max + ', середнє ' + s.avg.toFixed(1);
    shown = shown + 1;
  }
  if (hidden > 0) { text = text + '\n… і ще типів: ' + hidden; }
  return text;
}
function formatReminder(reminder) {
  let when = new Date(reminder.dueAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
  return '#' + reminder.id + ' · ' + when + ' · ' + reminder.text;
}

function formatWeather(weather) {
  return weather.city + ': ' + weather.temperature + ' °C, вологість ' + weather.humidity + ' %, вітер ' + weather.wind + ' км/год';
}

function formatForecast(forecast) {
  let text = 'Прогноз для міста ' + forecast.city + ':';
  for (let day of forecast.days) {
    let parts = day.date.split('-');
    text = text + '\n' + parts[2] + '.' + parts[1] + ': від ' + day.min + ' до ' + day.max + ' °C';
  }
  return text;
}
module.exports = { NOT_FOUND_TEXT, SAVE_FAILED_TEXT, formatBooking, formatImportReport,formatStatsReport, formatAgo,
formatPeriodReport,formatReminder, formatWeather,formatForecast };