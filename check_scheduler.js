let scheduler = require('./scheduler');
let storage = require('./storage');
storage.loadData();

let sentMessages = [];
let fakeBot = {
  telegram: {
    sendMessage: function (telegramId, text) {
      sentMessages.push(telegramId + ': ' + text.split('\n')[0]);
      return Promise.resolve();
    },
  },
};

storage.addSubscriber(111);
scheduler.tick(fakeBot, new Date('2026-10-22T04:59:00Z'));
console.log('07:59 → повідомлень:', sentMessages.length);
scheduler.tick(fakeBot, new Date('2026-10-22T05:00:00Z'));
console.log('08:00 → повідомлень:', sentMessages.length);
scheduler.tick(fakeBot, new Date('2026-10-22T05:01:00Z'));
console.log('08:01 → повідомлень:', sentMessages.length);
console.log('Що надіслано:', sentMessages[0]);
storage.removeSubscriber(111);
storage.setLastReportDay('');