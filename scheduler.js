let config = require('./config');
let storage = require('./storage');
let format = require('./utils/format');

function kyivTime(now) {
  return now.toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kiev', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

function kyivDay(now) {
  return now.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kiev' });
}

function sendSafe(bot, telegramId, text) {
  bot.telegram.sendMessage(telegramId, text).catch(function (error) {
    console.error('Не вдалося надіслати користувачу ' + telegramId + ':', error.message);
    if (error.code === 403) {
      try {
        storage.removeSubscriber('report', telegramId);
      } catch (saveError) {
        console.error('Не вдалося прибрати підписника:', saveError.message);
      }
    }
  });
}

function checkReminders(bot, now) {
  let due = storage.listDueReminders(now.getTime());
  for (let reminder of due) {
    storage.removeReminder(reminder.id);
    sendSafe(bot, reminder.telegramId, '⏰ Нагадування: ' + reminder.text);
  }
}

function checkDailyReport(bot, now) {
  let today = kyivDay(now);
  if (storage.getLastReportDay() === today) {
    return;
  }
  if (kyivTime(now) < config.REPORT_TIME) {
    return;
  }
  storage.setLastReportDay(today);
  let records = storage.listBookingsLastHours(24, now.getTime());
  let text = format.formatStatsReport('Щоденний звіт за 24 години', records);
  for (let telegramId of storage.listSubscribers('report')) {
    sendSafe(bot, telegramId, text);
  }
}

function tick(bot, now) {
  try {
    checkReminders(bot, now);
    checkDailyReport(bot, now);
  } catch (error) {
    console.error('Планувальник:', error.message);
  }
}

function start(bot) {
  tick(bot, new Date());
  setInterval(function () {
    tick(bot, new Date());
  }, 60 * 1000);
}

module.exports = { start, tick, kyivTime, kyivDay };