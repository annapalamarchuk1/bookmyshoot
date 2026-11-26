let fs = require('fs');
let validators = require('./validators');
let { MAX_HOURS } = require('../config');

function readCsvFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function splitLine(line, separator) {
  let cells = line.split(separator);
  let result = [];
  for (let cell of cells) {
    result.push(cell.trim());
  }
  return result;
}

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);  
  }
  let lines = text.split('\n');
  let separator = ',';
  if (lines[0].includes(';')) {
    separator = ';';       
  }
  let rows = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();   
    if (line === '') {
      continue;                 
    }
    rows.push({ lineNumber: i + 1, cells: splitLine(line, separator) });
  }
  return rows;
}

function bookingsFromCsv(text) {
  let rows = parseCsv(text);
  let good = [];
  let errors = [];
  for (let i = 1; i < rows.length; i++) {   
    let row = rows[i];
    if (row.cells.length < 4) {
      errors.push('Рядок ' + row.lineNumber + ': має бути чотири стовпці (дата, час, тип, годин)');
      continue;
    }
    let startsAt = validators.parseDateTime(row.cells[0], row.cells[1]);
    let type = row.cells[2];
    let duration = validators.parseNumber(row.cells[3]);
    if (startsAt === null) {
      errors.push('Рядок ' + row.lineNumber + ': дата «' + row.cells[0] + '» або час «' + row.cells[1] + '» некоректні');
      continue;
    }
    if (!type || type.length > 30) {
      errors.push('Рядок ' + row.lineNumber + ': тип порожній або довший за 30 символів');
      continue;
    }
    if (duration === null || duration <= 0 || duration > MAX_HOURS) {
      errors.push('Рядок ' + row.lineNumber + ': тривалість «' + row.cells[3] + '» має бути числом від 0 до ' + MAX_HOURS);
      continue;
    }
    good.push({ startsAt: startsAt, type: type, duration: duration });
  }
  return { good: good, errors: errors };
}

module.exports = { readCsvFile, parseCsv, bookingsFromCsv };