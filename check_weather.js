let weatherService = require('./weather');

let calls = 0;
let mode = 'ok';

function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: async function () {
      return body;
    },
  };
}

globalThis.fetch = async function (url) {
  calls = calls + 1;
  if (mode === 'network') {
    throw new TypeError('fetch failed');
  }
  if (mode === 'error500') {
    return fakeResponse(500, {});
  }
  if (url.includes('geocoding')) {
    if (url.includes(encodeURIComponent('Невідоме'))) {
      return fakeResponse(200, {});
    }
    return fakeResponse(200, { results: [{ name: 'Київ', latitude: 50.45, longitude: 30.52 }] });
  }
  return fakeResponse(200, { current: { temperature_2m: 9.3, relative_humidity_2m: 80, wind_speed_10m: 7.5 } });
};

async function main() {
  let weather = await weatherService.weatherForCity('Київ');
  console.log('1) Погода:', weather, '| звернень до сервісу:', calls);

  await weatherService.weatherForCity('київ');
  console.log('2) Те саме з кешу, звернень до сервісу:', calls);

  weatherService.clearCache();
  console.log('3) Невідоме місто:', await weatherService.weatherForCity('Невідоме'));

  mode = 'error500';
  try {
    await weatherService.weatherForCity('Київ');
  } catch (error) {
    console.log('4) Помилка сервісу:', error.message);
  }

  mode = 'network';
  try {
    await weatherService.weatherForCity('Київ');
  } catch (error) {
    console.log('5) Немає мережі:', error.message);
  }
}
main();