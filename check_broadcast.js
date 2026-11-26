let broadcaster = require('./broadcast');
let storage = require('./storage');
storage.loadData();

let received = [];
let fakeBot = {
  telegram: {
    sendMessage: function (userId, text) {
      if (userId === 3) {
        let blocked = new Error('Forbidden: bot was blocked by the user');
        blocked.code = 403;
        return Promise.reject(blocked);
      }
      if (userId === 5) {
        return Promise.reject(new Error('мережа недоступна'));
      }
      received.push(userId);
      return Promise.resolve();
    },
  },
};

async function main() {
  for (let userId of [1, 2, 3, 4, 5]) {
    storage.addSubscriber('news', userId);
  }
  let started = Date.now();
  let result = await broadcaster.broadcast(fakeBot, 'news', 'Тестова розсилка');
  let elapsed = Date.now() - started;
  console.log('Доставлено:', result.delivered, '| помилок:', result.failed);
  console.log('Отримали:', received);
  console.log('Підписники після розсилки:', storage.listSubscribers('news'));
  console.log('Розсилка тривала не менше 200 мс:', elapsed >= 200);
  for (let userId of [1, 2, 3, 4, 5]) {
    storage.removeSubscriber('news', userId);
  }
}
main();