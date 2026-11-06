// The arithmetic behind every chart: round axis steps and a straight-line mapping from values to pixels.

// Round numbers for an axis that covers min..max in about `count` steps: 0, 5K, 10K, 15K…
export const niceTicks = (min: number, max: number, count = 4): number[] => {
  if (min === max) {
    const pad = Math.abs(min) || 1;
    return niceTicks(Math.min(0, min - pad), max + pad, count);
  }
  const rough = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const error = rough / power;
  const step = power * (error >= 7.5 ? 10 : error >= 3.5 ? 5 : error >= 1.5 ? 2 : 1);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = start; tick <= end + step / 2; tick += step) ticks.push(Math.abs(tick) < step / 1e6 ? 0 : tick);
  return ticks;
};

export const linear = ([d0, d1]: [number, number], [r0, r1]: [number, number]) => {
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
};

// A smooth line through the points that never overshoots them (monotone cubic), so a curve between
// two months can't suggest a peak that didn't happen.
export const smoothPath = (points: [number, number][]) => {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0]![0]},${points[0]![1]}`;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) slopes.push((points[i + 1]![1] - points[i]![1]) / (points[i + 1]![0] - points[i]![0] || 1));
  const tangents: number[] = [slopes[0]!];
  for (let i = 1; i < n - 1; i++) tangents.push(slopes[i - 1]! * slopes[i]! <= 0 ? 0 : (slopes[i - 1]! + slopes[i]!) / 2);
  tangents.push(slopes[n - 2]!);
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i]! / slopes[i]!;
    const b = tangents[i + 1]! / slopes[i]!;
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangents[i] = t * a * slopes[i]!;
      tangents[i + 1] = t * b * slopes[i]!;
    }
  }
  let path = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const dx = (x1 - x0) / 3;
    path += `C${x0 + dx},${y0 + dx * tangents[i]!},${x1 - dx},${y1 - dx * tangents[i + 1]!},${x1},${y1}`;
  }
  return path;
};

// Which labels fit along an axis: every one if there's room, else every second, third…
export const labelStep = (count: number, width: number, minGap = 56) => Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / minGap))));
