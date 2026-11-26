function parseNumber(text) {
  if (typeof text !== 'string' || text.trim() === '') return null;
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function isNonEmpty(text) {
  return typeof text === 'string' && text.trim() !== '';
}

function parseDate(text) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const date = new Date(year, month - 1, day);
  const isReal =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isReal ? date : null;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.log('parseJson: некоректний JSON:', error.message);
    return null;
  }
}

function parseId(text) {
  let value = Number(text);
  if (Number.isInteger(value) && value > 0) { return value; }
  return null;
}

function parseDateTime(dateText, timeText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !/^\d{2}:\d{2}$/.test(timeText)) { return null; }
  let iso = dateText + 'T' + timeText + ':00';
  if (Number.isNaN(new Date(iso).getTime())) { return null; }
  return iso;
}

function parseHours(text) {
  if (text === undefined) {
    return 24;               // без числа: за останні 24 години
  }
  let value = parseNumber(text);
  if (value === null || value <= 0 || value > 720) {
    return null;             // не число, не додатне, або більше 30 діб
  }
  return value;
}

function isValidDayText(text) {
  let match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(text));
  if (!match) { return false; }
  let day = Number(match[1]);
  let month = Number(match[2]);
  let year = Number(match[3]);
  let date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseCount(text) {
  if (text === undefined) {
    return 5;                 
  }
  let value = parseId(text);
  if (value === null || value > 20) {
    return null;
  }
  return value;
}
function parseMinutes(text) {
  let value = parseId(text);
  if (value === null || value > 10080) {
    return null;
  }
  return value;
}
module.exports = {
  isNonEmpty, parseNumber, parseDate, parseJson,
  parseId, parseDateTime, parseHours, isValidDayText, parseCount, parseMinutes,
};