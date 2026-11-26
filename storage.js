const fs = require('fs');
const path = require('path');
const { DATA_FILE } = require('./config');
const stats = require('./utils/stats');

let data = { users: {}, bookings: [], lastBookingId: 0,
  subscriptions: { report: [], alert: [], news: [] },
  reminders: [], lastReminderId: 0, lastReportDay: '' };

function loadData() {
  let raw;
  try {
    raw = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Файл даних ще не створено — починаємо з порожніх даних.');
      return;
    }
    throw error;
  }
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Файл ${DATA_FILE} пошкоджений: ${error.message}`);
  }
  if (!data.users) { data.users = {}; }
  if (!Array.isArray(data.bookings)) { data.bookings = []; }
  if (!data.lastBookingId) { data.lastBookingId = 0; }
  if (!data.subscriptions) { data.subscriptions = {}; }
  for (let topic of ['report', 'alert', 'news']) {
    if (!Array.isArray(data.subscriptions[topic])) {
      data.subscriptions[topic] = [];
    }
  }
  // перенесення старих підписників з ЛР14 у тему report
  if (Array.isArray(data.subscribers)) {
    for (let userId of data.subscribers) {
      if (!data.subscriptions.report.includes(userId)) {
        data.subscriptions.report.push(userId);
      }
    }
    delete data.subscribers;
  }
  if (!Array.isArray(data.reminders)) { data.reminders = []; }
  if (!data.lastReminderId) { data.lastReminderId = 0; }
  if (!data.lastReportDay) { data.lastReportDay = ''; }
}

function persist(next) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function makeCopy() {
  return JSON.parse(JSON.stringify(data));
}

function saveChanges(copy) {
  persist(copy);
  data = copy;
}

function saveUser(telegramId, name, role) {
  let copy = makeCopy();
  let createdAt = new Date().toISOString();
  if (copy.users[telegramId]) {
    createdAt = copy.users[telegramId].createdAt;
  }
  copy.users[telegramId] = { telegramId, name, role, createdAt };
  try {
    saveChanges(copy);
    return true;
  } catch (error) {
    console.error('saveUser:', error.message);
    return false;
  }
}

function getUser(telegramId) {
  return data.users[telegramId] || null;
}

function indexOfId(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) { return i; }
  }
  return -1;
}

function addBooking(telegramId, startsAt, type, duration) {
  let copy = makeCopy();
  copy.lastBookingId = copy.lastBookingId + 1;
  let record = {
    id: copy.lastBookingId,
    telegramId: telegramId,
    type: type,
    startsAt: startsAt,
    duration: duration,
    comment: '',
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  copy.bookings.push(record);
  saveChanges(copy);
  return record;
}

function getBooking(id) {
  let index = indexOfId(data.bookings, id);
  if (index === -1) { return null; }
  return data.bookings[index];
}

function listBookings() {
  return data.bookings.slice(-10).reverse();
}

function listBookingsLastHours(hours, nowMs) {
  if (nowMs === undefined) {
    nowMs = Date.now();
  }
  let fromTime = nowMs - hours * 60 * 60 * 1000;
  let result = [];
  for (let i = data.bookings.length - 1; i >= 0; i--) {
    let record = data.bookings[i];
    if (new Date(record.createdAt).getTime() >= fromTime) {
      result.push(record);
    }
  }
  return result;
}

function listBookingsByDay(dayText) {
  let result = [];
  for (let i = data.bookings.length - 1; i >= 0; i--) {
    let record = data.bookings[i];
    let recordDay = new Date(record.createdAt).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kiev' });
    if (recordDay === dayText) {
      result.push(record);
    }
  }
  return result;
}

function updateBooking(id, duration) {
  let copy = makeCopy();
  let index = indexOfId(copy.bookings, id);
  if (index === -1) { return null; }
  copy.bookings[index].duration = duration;
  copy.bookings[index].updatedAt = new Date().toISOString();
  saveChanges(copy);
  return copy.bookings[index];
}

function deleteBooking(id) {
  let copy = makeCopy();
  let index = indexOfId(copy.bookings, id);
  if (index === -1) { return null; }
  let removed = copy.bookings[index];
  copy.bookings.splice(index, 1);
  saveChanges(copy);
  return removed;
}

function addManyBookings(telegramId, items) {
  let copy = makeCopy();
  for (let item of items) {
    copy.lastBookingId = copy.lastBookingId + 1;
    let createdAt = new Date().toISOString();
    if (item.createdAt) {
      createdAt = item.createdAt;
    }
    copy.bookings.push({
      id: copy.lastBookingId,
      telegramId: telegramId,
      type: item.type,
      startsAt: item.startsAt,
      duration: item.duration,
      comment: '',
      status: 'new',
      createdAt: createdAt,
    });
  }
  saveChanges(copy);
  return items.length;
}

function addDeviceReading(source, duration, time) {
  let copy = makeCopy();

  let index = copy.bookings.length;
  while (index > 0 && copy.bookings[index - 1].createdAt > time) {
    index = index - 1;
  }

  for (let i = index - 1; i >= 0 && copy.bookings[i].createdAt === time; i--) {
    if (copy.bookings[i].telegramId === 0 && copy.bookings[i].type === source) {
      return null;
    }
  }

  copy.lastBookingId = copy.lastBookingId + 1;
  let startsAt = new Date(new Date(time).getTime() + 24 * 60 * 60 * 1000).toISOString();
  let record = {
    id: copy.lastBookingId,
    telegramId: 0,
    type: source,
    startsAt: startsAt,
    duration: duration,
    comment: '',
    status: 'new',
    createdAt: time,
  };
  copy.bookings.splice(index, 0, record);
  saveChanges(copy);
  return record;
}

function latestBySensor() {
  let latest = {};
  for (let record of data.bookings) {
    if (record.telegramId === 0) {
      latest[record.type] = record;
    }
  }
  return latest;
}

function listTopBookings(count) {
  return stats.topByDuration(data.bookings, count);
}


function isSubscribed(topic, userId) {
  return data.subscriptions[topic].includes(userId);
}

function listSubscribers(topic) {
  return data.subscriptions[topic].slice();
}

function addSubscriber(topic, userId) {
  let copy = makeCopy();
  if (!copy.subscriptions[topic].includes(userId)) {
    copy.subscriptions[topic].push(userId);
  }
  saveChanges(copy);
}

function removeSubscriber(topic, userId) {
  let copy = makeCopy();
  let index = copy.subscriptions[topic].indexOf(userId);
  if (index !== -1) {
    copy.subscriptions[topic].splice(index, 1);
  }
  saveChanges(copy);
}


function addReminder(telegramId, text, dueAt) {
  let copy = makeCopy();
  copy.lastReminderId = copy.lastReminderId + 1;
  let reminder = { id: copy.lastReminderId, telegramId: telegramId, text: text, dueAt: dueAt };
  copy.reminders.push(reminder);
  saveChanges(copy);
  return reminder;
}

function listDueReminders(nowMs) {
  let result = [];
  for (let reminder of data.reminders) {
    if (new Date(reminder.dueAt).getTime() <= nowMs) {
      result.push(reminder);
    }
  }
  return result;
}

function listUserReminders(telegramId) {
  let result = [];
  for (let reminder of data.reminders) {
    if (reminder.telegramId === telegramId) {
      result.push(reminder);
    }
  }
  return result;
}

function removeReminder(id) {
  let copy = makeCopy();
  let index = indexOfId(copy.reminders, id);
  if (index !== -1) {
    copy.reminders.splice(index, 1);
    saveChanges(copy);
  }
}


function getLastReportDay() {
  return data.lastReportDay;
}

function setLastReportDay(dayText) {
  let copy = makeCopy();
  copy.lastReportDay = dayText;
  saveChanges(copy);
}

module.exports = {
  loadData, saveUser, getUser,
  addBooking, getBooking, listBookings, updateBooking, deleteBooking,
  addManyBookings,
  listBookingsLastHours, listBookingsByDay, latestBySensor, addDeviceReading, listTopBookings,
  isSubscribed, listSubscribers, addSubscriber, removeSubscriber,
  addReminder, listDueReminders, listUserReminders, removeReminder,
  getLastReportDay, setLastReportDay,
};