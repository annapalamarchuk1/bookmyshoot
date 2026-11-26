require('dotenv').config({ quiet: true });
const path = require('path');
const BOT_TOKEN = process.env.BOT_TOKEN;
const REPORT_TIME = '08:00';
if (!BOT_TOKEN) {
  console.error('Не знайдено BOT_TOKEN. Створіть файл .env з рядком BOT_TOKEN=ваш_токен');
  process.exit(1);
}
const hideToken = (text) => String(text).split(BOT_TOKEN).join('***');
const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const IMPORT_FILE = path.join(__dirname, 'import', 'bookings.csv');
let TOPICS = {
  report: 'щоденний звіт',
  alert: 'сповіщення про аномалії',
  news: 'новини від адміністратора',
};

let ALERT_MIN = 1;
let ALERT_MAX = 4;

let ADMIN_ID = Number(process.env.ADMIN_ID);

let BROADCAST_PAUSE_MS = 50;
let GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
let FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
let DEFAULT_CITY = 'Київ';
let HTTP_TIMEOUT_MS = 5000;
let WEATHER_CACHE_MS = 10 * 60 * 1000;

let INGEST_KEY = process.env.INGEST_KEY;
let INGEST_PORT = Number(process.env.INGEST_PORT) || 3000;
let INGEST_HOST = '127.0.0.1';
let INGEST_URL = 'http://' + INGEST_HOST + ':' + INGEST_PORT + '/readings';
let DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN;
let DASHBOARD_REFRESH_S = 5;
module.exports = {
  DASHBOARD_TOKEN, 
  DASHBOARD_REFRESH_S,
  TOPICS, 
  GEOCODING_URL,
  FORECAST_URL, 
  DEFAULT_CITY,
  HTTP_TIMEOUT_MS,
  WEATHER_CACHE_MS,
  ALERT_MIN, 
  ALERT_MAX, 
  ADMIN_ID,
  INGEST_KEY, 
  INGEST_PORT, 
  INGEST_HOST, 
  INGEST_URL,
  BROADCAST_PAUSE_MS,
  BOT_TOKEN,
  hideToken,
  DATA_FILE,
  IMPORT_FILE,
  MAX_PEOPLE: 10,
  MAX_HOURS: 8,
  MAX_COMMENT: 200,
  REPORT_TIME,
};