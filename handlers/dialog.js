const { Markup } = require('telegraf');
const { BUTTONS, TYPES, mainMenu, typeMenu, confirmMenu } = require('../keyboards');
const { userStates, comments } = require('../state');
const { MAX_HOURS } = require('../config');
const { parseNumber, parseDate, isNonEmpty } = require('../utils/validators');
const { saveUser, deleteBooking } = require('../storage');
const format = require('../utils/format');

module.exports = (bot) => {
  bot.on('text', (ctx) => {
    const id = ctx.from.id;
    const state = userStates.get(id);

    if (!state) {
      ctx.reply('Я не зрозумів це повідомлення 🤔 Скористайся меню або командою /help.', mainMenu);
      return;
    }

    const text = ctx.message.text.trim();
    if (state.step === 'confirm_delete') {
  if (text.toLowerCase() !== 'так') {
    ctx.reply('Не зрозумів. Напиши «так» для видалення або /cancel.');
    return;
  }
  userStates.delete(id);
  try {
    let record = deleteBooking(state.recordId);
    if (record === null) {
      ctx.reply(format.NOT_FOUND_TEXT);
      return;
    }
    ctx.reply('Видалено: ' + format.formatBooking(record));
  } catch (error) {
    console.error('delete:', error.message);
    ctx.reply(format.SAVE_FAILED_TEXT);
  }
  return;
}
    if (state.step === 'reg_name') {
      if (!isNonEmpty(text) || text.length > 50) {
        ctx.reply('Введіть ім’я (до 50 символів).');
        return;
      }
      state.data.name = text;
      state.step = 'reg_role';
      ctx.reply('Крок 2/2. Ваша роль (наприклад: клієнт або фотограф):');
      return;
    }
    if (state.step === 'reg_role') {
      if (!isNonEmpty(text) || text.length > 30) {
        ctx.reply('Введіть роль (до 30 символів).');
        return;
      }
      state.data.role = text;
      const ok = saveUser(id, state.data.name, state.data.role);
      userStates.delete(id);
      if (!ok) {
        ctx.reply('Не вдалося зберегти дані. Спробуй пізніше.', mainMenu);
        return;
      }
      ctx.reply(`Зареєстровано: ${state.data.name}, ${state.data.role}.`, mainMenu);
      return;
    }
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
      ctx.reply(`⏱ Крок 4/4. Тривалість зйомки в годинах (від 1 до ${MAX_HOURS}):`);
      return;
    }

    if (state.step === 'duration') {
      const hours = parseNumber(text);
      if (hours === null || !Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS) {
        ctx.reply(`Введіть ціле число від 1 до ${MAX_HOURS}.`);
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
      if (text === BUTTONS.confirm) {
        userStates.delete(id);
        comments.delete(id);
        ctx.reply('✅ Заявку прийнято! Фотограф зв’яжеться з вами.', mainMenu);
      } else if (text === BUTTONS.reject) {
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
};
