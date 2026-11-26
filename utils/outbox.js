function addToQueue(queue, reading, maxSize) {
  queue.push(reading);
  let dropped = 0;
  while (queue.length > maxSize) {
    queue.shift();
    dropped = dropped + 1;
  }
  return dropped;
}
function isPermanent(error) {
  return error.status >= 400 && error.status < 500 && error.status !== 401;
}
async function flushQueue(queue, send) {
  let result = { sent: 0, dropped: 0, left: 0, error: null };
  while (queue.length > 0) {
    try {
      await send(queue[0]);
      queue.shift();                     
      result.sent = result.sent + 1;
    } catch (error) {
      if (isPermanent(error)) {
        queue.shift();                    
        result.dropped = result.dropped + 1;
      } else {
        result.error = error.message;     
        break;
      }
    }
  }
  result.left = queue.length;
  return result;
}
module.exports = { addToQueue, isPermanent, flushQueue };