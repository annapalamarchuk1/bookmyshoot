const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8915595120:AAE86blkT0aH4q8rUZmjwXO4ZaVAN2dBMkY');

const BTN_BOOK = '📅  Записатись';
const BTN_STATUS = '📊  Статус заявки';
const BTN_HELP = '❓ Допомога';

const mainMenu = Markup.keyboard([
  [BTN_BOOK, BTN_STATUS],
  [BTN_HELP],
]).resize();

const userStates = new Map();

const BTN_CONFIRM = '✅ Підтвердити';
const BTN_REJECT = '❌ Скасувати';
const TYPES = ['Портрет', 'Сімейна', 'Love story', 'Подія'];
const typeMenu = Markup.keyboard([TYPES.slice(0, 2), TYPES.slice(2)]).resize();
const confirmMenu = Markup.keyboard([[BTN_CONFIRM, BTN_REJECT]]).resize();

const MAX_PEOPLE = 10;   
const MAX_HOURS = 8;    

const handleGroup = (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const people = Number(parts[1]);
  const hours = Number(parts[2]);

  if (parts.length !== 3 || !Number.isFinite(people) || !Number.isFinite(hours)) {
    ctx.reply(
      'Потрібно два числа: кількість людей і тривалість у годинах.\n' +
        'Приклад: /group 4 2',
      mainMenu
    );
    return;
  }
  if (!Number.isInteger(people) || people < 1) {
    ctx.reply('Кількість людей — ціле число від 1. Приклад: /group 4 2', mainMenu);
    return;
  }
  if (hours <= 0) {
    ctx.reply('Тривалість має бути більшою за 0 годин. Приклад: /group 4 2', mainMenu);
    return;
  }

  if (people > MAX_PEOPLE || hours > MAX_HOURS) {
    ctx.reply(
      `🚫 Перевищено ліміт студії (до ${MAX_PEOPLE} людей, до ${MAX_HOURS} год). ` +
        'Напишіть адміністратору — підберемо індивідуальні умови.',
      mainMenu
    );
  } else if (people > 5 && hours > 4) {
    ctx.reply(
      '🔥 Складна зйомка: велика група і довга сесія. ' +
        'Потрібні 2 фотографи — запишіться через /book та вкажіть це в коментарі.',
      mainMenu
    );
  } else if (people === 1) {
    ctx.reply('👤 Індивідуальна зйомка: підійде тип «Портрет».', mainMenu);
  } else if (people <= 5) {
    ctx.reply('👨‍👩‍👧 Комфортна група: підійдуть «Сімейна» або «Love story».', mainMenu);
  } else {
    ctx.reply('👥 Велика група (6–10 осіб): потрібен асистент, тип «Подія».', mainMenu);
  }
};

const MAX_COMMENT = 200;
const comments = new Map(); 

const parseDate = (text) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const date = new Date(year, month - 1, day);
  const isReal =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isReal ? date : null;
};

const handleComment = (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const comment = parts.slice(1).join(' ').trim();
  if (!comment) {
    ctx.reply('Напишіть коментар після команди. Приклад: /comment Потрібен білий фон', mainMenu);
    return;
  }
  if (comment.length > MAX_COMMENT) {
    ctx.reply(
      `Коментар задовгий: ${comment.length} символів, максимум ${MAX_COMMENT}. Скоротіть його.`,
      mainMenu
    );
    return;
  }
  comments.set(ctx.from.id, comment);
  ctx.reply(`📝 Коментар збережено: «${comment}»`, mainMenu);
};

const handleProfile = (ctx) => {
  let username = null;
  try {
    username = ctx.from.username.toLowerCase();
  } catch (error) {
    console.log('/profile: у користувача немає username:', error.message);
  }
  if (username) {
    ctx.reply(`👤 Фотограф зв’яжеться з вами в Telegram: @${username}`, mainMenu);
  } else {
    ctx.reply(
      'У вас не встановлено юзернейм у Telegram. Додайте його в налаштуваннях, ' +
        'щоб фотограф міг із вами зв’язатися.',
      mainMenu
    );
  }
};
const handleBook = (ctx) => {
  userStates.set(ctx.from.id, { step: 'type', data: {} });
  ctx.reply('📸 Крок 1/4. Оберіть тип зйомки:', typeMenu);
};

const handleStatus = (ctx) =>
  ctx.reply('📊 Тут буде поточний статус твоєї заявки на фотозйомку.', mainMenu);

const handleHelp = (ctx) =>
  ctx.reply(
    'Доступні команди:\n\n' +
      '/start -привітання та показ меню\n' +
      '/book -подати заявку на фотозйомку\n' +
      '/group -підказка щодо формату зйомки (/group 4 2)\n' +
      '/comment -коментар до заявки (/comment Потрібен білий фон)\n' +
      '/profile -як фотограф зв’яжеться з вами\n' +
      '/status -перевірити статус заявки\n' +
      '/help -список усіх команд\n' +
      '/cancel -скасувати поточний діалог\n\n' +
      'Також бот сам надсилає підтвердження заявки та нагадування за 24 години до зйомки.',
  );

