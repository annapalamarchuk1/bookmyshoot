let config = require('./config');
let storage = require('./storage');

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function broadcast(bot, topic, text) {
  let ids = storage.listSubscribers(topic);   
  let delivered = 0;
  let failed = 0;
  for (let userId of ids) {
    try {
      await bot.telegram.sendMessage(userId, text);
      delivered = delivered + 1;
    } catch (error) {
      failed = failed + 1;
      console.error('Розсилка: не вдалося надіслати ' + userId + ':', error.message);
      if (error.code === 403) {
        try {
          storage.removeSubscriber(topic, userId);
        } catch (removeError) {
          console.error('Розсилка: не вдалося відписати ' + userId + ':', removeError.message);
        }
      }
    }
    await sleep(config.BROADCAST_PAUSE_MS);
  }
  return { delivered: delivered, failed: failed };
}

module.exports = { broadcast, sleep };