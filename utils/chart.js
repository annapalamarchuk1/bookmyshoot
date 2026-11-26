let png = require('./png');
let BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
function clock(time) {
  return new Date(time).toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hour12: false });
}

function sparkline(values) {
  if (values.length === 0) {
    return '';
  }
  let min = values[0];
  let max = values[0];
  for (let value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  let text = '';
  for (let value of values) {
    let level = 3;
    if (max > min) {
      level = Math.round((value - min) / (max - min) * 7);
    }
    text = text + BLOCKS[level];
  }
  return text;
}
function downsample(points, maxPoints) {
  if (points.length <= maxPoints) {
    return points;
  }
  let size = Math.ceil(points.length / maxPoints);
  let result = [];
  for (let start = 0; start < points.length; start = start + size) {
    let sumTime = 0;
    let sumValue = 0;
    let count = 0;
    for (let i = start; i < start + size && i < points.length; i++) {
      sumTime = sumTime + points[i].time;
      sumValue = sumValue + points[i].value;
      count = count + 1;
    }
    result.push({ time: sumTime / count, value: sumValue / count });
  }
  return result;
}
function makeView(points, plot) {
  let tMin = points[0].time;
  let tMax = points[points.length - 1].time;
  let vMin = points[0].value;
  let vMax = points[0].value;
  for (let point of points) {
    if (point.value < vMin) {
      vMin = point.value;
    }
    if (point.value > vMax) {
      vMax = point.value;
    }
  }
  let padding = (vMax - vMin) * 0.05;
  if (padding === 0) {
    padding = 1;
  }
  return { tMin: tMin, tMax: tMax, vMin: vMin - padding, vMax: vMax + padding,
           left: plot.left, top: plot.top, width: plot.width, height: plot.height };
}
function toX(view, time) {
  if (view.tMax === view.tMin) {
    return view.left;
  }
  return Math.round(view.left + (time - view.tMin) / (view.tMax - view.tMin) * view.width);
}
function toY(view, value) {
  return Math.round(view.top + view.height - (value - view.vMin) / (view.vMax - view.vMin) * view.height);
}
let WHITE = [255, 255, 255];
let GRAY = [225, 225, 225];
let DARK = [60, 60, 60];
let BLUE = [28, 114, 147];
let GREEN = [46, 160, 90];
let RED = [200, 60, 60];
let AMBER = [242, 166, 90];
function buildLineChart(points, limits) {
  let width = 640;
  let height = 360;
  let canvas = png.createCanvas(width, height, WHITE);
  let view = makeView(points, { left: 70, top: 20, width: width - 70 - 20, height: height - 20 - 45 });
  let bottom = view.top + view.height;
  let right = view.left + view.width;
  for (let i = 0; i <= 4; i++) {
    let value = view.vMin + (view.vMax - view.vMin) * i / 4;
    let y = toY(view, value);
    png.drawLine(canvas, view.left, y, right, y, GRAY, 1);
    let label = value.toFixed(1);
    png.drawText(canvas, label, view.left - 8 - png.textWidth(label, 2), y - 5, DARK, 2);
  }
  for (let limit of [limits.min, limits.max]) {
    if (limit > view.vMin && limit < view.vMax) {
      let y = toY(view, limit);
      for (let x = view.left; x < right; x = x + 14) {
        png.drawLine(canvas, x, y, Math.min(x + 7, right), y, AMBER, 2);
      }
    }
  }
  png.drawLine(canvas, view.left, view.top, view.left, bottom, DARK, 2);
  png.drawLine(canvas, view.left, bottom, right, bottom, DARK, 2);
  let startLabel = clock(view.tMin);
  let middleLabel = clock((view.tMin + view.tMax) / 2);
  let endLabel = clock(view.tMax);
  png.drawText(canvas, startLabel, view.left, bottom + 12, DARK, 2);
  png.drawText(canvas, middleLabel, Math.round((view.left + right) / 2 - png.textWidth(middleLabel, 2) / 2), bottom + 12, DARK, 2);
  png.drawText(canvas, endLabel, right - png.textWidth(endLabel, 2), bottom + 12, DARK, 2);
  for (let i = 1; i < points.length; i++) {
    png.drawLine(canvas, toX(view, points[i - 1].time), toY(view, points[i - 1].value),
      toX(view, points[i].time), toY(view, points[i].value), BLUE, 2);
  }
  if (points.length <= 60) {
    for (let point of points) {
      png.fillRect(canvas, toX(view, point.time) - 2, toY(view, point.value) - 2, 5, 5, BLUE);
    }
  }
  let minPoint = points[0];
  let maxPoint = points[0];
  for (let point of points) {
    if (point.value < minPoint.value) {
      minPoint = point;
    }
    if (point.value > maxPoint.value) {
      maxPoint = point;
    }
  }
  png.fillRect(canvas, toX(view, minPoint.time) - 4, toY(view, minPoint.value) - 4, 9, 9, GREEN);
  png.fillRect(canvas, toX(view, maxPoint.time) - 4, toY(view, maxPoint.value) - 4, 9, 9, RED);
  return canvas;
}
function chartToPng(points, limits) {
  return png.encodePng(
    buildLineChart(points, limits));
}

module.exports = { sparkline, downsample, makeView, toX, toY, buildLineChart, chartToPng };