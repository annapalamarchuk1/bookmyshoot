function calcStats(records) {
  if (records.length === 0) {
    return null;
  }
  let sum = 0;
  let min = records[0].duration;  
  let max = records[0].duration;
  for (let record of records) {
    sum = sum + record.duration;
    if (record.duration < min) { min = record.duration; }
    if (record.duration > max) { max = record.duration; }
  }
  return { count: records.length, min: min, max: max, avg: sum / records.length };
}

function groupByType(records) {
  let groups = {};
  for (let record of records) {
    if (groups[record.type] === undefined) {
      groups[record.type] = [];
    }
    groups[record.type].push(record);
  }
  return groups;
}

function topByDuration(records, count) {
  let rest = records.slice();  
  let result = [];
  while (result.length < count && rest.length > 0) {
    let maxIndex = 0;
    for (let i = 1; i < rest.length; i++) {
      if (rest[i].duration > rest[maxIndex].duration) {
        maxIndex = i;
      }
    }
    result.push(rest[maxIndex]);
    rest.splice(maxIndex, 1);  
  }
  return result;
}

module.exports = { calcStats, groupByType, topByDuration };