const { Markup } = require('telegraf');

const BUTTONS = {
  book: '📅  Записатись',
  status: '📊  Статус заявки',
  help: '❓ Допомога',
  confirm: '✅ Підтвердити',
  reject: '❌ Скасувати',
};

const TYPES = ['Портрет', 'Сімейна', 'Love story', 'Подія'];

const mainMenu = Markup.keyboard([
  [BUTTONS.book, BUTTONS.status],
  [BUTTONS.help],
]).resize();

const typeMenu = Markup.keyboard([TYPES.slice(0, 2), TYPES.slice(2)]).resize();
const confirmMenu = Markup.keyboard([[BUTTONS.confirm, BUTTONS.reject]]).resize();

module.exports = { BUTTONS, TYPES, mainMenu, typeMenu, confirmMenu };