bot.start((ctx) => {
  ctx.reply(
    'Привіт! Я бот для запису на фотозйомку. ' +
      'Обери дію в меню нижче або скористайся командою /help.',
    mainMenu
  );
});

bot.command('book', handleBook);
bot.command('group', handleGroup);
bot.command('comment', handleComment);
bot.command('profile', handleProfile);
bot.command('status', handleStatus);
bot.command('help', handleHelp);
bot.command('cancel', (ctx) => {
  comments.delete(ctx.from.id);
  if (userStates.delete(ctx.from.id)) {
    ctx.reply('Діалог скасовано.', mainMenu);
  } else {
    ctx.reply('Немає активного діалогу.', mainMenu);
  }
});

bot.hears(BTN_BOOK, handleBook);
bot.hears(BTN_STATUS, handleStatus);
bot.hears(BTN_HELP, handleHelp);

bot.on('text', (ctx) => {
  const id = ctx.from.id;
  const state = userStates.get(id);

  if (!state) {
    ctx.reply('Я не зрозумів це повідомлення 🤔 Скористайся меню або командою /help.', mainMenu);
    return;
  }

  const text = ctx.message.text.trim();

  if (state.step === 'type') {
    if (!TYPES.includes(text)) {
      ctx.reply('Оберіть тип зйомки кнопкою нижче 👇', typeMenu);
      return;
    }
    state.data.type = text;
    state.step = 'date';
    ctx.reply('📅 Крок 2/4. Введіть дату у форматі ДД.ММ.РРРР:', Markup.removeKeyboard());
    return;
  }

  if (state.step === 'date') {
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
      ctx.reply('Невірний формат. Приклад: 25.10.2026');
      return;
    }
    const date = parseDate(text);
    if (!date) {
      ctx.reply('Такої дати не існує 🤔 Перевірте день і місяць. Приклад: 25.10.2026');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      ctx.reply('Ця дата вже минула. Введіть дату від сьогодні. Приклад: 25.10.2026');
      return;
    }
    state.data.date = text;
    state.step = 'time';
    ctx.reply('🕒 Крок 3/4. Введіть час початку у форматі ГГ:ХХ (наприклад, 14:30):');
    return;
  }

  if (state.step === 'time') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) {
      ctx.reply('Невірний формат. Приклад: 14:30');
      return;
    }
    const [dd, mm, yyyy] = state.data.date.split('.').map(Number);
    const [hh, min] = text.split(':').map(Number);
    if (new Date(yyyy, mm - 1, dd, hh, min) <= new Date()) {
      ctx.reply('Цей час уже минув. Введіть майбутній час. Приклад: 14:30');
      return;
    }
    state.data.time = text;
    state.step = 'duration';
    ctx.reply('⏱ Крок 4/4. Тривалість зйомки в годинах (від 1 до 8):');
    return;
  }

  if (state.step === 'duration') {
    const hours = Number(text);
    if (!Number.isInteger(hours) || hours < 1 || hours > 8) {
      ctx.reply('Введіть ціле число від 1 до 8.');
      return;
    }
    state.data.duration = hours;
    state.step = 'confirm';
    const d = state.data;
    ctx.reply(
      'Перевірте заявку:\n\n' +
        `📸 Тип: ${d.type}\n📅 Дата: ${d.date}\n🕒 Час: ${d.time}\n⏱ Тривалість: ${d.duration} год` +
        (comments.has(id) ? `\n📝 Коментар: ${comments.get(id)}` : '') +
        '\n\nВсе вірно?',
      confirmMenu
    );
    return;
  }

  if (state.step === 'confirm') {
    if (text === BTN_CONFIRM) {
      userStates.delete(id);
      comments.delete(id);
      ctx.reply('✅ Заявку прийнято! Фотограф зв’яжеться з вами.', mainMenu);
    } else if (text === BTN_REJECT) {
      userStates.delete(id);
      comments.delete(id);
      ctx.reply('Заявку скасовано.', mainMenu);
    } else {
      ctx.reply('Натисніть одну з кнопок нижче 👇', confirmMenu);
    }
    return;
  }
});

bot.on('message', (ctx) => {
  ctx.reply('Я розумію лише текст 🙂 Скористайся меню або командою /help.', mainMenu);
});

bot.catch((err, ctx) => {
  console.log(`Помилка для ${ctx.updateType}:`, err);
  ctx.reply('Ой, щось пішло не так. Спробуй ще раз.').catch((replyErr) => {
    console.log('Не вдалося надіслати повідомлення про помилку:', replyErr);
  });
});

bot.telegram.setMyCommands([
  { command: 'start', description: 'Почати роботу з ботом' },
  { command: 'book', description: 'Подати заявку на фотозйомку' },
  { command: 'group', description: 'Підказка щодо формату зйомки' },
  { command: 'comment', description: 'Коментар до заявки' },
  { command: 'profile', description: 'Як фотограф зв’яжеться з вами' },
  { command: 'status', description: 'Статус моєї заявки' },
  { command: 'help', description: 'Список команд' },
  { command: 'cancel', description: 'Скасувати поточний діалог' }
]).catch((err) => console.log('Не вдалося встановити список команд:', err));

bot.launch().catch((err) => console.log('Не вдалося запустити бота:', err));
console.log('Бот запущено...');