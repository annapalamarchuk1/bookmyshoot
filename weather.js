let config = require('./config');
let cache = new Map();

async function getJson(url) {
  let response = await fetch(url, { signal: AbortSignal.timeout(config.HTTP_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error('Сервіс відповів помилкою ' + response.status);
  }

  return await response.json();
}

async function findCity(name) {
  let url = config.GEOCODING_URL + '?name=' + encodeURIComponent(name) + '&count=1&language=uk';
  let data = await getJson(url);

  if (data.results === undefined || data.results.length === 0) {
    return null;
  }

  let city = data.results[0];
  return { name: city.name, latitude: city.latitude, longitude: city.longitude };
}

async function getCurrentWeather(latitude, longitude) {
  let url = config.FORECAST_URL
    + '?latitude=' + latitude
    + '&longitude=' + longitude
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m'
    + '&timezone=auto';
  let data = await getJson(url);

  if (data.current === undefined || typeof data.current.temperature_2m !== 'number') {
    throw new Error('Несподівана відповідь сервісу: немає температури');
  }

  return {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    wind: data.current.wind_speed_10m,
  };
}

async function weatherForCity(name) {
  let key = name.toLowerCase();

  let saved = cache.get(key);
  if (saved !== undefined && Date.now() - saved.savedAt < config.WEATHER_CACHE_MS) {
    return saved.weather;
  }

  let city = await findCity(name);
  if (city === null) {
    return null;
  }

  let current = await getCurrentWeather(city.latitude, city.longitude);
  let weather = { city: city.name, temperature: current.temperature, humidity: current.humidity, wind: current.wind };

  cache.set(key, { savedAt: Date.now(), weather: weather });
  return weather;
}


async function getDailyForecast(latitude, longitude) {
  let url = config.FORECAST_URL
    + '?latitude=' + latitude
    + '&longitude=' + longitude
    + '&daily=temperature_2m_max,temperature_2m_min'
    + '&forecast_days=3'
    + '&timezone=auto';
  let data = await getJson(url);

  if (data.daily === undefined
      || !Array.isArray(data.daily.time)
      || !Array.isArray(data.daily.temperature_2m_max)
      || !Array.isArray(data.daily.temperature_2m_min)) {
    throw new Error('Несподівана відповідь сервісу: немає прогнозу');
  }

  let days = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    days.push({
      date: data.daily.time[i],
      max: data.daily.temperature_2m_max[i],
      min: data.daily.temperature_2m_min[i],
    });
  }
  return days;
}

async function forecastForCity(name) {
  let key = 'forecast:' + name.toLowerCase();

  let saved = cache.get(key);
  if (saved !== undefined && Date.now() - saved.savedAt < config.WEATHER_CACHE_MS) {
    return saved.forecast;
  }

  let city = await findCity(name);
  if (city === null) {
    return null;
  }

  let days = await getDailyForecast(city.latitude, city.longitude);
  let forecast = { city: city.name, days: days };

  cache.set(key, { savedAt: Date.now(), forecast: forecast });
  return forecast;
}

function clearCache() {
  cache.clear();
}

module.exports = { weatherForCity, forecastForCity, findCity, getCurrentWeather, getJson, clearCache };