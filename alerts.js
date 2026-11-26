let config = require('./config');
let format = require('./utils/format');
let broadcaster = require('./broadcast');

function checkBooking(bot, booking) {
  if (booking.duration >= config.ALERT_MIN && booking.duration <= config.ALERT_MAX) {
    return;  
  }

  let text = '⚠ Аномалія: ' + format.formatBooking(booking)
    + '\nДопустима тривалість: від ' + config.ALERT_MIN + ' до ' + config.ALERT_MAX + ' год';

  broadcaster.broadcast(bot, 'alert', text).catch(function (error) {
    console.error('Сповіщення про аномалію:', error.message);
  });
}

module.exports = { checkBooking };