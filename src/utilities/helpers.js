// helpers.js — safe HTML templating, formatting, toasts, recap image export.

const TIME_ZONE = 'Africa/Nairobi';

/* ---------- Safe HTML templating ---------------------------------------- */
// html`` escapes every interpolated value unless it is already Safe.
// User-submitted text (team names, recaps) can therefore never inject markup.

export class Safe {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export const raw = (value) => new Safe(String(value ?? ''));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

function toText(value) {
  if (value == null || value === false || value === true) return '';
  if (value instanceof Safe) return value.value;
  if (Array.isArray(value)) return value.map(toText).join('');
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += toText(values[i]) + strings[i + 1];
  return new Safe(out);
}

/* ---------- Small utilities --------------------------------------------- */
export const sum = (list) => list.reduce((total, n) => total + (Number(n) || 0), 0);

export function groupBy(list, keyFn) {
  const groups = new Map();
  for (const item of list) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

export const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function totalRuns(match) {
  if (!match.innings) return null;
  return { away: sum(match.innings.away), home: sum(match.innings.home) };
}

export function formatPct(value, played) {
  if (!played) return '—';
  return value >= 1 ? '1.000' : value.toFixed(3).replace(/^0/, '');
}

export function formatRecord({ w, l, t }) {
  return t ? `${w}-${l}-${t}` : `${w}-${l}`;
}

/* ---------- Dates (always shown in Nairobi time) ------------------------- */
function makeFormatter(options) {
  try { return new Intl.DateTimeFormat('en-KE', { timeZone: TIME_ZONE, ...options }); }
  catch { return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, ...options }); }
}

const shortDate = makeFormatter({ weekday: 'short', day: 'numeric', month: 'short' });
const longDate = makeFormatter({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeOnly = makeFormatter({ hour: 'numeric', minute: '2-digit', hour12: true });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });

export const formatDate = (iso) => shortDate.format(new Date(iso));
export const formatDateLong = (iso) => longDate.format(new Date(iso));
export const formatTime = (iso) => timeOnly.format(new Date(iso));
export const dayKey = (iso) => dayKeyFmt.format(new Date(iso));

/* ---------- Toasts ------------------------------------------------------- */
export function toast(message, { type = 'info', timeout = 4500 } = {}) {
  const region = document.getElementById('toasts');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  region.append(el);
  setTimeout(() => el.remove(), timeout);
}

/* ---------- Recap image export ------------------------------------------- */
// Draws a clean 1080x1080 graphic from a submitted score so teams can post it
// to WhatsApp or Facebook straight away. Uses the native share sheet when the
// device offers one, otherwise downloads a PNG.

function fitText(ctx, text, maxWidth, startSize, family, weight = 800) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 24) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

export async function exportRecapImage({ match, ref }) {
  const away = ref.teams[match.awayId];
  const home = ref.teams[match.homeId];
  const league = ref.leagues[match.leagueId];
  const runs = totalRuns(match);
  if (!runs) throw new Error('This game has no result yet.');

  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');

  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim() || '#000';
  const display = css.getPropertyValue('--font-display').trim() || 'sans-serif';
  const body = css.getPropertyValue('--font-body').trim() || 'sans-serif';
  const ink = token('--ink');
  const stitch = token('--stitch');
  const chalk = token('--chalk');
  const faint = token('--ink-faint');
  const soft = token('--ink-soft');
  const muted = token('--board-muted');

  g.fillStyle = token('--paper');
  g.fillRect(0, 0, W, H);

  // Header band
  g.fillStyle = ink;
  g.fillRect(0, 0, W, 200);
  g.fillStyle = '#fff';
  g.font = `800 54px ${display}`;
  g.fillText('Baseball Kenya', 60, 94);
  g.fillStyle = muted;
  g.font = `600 30px ${body}`;
  g.fillText(league?.name ?? '', 60, 148);
  g.textAlign = 'right';
  g.fillText(formatDateLong(match.date), W - 60, 148);
  g.textAlign = 'left';

  // The seam
  g.strokeStyle = stitch;
  g.lineWidth = 6;
  g.setLineDash([22, 14]);
  g.beginPath();
  g.moveTo(0, 203);
  g.lineTo(W, 203);
  g.stroke();
  g.setLineDash([]);

  // Score rows (away on top, as in a scorebook)
  const rows = [[away, runs.away], [home, runs.home]];
  rows.forEach(([team, score], i) => {
    const y = 350 + i * 165;
    const won = runs.away !== runs.home && score === Math.max(runs.away, runs.home);
    g.fillStyle = team.color;
    g.beginPath();
    g.arc(112, y - 30, 44, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `800 32px ${display}`;
    g.textAlign = 'center';
    g.fillText(team.short, 112, y - 18);
    g.textAlign = 'left';
    g.fillStyle = won ? ink : faint;
    fitText(g, team.name, 600, 62, display);
    g.fillText(team.name, 190, y - 10);
    g.textAlign = 'right';
    g.font = `800 132px ${display}`;
    g.fillText(String(score), W - 60, y + 34);
    g.textAlign = 'left';
  });

  // Status
  const verified = match.status === 'final';
  g.font = `700 28px ${body}`;
  g.fillStyle = verified ? token('--pitch') : token('--amber');
  g.fillText(verified ? 'Final, verified by the federation' : 'Final, awaiting verification', 60, 560);

  // Line score
  const top = 590;
  const rowH = 64;
  const nameW = 200;
  const cell = 64;
  const innings = match.innings.away.length;
  const totalsX = 60 + nameW + cell * innings;
  g.fillStyle = chalk;
  g.fillRect(60, top, W - 120, rowH);
  g.font = `700 26px ${display}`;
  g.fillStyle = soft;
  g.textAlign = 'center';
  for (let i = 0; i < innings; i++) g.fillText(String(i + 1), 60 + nameW + cell * i + cell / 2, top + 42);
  ['R', 'H', 'E'].forEach((label, j) => g.fillText(label, totalsX + 84 * j + 42, top + 42));

  [[away, 'away', runs.away], [home, 'home', runs.home]].forEach(([team, side, total], r) => {
    const y = top + rowH * (r + 1);
    g.strokeStyle = token('--line');
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(60, y);
    g.lineTo(W - 60, y);
    g.stroke();
    g.fillStyle = ink;
    g.font = `800 30px ${display}`;
    g.textAlign = 'left';
    g.fillText(team.short, 76, y + 43);
    g.textAlign = 'center';
    g.font = `600 30px ${display}`;
    match.innings[side].forEach((n, i) => g.fillText(String(n), 60 + nameW + cell * i + cell / 2, y + 43));
    g.font = `800 32px ${display}`;
    [total, match.hits?.[side] ?? 0, match.errors?.[side] ?? 0].forEach((n, j) =>
      g.fillText(String(n), totalsX + 84 * j + 42, y + 43));
  });
  g.textAlign = 'left';

  // Recap text
  if (match.recap) {
    g.fillStyle = soft;
    g.font = `400 30px ${body}`;
    wrapLines(g, match.recap, W - 120, 3).forEach((line, i) => g.fillText(line, 60, 875 + i * 42));
  }

  g.fillStyle = faint;
  g.font = `600 24px ${body}`;
  g.textAlign = 'center';
  g.fillText('Fixtures, scores and standings for Kenyan baseball', W / 2, 1040);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create the image on this device.');
  const name = `${away.short}-at-${home.short}-${match.date.slice(0, 10)}.png`.toLowerCase();
  const file = new File([blob], name, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${away.name} at ${home.name}` });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
