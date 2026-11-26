const { Telegraf } = require('telegraf');
const { BOT_TOKEN, hideToken } = require('./config');
const { loadData } = require('./storage');
const registerCommands = require('./handlers/commands');
const registerDialog = require('./handlers/dialog');
const scheduler = require('./scheduler');
let ingest = require('./ingest');

const bot = new Telegraf(BOT_TOKEN);

registerCommands(bot);
registerDialog(bot);

bot.catch((err, ctx) => {
  console.log(`Помилка для ${ctx.updateType}:`, err);
  ctx.reply('Ой, щось пішло не так. Спробуй ще раз.').catch((replyErr) => {
    console.log('Не вдалося надіслати повідомлення про помилку:', replyErr);
  });
});

async function main() {
  try {
    console.log('Запуск бота...');
    loadData();
    scheduler.start(bot);
    ingest.start(bot);
    await bot.launch();
  }
  catch (error) {
    console.error('Не вдалося запустити бота:', hideToken(error.message));
    process.exit(1);
  }
}

main();
