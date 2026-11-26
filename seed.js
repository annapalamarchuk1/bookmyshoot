let storage = require('./storage');
storage.loadData();

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

let count = storage.addManyBookings(1, [
  { startsAt: '2026-12-01T10:00:00', type: 'портрет', duration: 1,   createdAt: hoursAgo(72) },
  { startsAt: '2026-12-02T10:00:00', type: 'сімейна', duration: 1.5, createdAt: hoursAgo(50) },
  { startsAt: '2026-12-03T10:00:00', type: 'портрет', duration: 2.5, createdAt: hoursAgo(25) },
  { startsAt: '2026-12-04T10:00:00', type: 'портрет', duration: 3,   createdAt: hoursAgo(20) },
  { startsAt: '2026-12-05T10:00:00', type: 'сімейна', duration: 2,   createdAt: hoursAgo(12) },
  { startsAt: '2026-12-06T10:00:00', type: 'портрет', duration: 6,   createdAt: hoursAgo(5) },
  { startsAt: '2026-12-07T10:00:00', type: 'сімейна', duration: 5,   createdAt: hoursAgo(3) },
  { startsAt: '2026-12-08T10:00:00', type: 'портрет', duration: 4,   createdAt: hoursAgo(1) },
]);
console.log('Додано ' + count + ' тестових заявок двох типів (від 72 до 1 години тому).');