/* ==========================================================================
 * Filament Field Guide — static site application
 * Vanilla JS, zero dependencies, no build step, hash routing.
 *
 * Data contract: data/index.json (list/filter summaries) + per-entity files
 * data/{filaments,manufacturers,plates}/{id}.json + data/glossary.json.
 * Every field is treated as optional: the catalog grows over time and views
 * must render whatever subset of the schema currently exists.
 *
 * All paths are relative so the site works under a GitHub Pages project
 * subpath. All data is injected via DOM text nodes — never HTML strings.
 * ========================================================================== */
'use strict';

/* ==========================================================================
 * 1. DOM helpers
 * ========================================================================== */

/** Create an element. attrs: class, text, dataset, style, on<event>, or any attribute. */
function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const key of Object.keys(attrs)) {
      const v = attrs[key];
      if (v === null || v === undefined || v === false) continue;
      if (key === 'class') node.className = String(v);
      else if (key === 'text') node.textContent = String(v);
      else if (key === 'dataset') Object.assign(node.dataset, v);
      else if (key === 'style') node.setAttribute('style', String(v));
      else if (key.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(key.slice(2), v);
      else if (v === true) node.setAttribute(key, '');
      else node.setAttribute(key, String(v));
    }
  }
  appendKids(node, kids);
  return node;
}

function appendKids(parent, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false || kid === '') continue;
    parent.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}

function frag(...kids) {
  const f = document.createDocumentFragment();
  appendKids(f, kids);
  return f;
}

const txt = (s) => document.createTextNode(String(s));
const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

/* ==========================================================================
 * 2. Formatting helpers (pure)
 * ========================================================================== */

const isNum = (v) => typeof v === 'number' && isFinite(v);

/** "Is there anything worth rendering here?" — empty strings/arrays/objects are not. */
function has(v) {
  if (v === null || v === undefined || v === '') return false;
  if (typeof Node !== 'undefined' && v instanceof Node) {
    // A built DOM node counts as content (fragments must actually contain something).
    return v.nodeType !== Node.DOCUMENT_FRAGMENT_NODE || v.childNodes.length > 0;
  }
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

const EN_DASH = '–';

/** Format a {min,max,recommended} range object. Any part may be missing. */
function fmtRange(r, unit) {
  if (!r || typeof r !== 'object') return '';
  const u = unit ? ' ' + unit : '';
  const { min, max, recommended } = r;
  let span = '';
  if (isNum(min) && isNum(max)) span = `${min}${EN_DASH}${max}${u}`;
  else if (isNum(min)) span = `≥ ${min}${u}`;
  else if (isNum(max)) span = `≤ ${max}${u}`;
  if (isNum(recommended)) {
    return span ? `${span} (rec. ${recommended}${u})` : `${recommended}${u} recommended`;
  }
  return span;
}

function fmtNum(v, unit) {
  if (!isNum(v)) return '';
  return unit ? `${v} ${unit}` : String(v);
}

function fmtPriceKg(price) {
  if (!price) return '';
  const { usd_per_kg_low: lo, usd_per_kg_high: hi } = price;
  if (isNum(lo) && isNum(hi)) return `$${lo}${EN_DASH}$${hi}/kg`;
  if (isNum(lo)) return `from $${lo}/kg`;
  if (isNum(hi)) return `up to $${hi}/kg`;
  return '';
}

function fmtPricePlate(price) {
  if (!price) return '';
  const { usd_low: lo, usd_high: hi } = price;
  if (isNum(lo) && isNum(hi)) return `$${lo}${EN_DASH}$${hi}`;
  if (isNum(lo)) return `from $${lo}`;
  if (isNum(hi)) return `up to $${hi}`;
  return '';
}

const UNIT_SUFFIXES = [
  ['_mm_s', 'mm/s'], ['_g_cm3', 'g/cm³'], ['_mpa', 'MPa'],
  ['_hours', 'h'], ['_pct', '%'], ['_c', '°C'],
];

/** Fallback label when the glossary has no entry for a key. */
function humanizeKey(key) {
  let s = String(key).split('.').pop();
  let unit = '';
  for (const [suffix, u] of UNIT_SUFFIXES) {
    if (s.length > suffix.length && s.endsWith(suffix)) { s = s.slice(0, -suffix.length); unit = u; break; }
  }
  s = s.replace(/_/g, ' ').trim();
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return unit ? `${s} (${unit})` : s;
}

/** Title-case a slug-ish enum value for display. */
function prettyEnum(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (!has(v)) return '';
  const s = String(v).replace(/[-_]/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const anchorId = (key) => 'g-' + String(key).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

/* ==========================================================================
 * 3. Data layer
 * ========================================================================== */

const KIND_OF = { filament: 'filaments', manufacturer: 'manufacturers', plate: 'plates' };
const SINGULAR = { filaments: 'filament', manufacturers: 'manufacturer', plates: 'plate' };

const DATA = {
  index: null,
  glossary: null,          // Map key -> entry
  glossaryList: [],
  entities: new Map(),     // "kind/id" -> entity object
  indexMaps: {},           // kind -> Map id -> summary
};

async function getJSON(path) {
  let res;
  try {
    res = await fetch(path, { cache: 'no-cache' });
  } catch (e) {
    throw new FetchError(path, e && e.message ? e.message : String(e));
  }
  if (!res.ok) throw new FetchError(path, `HTTP ${res.status} ${res.statusText}`);
  try {
    return await res.json();
  } catch (e) {
    throw new FetchError(path, 'response was not valid JSON');
  }
}

class FetchError extends Error {
  constructor(path, detail) {
    super(`Could not load ${path}: ${detail}`);
    this.path = path;
    this.detail = detail;
  }
}

async function loadIndex() {
  if (!DATA.index) {
    const idx = await getJSON('data/index.json');
    DATA.index = idx;
    for (const kind of ['filaments', 'manufacturers', 'plates']) {
      const list = Array.isArray(idx[kind]) ? idx[kind] : [];
      DATA.indexMaps[kind] = new Map(list.map((e) => [e.id, e]));
    }
  }
  return DATA.index;
}

async function loadGlossary() {
  if (!DATA.glossary) {
    let data;
    try {
      data = await getJSON('data/glossary.json');
    } catch (e) {
      // Tooltips are an enhancement — never break a page over a missing glossary.
      DATA.glossary = new Map();
      DATA.glossaryList = [];
      return DATA.glossary;
    }
    const entries = Array.isArray(data && data.entries) ? data.entries : [];
    DATA.glossaryList = entries;
    DATA.glossary = new Map(entries.filter((e) => e && e.key).map((e) => [e.key, e]));
  }
  return DATA.glossary;
}

async function loadEntity(kind, id) {
  const cacheKey = `${kind}/${id}`;
  if (!DATA.entities.has(cacheKey)) {
    DATA.entities.set(cacheKey, await getJSON(`data/${kind}/${encodeURIComponent(id)}.json`));
  }
  return DATA.entities.get(cacheKey);
}

/** Load every entity of a kind (used where index summaries lack a field). */
async function loadAllEntities(kind) {
  const list = (DATA.index && DATA.index[kind]) || [];
  const out = await Promise.all(list.map((s) =>
    loadEntity(kind, s.id).catch(() => null)));
  return out.filter(Boolean);
}

const indexEntry = (kind, id) => (DATA.indexMaps[kind] ? DATA.indexMaps[kind].get(id) : undefined);
const entityExists = (kind, id) => Boolean(indexEntry(kind, id));
const listOf = (kind) => (DATA.index && Array.isArray(DATA.index[kind]) ? DATA.index[kind] : []);

/** Deep get by dotted path; undefined when any hop is missing. */
function pick(obj, path) {
  let cur = obj;
  for (const part of String(path).split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

/* ==========================================================================
 * 4. Glossary tooltips
 * ========================================================================== */

const TIP_DATA = new WeakMap();

const Tooltip = {
  node: null,
  target: null,
  init() {
    this.node = el('div', { id: 'tooltip', role: 'tooltip', hidden: true });
    document.body.appendChild(this.node);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Tooltip.hide(); });
    window.addEventListener('resize', () => Tooltip.hide());
    window.addEventListener('scroll', () => Tooltip.hide(), true);
    document.addEventListener('pointerdown', (e) => {
      if (this.target && !this.target.contains(e.target)) Tooltip.hide();
    }, true);
  },
  show(target) {
    const info = TIP_DATA.get(target);
    if (!info) return;
    clear(this.node);
    this.node.appendChild(tooltipContent(info.entry, info.value));
    this.node.hidden = false;
    this.target = target;
    this.position(target);
    this.markTruncation();
  },
  /** Long glossary prose is line-clamped in CSS; say so and point at the full entry. */
  markTruncation() {
    const clamped = ['.tt-def', '.tt-why'].some((sel) => {
      const n = this.node.querySelector(sel);
      return n && n.scrollHeight > n.clientHeight + 2;
    });
    const hint = this.node.querySelector('.tt-hint');
    if (clamped && hint) hint.textContent = 'Shortened here — click for the full glossary entry';
  },
  position(target) {
    const r = target.getBoundingClientRect();
    const t = this.node.getBoundingClientRect();
    const margin = 8;
    let top = r.bottom + 6;
    if (top + t.height > window.innerHeight - margin) {
      top = Math.max(margin, r.top - t.height - 6);
    }
    let left = r.left;
    if (left + t.width > window.innerWidth - margin) left = window.innerWidth - t.width - margin;
    if (left < margin) left = margin;
    this.node.style.top = `${Math.round(top)}px`;
    this.node.style.left = `${Math.round(left)}px`;
  },
  hide() {
    if (!this.node) return;
    this.node.hidden = true;
    this.target = null;
  },
};

/** Nearest rubric anchor for a score value. */
function rubricAnchor(rubric, value) {
  if (!rubric || !isNum(value)) return null;
  const keys = Object.keys(rubric).map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
  if (!keys.length) return null;
  let best = keys[0];
  for (const k of keys) if (Math.abs(k - value) < Math.abs(best - value)) best = k;
  return { score: best, text: rubric[String(best)], exact: best === Number(value) };
}

function tooltipContent(entry, value) {
  const out = frag(
    el('span', { class: 'tt-term', text: entry.term || entry.key }),
    el('p', { class: 'tt-def', text: entry.definition || '' })
  );
  if (entry.why_it_matters) out.appendChild(el('p', { class: 'tt-why', text: entry.why_it_matters }));
  const meta = [];
  if (entry.units) meta.push(`Units: ${entry.units}`);
  if (Array.isArray(entry.see_also) && entry.see_also.length) meta.push(`See also: ${entry.see_also.join(', ')}`);
  if (meta.length) out.appendChild(el('div', { class: 'tt-meta', text: meta.join(' · ') }));

  const anchor = rubricAnchor(entry.rubric, value);
  if (anchor) {
    out.appendChild(el('div', { class: 'tt-rubric' },
      el('b', { text: anchor.exact ? `At ${anchor.score}/10: ` : `Nearest anchor ${anchor.score}/10: ` }),
      txt(anchor.text)));
  }
  out.appendChild(el('div', { class: 'tt-meta tt-hint', text: 'Click for the full glossary entry' }));
  return out;
}

/** Glossary lookup with progressive fallback: a.b.c -> a.b -> a */
function glossaryFor(key) {
  if (!DATA.glossary) return null;
  const parts = String(key).split('.');
  while (parts.length) {
    const entry = DATA.glossary.get(parts.join('.'));
    if (entry) return entry;
    parts.pop();
  }
  return null;
}

/**
 * A property label with a glossary tooltip and a link to its glossary anchor.
 * Falls back to plain text when no glossary entry exists.
 */
function propLabel(key, opts) {
  const o = opts || {};
  const entry = glossaryFor(key);
  const label = o.label || (entry && entry.term) || humanizeKey(key);
  // No glossary entry: plain text, and nothing at all in icon-only mode.
  if (!entry) return o.iconOnly ? null : el('span', { class: 'lbl-plain', text: label });

  /*
   * iconOnly renders just the "?" affordance, for form labels: there the label
   * text must stay clickable as a label (toggling the control) instead of
   * navigating to the glossary.
   */
  const a = o.iconOnly
    ? el('a', {
      class: 'lbl lbl-icon',
      href: `#/glossary#${anchorId(entry.key)}`,
      'aria-label': `${label}: glossary definition`,
      'aria-describedby': 'tooltip',
    }, el('span', { class: 'lbl-i', 'aria-hidden': 'true' }, '?'))
    : el('a', {
      class: 'lbl',
      href: `#/glossary#${anchorId(entry.key)}`,
      'aria-describedby': 'tooltip',
    }, label, el('span', { class: 'lbl-i', 'aria-hidden': 'true' }, '?'));

  attachTip(a, entry, o.value);
  return a;
}

/** Wire hover/focus/tap tooltip behaviour onto any node. */
function attachTip(node, entry, value) {
  TIP_DATA.set(node, { entry, value });
  node.addEventListener('mouseenter', () => Tooltip.show(node));
  node.addEventListener('mouseleave', () => Tooltip.hide());
  node.addEventListener('focus', () => Tooltip.show(node));
  node.addEventListener('blur', () => Tooltip.hide());
  // Touch: first tap reveals the tooltip, second tap follows the link.
  node.addEventListener('click', (e) => {
    if (window.matchMedia('(hover: none)').matches && Tooltip.target !== node) {
      e.preventDefault();
      Tooltip.show(node);
    }
  });
  return node;
}

/* ==========================================================================
 * 5. Score / badge components
 * ========================================================================== */

/** Scores where 10 is the *bad* end. */
const INVERTED_SCORES = new Set(['warp_tendency']);
const isInverted = (scoreKey) => INVERTED_SCORES.has(String(scoreKey).split('.').pop());

/** good -> bad color ramp; respects inverted scales. */
function scoreColor(value, inverted) {
  if (!isNum(value)) return 'var(--border-strong)';
  const clamped = Math.max(1, Math.min(10, value));
  let n = (clamped - 1) / 9;              // 0 = worst, 1 = best
  if (inverted) n = 1 - n;
  const hue = 4 + n * 128;                // red -> green
  return `hsl(${hue.toFixed(0)} 68% 42%)`;
}

/** Horizontal bar meter for a 1–10 score. */
function scoreMeter(scoreKey, value) {
  const inverted = isInverted(scoreKey);
  const pct = isNum(value) ? Math.max(0, Math.min(100, ((value - 1) / 9) * 100)) : 0;
  const color = scoreColor(value, inverted);
  const meter = el('div', { class: 'meter' },
    el('div', {},
      propLabel(`scores.${String(scoreKey).split('.').pop()}`, { value }),
      inverted ? txt(' ') : null,
      inverted ? el('span', { class: 'inv-tag', title: 'Inverted scale: 10 is worst' }, '10 = worst') : null),
    el('div', {
      class: 'meter-track', role: 'img',
      'aria-label': `${humanizeKey(scoreKey)}: ${isNum(value) ? value : 'unknown'} out of 10`,
    }, el('div', { class: 'meter-fill', style: `width:${pct.toFixed(1)}%;background:${color}` })),
    el('span', { class: 'meter-val', style: `color:${color}`, text: isNum(value) ? `${value}/10` : '—' })
  );
  return meter;
}

/** Compact colored score for table cells. */
function scoreInline(scoreKey, value) {
  if (!isNum(value)) return el('span', { class: 'faint', text: '—' });
  const color = scoreColor(value, isInverted(scoreKey));
  return el('span', { class: 'score-inline' },
    el('span', { class: 'score-dot', style: `background:${color}` }),
    el('span', { text: String(value) }));
}

function badge(text, tone, title) {
  return el('span', { class: `badge badge-${tone || 'neutral'}`, title: title || null, text });
}

/**
 * Badge that doubles as a glossary affordance: hover/tap shows the definition,
 * click opens the glossary entry. Falls back to a plain badge when the key has
 * no glossary entry, so new data never renders a dead link.
 */
function tipBadge(key, text, tone, title, value) {
  const entry = glossaryFor(key);
  if (!entry) return badge(text, tone, title);
  const a = el('a', {
    class: `badge badge-${tone || 'neutral'} tip-badge`,
    href: `#/glossary#${anchorId(entry.key)}`,
    title: title || null,
    'aria-describedby': 'tooltip',
    text,
  });
  return attachTip(a, entry, value);
}

/** Upgrade an already-built badge node into a tooltip trigger for `key`. */
function tipBadgeNode(key, node) {
  if (!node) return null;
  const entry = glossaryFor(key);
  if (!entry) return node;
  return tipBadge(key, node.textContent, (String(node.className).match(/badge-(\w+)/) || [])[1],
    node.getAttribute('title'));
}

function statusBadge(status) {
  if (!has(status)) return null;
  return badge(status, String(status).toLowerCase(), 'Entry maturity');
}

function confidenceBadge(confidence) {
  if (!has(confidence)) return null;
  const b = badge(`confidence: ${confidence}`, String(confidence).toLowerCase(), 'Data confidence');
  return b;
}

/** true when an entry is example/placeholder data. */
const isPlaceholder = (e) =>
  e && (e.status === 'example' ||
    e.confidence === 'placeholder' ||
    pick(e, 'provenance.confidence') === 'placeholder');

function placeholderBanner(entry) {
  if (!isPlaceholder(entry)) return null;
  return el('div', { class: 'banner', role: 'note' },
    el('span', { 'aria-hidden': 'true' }, '⚠'),
    el('div', {},
      el('strong', { text: 'Example data — pending research. ' }),
      txt('The numbers below demonstrate the data model and are not yet source-verified. ' +
        'Treat them as typical published figures, not as an authority.')));
}

const SUIT_ORDER = {
  high_temperature: ['no', 'moderate', 'yes'],
  outdoor: ['no', 'limited', 'yes'],
  food_contact: ['no', 'conditional', 'yes-certified-lines'],
  load_bearing: ['no', 'light', 'moderate', 'high'],
};
const SUIT_SHORT = {
  high_temperature: 'heat', outdoor: 'outdoor',
  food_contact: 'food', load_bearing: 'load',
};

/* --- emissions -------------------------------------------------------- */

const VENT_ORDER = ['optional', 'recommended', 'required'];
const LEVEL_ORDER = ['minimal', 'low', 'moderate', 'high'];

/** Ventilation is the headline: optional = good, recommended = mid, required = alert. */
const ventTone = (v) => ({ optional: 'good', recommended: 'mid', required: 'bad' }[v] || 'neutral');
/** Emission levels: less is better. */
const levelTone = (v) => ({ minimal: 'good', low: 'good', moderate: 'mid', high: 'bad' }[v] || 'neutral');

/* --- damage avoidance (plates) ---------------------------------------- */

/** Worst first: what ruins the plate outranks what merely marks it. */
const SEVERITY_ORDER = ['destroys', 'degrades', 'cosmetic'];
const severityTone = (v) => ({ destroys: 'bad', degrades: 'mid', cosmetic: 'neutral' }[v] || 'neutral');

function severityBadge(v) {
  if (!has(v)) return null;
  return badge(prettyEnum(v), severityTone(v), 'How bad the damage is');
}

/** [['destroys', 6], ['degrades', 4]] — ordered worst first, unknowns last. */
function severityCounts(list) {
  const rows = Array.isArray(list) ? list : [];
  const counts = new Map();
  for (const row of rows) {
    const key = has(row && row.severity) ? row.severity : 'unrated';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const ordered = [];
  for (const key of SEVERITY_ORDER) if (counts.has(key)) ordered.push([key, counts.get(key)]);
  for (const [key, n] of counts) if (!SEVERITY_ORDER.includes(key)) ordered.push([key, n]);
  return ordered;
}

/** Items sorted worst-first for display. */
function sortBySeverity(list) {
  const rank = (row) => {
    const i = SEVERITY_ORDER.indexOf(row && row.severity);
    return i < 0 ? SEVERITY_ORDER.length : i;
  };
  return (Array.isArray(list) ? list.slice() : []).sort((a, b) => rank(a) - rank(b));
}

const destroysItems = (list) => (Array.isArray(list) ? list : [])
  .filter((row) => row && row.severity === 'destroys' && has(row.item))
  .map((row) => row.item);

const AMS_ORDER = ['no', 'conditional', 'yes'];
/** AMS/material-station compatibility: yes = green, conditional = amber, no = red. */
const amsTone = (v) => ({ yes: 'good', conditional: 'mid', no: 'bad' }[v] || 'neutral');

function amsBadge(v) {
  if (!has(v)) return null;
  return badge(`AMS: ${v}`, amsTone(v), 'Compatibility with AMS/MMU-style material stations');
}

const DRIVE_LABELS = {
  any: 'any drive system',
  'direct-drive-recommended': 'direct drive recommended',
  'direct-drive-required': 'direct drive required',
};
const driveTone = (v) => ({ any: 'good', 'direct-drive-recommended': 'mid', 'direct-drive-required': 'bad' }[v] || 'neutral');

function driveBadge(v) {
  if (!has(v)) return null;
  return badge(DRIVE_LABELS[v] || prettyEnum(v), driveTone(v), 'Extruder drive system requirement');
}

function ventilationBadge(v) {
  if (!has(v)) return null;
  return badge(v === 'required' ? 'ventilation required' : `ventilation ${v}`, ventTone(v),
    'Ventilation / filtration guidance while printing');
}

function suitTone(key, value) {
  const order = SUIT_ORDER[key];
  if (!order) return 'neutral';
  const i = order.indexOf(value);
  if (i < 0) return 'neutral';
  if (i === 0) return 'bad';
  if (i === order.length - 1) return 'good';
  return 'mid';
}

function suitabilityBadges(suitability) {
  if (!has(suitability)) return el('span', { class: 'faint', text: '—' });
  const group = el('span', { class: 'badge-group' });
  for (const key of Object.keys(SUIT_ORDER)) {
    const v = suitability[key];
    if (!has(v)) continue;
    group.appendChild(tipBadge(`suitability.${key}`, `${SUIT_SHORT[key]}: ${v}`, suitTone(key, v), humanizeKey(key)));
  }
  return group.childNodes.length ? group : el('span', { class: 'faint', text: '—' });
}

/* ==========================================================================
 * 6. Shared layout components
 * ========================================================================== */

/**
 * Two side-by-side column stacks. Empty columns are dropped rather than left as
 * blank grid tracks (sparse entries like a purge consumable have whole groups
 * of properties that legitimately do not apply).
 */
function twoColumns(left, right) {
  const cols = [left, right]
    .map((items) => items.filter(Boolean))
    .filter((items) => items.length);
  if (!cols.length) return null;
  if (cols.length === 1) return frag(...cols[0]);
  return el('div', { class: 'grid-2' }, ...cols.map((items) => el('div', {}, ...items)));
}

function section(title, titleKey, ...content) {
  const body = content.flat(Infinity).filter(Boolean);
  if (!body.length) return null;
  const head = titleKey
    ? el('h2', {}, propLabel(titleKey, { label: title }))
    : el('h2', { text: title });
  return el('section', { class: 'card' }, head, ...body);
}

/**
 * Key/value table. rows: [key, valueNodeOrString, {value}] — rows with empty
 * values are dropped so partial data renders cleanly.
 */
function kvTable(rows) {
  const body = el('tbody');
  let count = 0;
  for (const row of rows) {
    if (!row) continue;
    const [key, value, opts] = row;
    if (!has(value)) continue;
    count += 1;
    const label = (opts && opts.labelNode) || propLabel(key, { label: opts && opts.label, value: opts && opts.tipValue });
    body.appendChild(el('tr', {},
      el('th', { scope: 'row' }, label),
      el('td', { 'data-label': (opts && opts.label) || humanizeKey(key) },
        value instanceof Node ? value : linkify(value))));
  }
  if (!count) return null;
  return el('div', { class: 'table-wrap' },
    el('table', { class: 'kv responsive-table' }, body));
}

/** Link to another entity when it exists in the index; plain text otherwise. */
function refLink(kind, id, labelOverride) {
  if (!has(id)) return null;
  const entry = indexEntry(kind, id);
  if (entry) {
    return el('a', { href: `#/${SINGULAR[kind]}/${encodeURIComponent(id)}` }, labelOverride || entry.name || id);
  }
  return el('span', { class: 'muted', title: 'No entry in this catalog yet' }, labelOverride || String(id));
}

function refList(kind, ids) {
  if (!Array.isArray(ids) || !ids.length) return null;
  const ul = el('ul', { class: 'taglist' });
  for (const id of ids) ul.appendChild(el('li', {}, refLink(kind, id) || txt(String(id))));
  return ul;
}

function tagList(items) {
  if (!Array.isArray(items) || !items.length) return null;
  const ul = el('ul', { class: 'taglist' });
  for (const item of items) ul.appendChild(el('li', { text: String(item) }));
  return ul;
}

function bulletList(items, className) {
  if (!Array.isArray(items) || !items.length) return null;
  const ul = el('ul', { class: className || null });
  for (const item of items) ul.appendChild(el('li', { text: String(item) }));
  return ul;
}

function externalLink(url, label) {
  if (!has(url)) return null;
  const href = String(url);
  const isMail = /^mailto:/i.test(href);
  return el('a', {
    class: 'ext-link',
    href,
    rel: 'noopener noreferrer',
    target: isMail ? null : '_blank',
  }, label || (isMail ? href.replace(/^mailto:/i, '') : href));
}

/* ---------- URL linkification (text-node scanning, never HTML strings) ---------- */

const URL_RE = /\b(?:https?:\/\/|mailto:)[^\s<>"']+/gi;

/**
 * Trailing sentence punctuation is almost never part of a URL. Closing
 * brackets only count when the URL actually opened them.
 */
function trimUrlTail(url) {
  let end = url.length;
  for (;;) {
    const ch = url[end - 1];
    if (!ch) break;
    if ('.,;:!?'.includes(ch)) { end -= 1; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      const open = { ')': '(', ']': '[', '}': '{' }[ch];
      const slice = url.slice(0, end);
      const opens = slice.split(open).length - 1;
      const closes = slice.split(ch).length - 1;
      if (closes > opens) { end -= 1; continue; }
    }
    if (ch === '"' || ch === "'") { end -= 1; continue; }
    break;
  }
  return url.slice(0, end);
}

/**
 * Turn any http(s)/mailto substrings in a plain string into anchors, keeping
 * the surrounding text as text nodes. Non-URL citations pass through untouched.
 */
function linkify(value) {
  const text = String(value);
  if (!/(?:https?:\/\/|mailto:)/i.test(text)) return txt(text);
  const out = document.createDocumentFragment();
  let last = 0;
  URL_RE.lastIndex = 0;
  let m;
  while ((m = URL_RE.exec(text)) !== null) {
    const raw = m[0];
    const url = trimUrlTail(raw);
    if (!url || /^(?:https?:\/\/|mailto:)$/i.test(url)) continue;
    if (m.index > last) out.appendChild(txt(text.slice(last, m.index)));
    out.appendChild(externalLink(url, url.replace(/^mailto:/i, '')));
    last = m.index + url.length;
  }
  if (last < text.length) out.appendChild(txt(text.slice(last)));
  return out;
}

/** Free prose that may embed URLs. */
const prose = (value) => (has(value) ? linkify(value) : null);

function backCrumb(href, label) {
  return el('nav', { class: 'crumbs no-print' }, el('a', { href }, `← ${label}`));
}

/** "PETG (Polyethylene Terephthalate Glycol)" -> "PETG" — for dense chip lists. */
function shortName(kind, id) {
  const entry = indexEntry(kind, id);
  const name = (entry && entry.name) || String(id);
  return name.split(' (')[0].trim();
}

/** Chip list of entity references using short names; links when the entity exists. */
function refChips(kind, ids, opts) {
  const o = opts || {};
  if (!Array.isArray(ids) || !ids.length) return null;
  const ul = el('ul', { class: 'taglist' });
  for (const id of ids) {
    ul.appendChild(el('li', { title: o.titles ? o.titles[id] || null : null },
      refLink(kind, id, shortName(kind, id)) || txt(String(id))));
  }
  return ul;
}

/**
 * Collapsible block. Open by default when small, collapsed when long, so pages
 * stay scannable as the catalog grows. Uses native <details> (no state to keep).
 */
function collapsible(summaryText, countText, body, opts) {
  const o = opts || {};
  if (!body) return null;
  const d = el('details', { class: 'group' });
  if (o.open) d.setAttribute('open', '');
  d.appendChild(el('summary', {},
    el('span', { class: `group-title${o.tone ? ' rating-' + o.tone : ''}`, text: summaryText }),
    has(countText) ? el('span', { class: 'group-count', text: String(countText) }) : null));
  d.appendChild(el('div', { class: 'group-body' }, body));
  return d;
}

/** Order and display metadata for the two rating vocabularies in the schemas. */
const RATING_ORDER = ['recommended', 'usable', 'usable-with-prep', 'avoid'];
const RATING_LABEL = {
  recommended: 'Recommended',
  usable: 'Usable',
  'usable-with-prep': 'Usable with prep',
  avoid: 'Avoid',
};

/** Group an array of {rating} rows into ordered [rating, rows] pairs. */
function groupByRating(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = has(row.rating) ? row.rating : 'unrated';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const ordered = [];
  for (const key of RATING_ORDER) if (groups.has(key)) ordered.push([key, groups.get(key)]);
  for (const [key, val] of groups) if (!RATING_ORDER.includes(key)) ordered.push([key, val]);
  return ordered;
}

/* ==========================================================================
 * 7. Compare selection (in-memory only — no localStorage)
 * ========================================================================== */

const selection = { filaments: new Set(), plates: new Set() };

function toggleSelection(kind, id, on) {
  if (on) selection[kind].add(id); else selection[kind].delete(id);
}

function compareBar(kind, onChange) {
  const ids = Array.from(selection[kind]);
  const bar = el('div', { class: 'compare-bar no-print' });
  const go = el('a', {
    class: 'btn btn-primary',
    href: `#/compare/${kind}/${ids.map(encodeURIComponent).join(',')}`,
    'aria-disabled': ids.length < 2 ? 'true' : null,
    onclick: (e) => { if (ids.length < 2) e.preventDefault(); },
  }, `Compare (${ids.length})`);
  if (ids.length < 2) go.classList.add('btn-disabled');
  bar.appendChild(go);
  bar.appendChild(el('span', { class: 'result-count', text: ids.length ? ids.join(', ') : 'Select two or more rows to compare' }));
  if (ids.length) {
    bar.appendChild(el('span', { class: 'spacer' }));
    bar.appendChild(el('button', {
      class: 'btn-sm',
      onclick: () => { selection[kind].clear(); onChange(); },
    }, 'Clear'));
  }
  return bar;
}

function selectCheckbox(kind, id, onChange) {
  const cb = el('input', {
    type: 'checkbox',
    'aria-label': `Select ${id} for comparison`,
    dataset: { focusKey: `cmp:${kind}:${id}` },
    onchange: (e) => { toggleSelection(kind, id, e.target.checked); onChange(); },
  });
  cb.checked = selection[kind].has(id);
  return cb;
}

/* ==========================================================================
 * 8. Filter/sort state (encoded in the URL so filtered views are linkable)
 * ========================================================================== */

/**
 * Update the query part of the current hash without triggering a re-route.
 * Values equal to `defaults` are omitted so shared URLs stay short.
 */
/** Hash last written by the app itself; cleared whenever a real render runs. */
let selfHash = null;

function writeParams(route, state, defaults) {
  const params = new URLSearchParams();
  const dflt = defaults || {};
  for (const key of Object.keys(state)) {
    const v = state[key];
    if (v === '' || v === null || v === undefined || v === false) continue;
    if (Array.isArray(v)) {
      const dfltList = dflt[key];
      if (Array.isArray(dfltList) && dfltList.join(',') === v.join(',')) continue;
      if (v.length) params.set(key, v.join(','));
      continue;
    }
    if (v === true) { params.set(key, '1'); continue; }
    if (Object.prototype.hasOwnProperty.call(dflt, key) && v === dflt[key]) continue;
    params.set(key, String(v));
  }
  const qs = params.toString();
  const newHash = `#/${route.parts.join('/')}${qs ? '?' + qs : ''}`;
  if (location.hash !== newHash) {
    // replaceState does not fire hashchange, but record the value anyway so a
    // stray event can never re-render the page over the user's typing.
    selfHash = newHash;
    history.replaceState(null, '', location.pathname + location.search + newHash);
  }
  route.params = params;
}

const paramStr = (p, key, dflt) => (p.has(key) ? p.get(key) : (dflt !== undefined ? dflt : ''));
const paramNum = (p, key, dflt) => {
  const v = p.get(key);
  const n = v === null || v === '' ? NaN : Number(v);
  return isNaN(n) ? (dflt !== undefined ? dflt : null) : n;
};
const paramBool = (p, key) => p.get(key) === '1' || p.get(key) === 'true';
const paramList = (p, key) => (p.get(key) ? p.get(key).split(',').filter(Boolean) : []);

function field(labelText, control, opts) {
  const o = opts || {};
  const wrap = el('div', { class: 'field' });
  const lab = el('label', { class: 'field-label' }, txt(labelText));
  if (control.id) lab.setAttribute('for', control.id);
  wrap.appendChild(lab);
  if (o.key) appendKids(lab, [propLabel(o.key, { label: labelText, iconOnly: true })]);
  wrap.appendChild(control);
  if (o.note) wrap.appendChild(el('span', { class: 'small faint', text: o.note }));
  return wrap;
}

function selectControl(id, options, value, onChange) {
  const sel = el('select', { id, dataset: { focusKey: id }, onchange: (e) => onChange(e.target.value) });
  for (const [val, label] of options) {
    const opt = el('option', { value: val, text: label });
    if (String(val) === String(value)) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

function chipGroup(values, active, onToggle) {
  const wrap = el('div', { class: 'chips' });
  for (const value of values) {
    const on = active.includes(value);
    const label = el('label', { class: `chip${on ? ' on' : ''}` });
    const input = el('input', {
      type: 'checkbox',
      dataset: { focusKey: `chip:${value}` },
      // The chip updates its own styling: filter controls are not re-rendered
      // while the user is working, so nothing else will do it.
      onchange: (e) => { label.classList.toggle('on', e.target.checked); onToggle(value, e.target.checked); },
    });
    input.checked = on;
    appendKids(label, [input, txt(prettyEnum(value))]);
    wrap.appendChild(label);
  }
  return wrap;
}

function rangeControl(id, value, min, max, onChange) {
  const out = el('output', { text: value > min ? `≥ ${value}` : 'any' });
  const input = el('input', {
    type: 'range', id, min: String(min), max: String(max), step: '1', value: String(value),
    dataset: { focusKey: id },
    oninput: (e) => {
      out.textContent = Number(e.target.value) > min ? `≥ ${e.target.value}` : 'any';
      onChange(Number(e.target.value));
    },
  });
  return el('div', { class: 'range-wrap' }, input, el('div', { class: 'small faint' }, out));
}

/**
 * Sortable column header. The label itself keeps its glossary tooltip/link, so
 * sorting also gets an explicit button; clicking anywhere else in the cell sorts.
 */
function sortableHeader(label, key, sortKey, sortDir, onSort, opts) {
  const o = opts || {};
  const active = sortKey === key;
  const th = el('th', {
    class: `sortable${o.num ? ' num' : ''}`,
    scope: 'col',
    'aria-sort': active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none',
    onclick: (e) => { if (e.target.closest('a, button')) return; onSort(key); },
  });
  const sortBtn = el('button', {
    type: 'button',
    class: 'sort-btn',
    dataset: { focusKey: `sort:${key}` },
    'aria-label': `Sort by ${label}${active && sortDir === 'asc' ? ' (descending)' : ''}`,
    onclick: () => onSort(key),
  }, active ? (sortDir === 'asc' ? '↑' : '↓') : '↕');
  th.appendChild(el('span', { class: 'th-inner' },
    o.tipKey ? propLabel(o.tipKey, { label }) : txt(label),
    sortBtn));
  return th;
}

function compareValues(a, b) {
  const aMissing = !has(a) && a !== 0;
  const bMissing = !has(b) && b !== 0;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;   // missing always sorts last
  if (bMissing) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function sortRows(rows, getter, dir) {
  const sorted = rows.slice().sort((x, y) => compareValues(getter(x), getter(y)));
  if (dir === 'desc') {
    // Keep missing values last even when descending.
    const present = sorted.filter((r) => has(getter(r)) || getter(r) === 0).reverse();
    const missing = sorted.filter((r) => !(has(getter(r)) || getter(r) === 0));
    return present.concat(missing);
  }
  return sorted;
}

const matchesText = (needle, haystackParts) => {
  if (!needle) return true;
  const hay = haystackParts.filter(has).join(' · ').toLowerCase();
  return needle.toLowerCase().split(/\s+/).filter(Boolean).every((term) => hay.includes(term));
};

/**
 * Trade-name lists run to hundreds of products per entry, so flatten each one
 * once and reuse it for every keystroke instead of rebuilding on each filter pass.
 */
const TRADE_BLOBS = new Map();

function tradeNameBlob(cacheKey, sources) {
  if (!TRADE_BLOBS.has(cacheKey)) {
    const parts = [];
    for (const list of sources) {
      if (!Array.isArray(list)) continue;
      for (const t of list) {
        if (!t) continue;
        if (has(t.product)) parts.push(t.product);
        if (has(t.manufacturer)) parts.push(t.manufacturer);
      }
    }
    TRADE_BLOBS.set(cacheKey, parts.join(' '));
  }
  return TRADE_BLOBS.get(cacheKey);
}

/** Product names for a plate, from the index summary and the entity if loaded. */
const plateSearchBlob = (summary, entity) =>
  tradeNameBlob(`plate:${summary.id}`, [summary && summary.trade_names, entity && entity.trade_names]);

const tradeNameCount = (entity) => (Array.isArray(entity && entity.trade_names) ? entity.trade_names.length : 0);

/* ==========================================================================
 * 9. Configurable columns + export (CSV / JSON / XML)
 *
 * Every list view renders from a column catalog. Which columns are visible is
 * user-chosen and encoded in the URL (`cols=`), so a column layout is as
 * shareable as a filter. Export writes the CURRENT filtered + sorted rows with
 * the CURRENTLY VISIBLE columns, client-side, with no dependencies.
 * ========================================================================== */

/** Column: { id, label, key?, num?, full?, group, cell(row,ctx), sort(row,ctx), value(row,ctx) } */

const dash = () => el('span', { class: 'faint', text: '—' });
const enumSort = (order, v) => { const i = order.indexOf(v); return i < 0 ? undefined : i; };

function colScore(k, label) {
  const path = `scores.${k}`;
  return {
    id: k, key: path, label, num: true, group: 'Scores',
    cell: (r) => scoreInline(k, pick(r, path)),
    sort: (r) => pick(r, path),
    value: (r) => pick(r, path),
  };
}

function colSuit(k, label) {
  const path = `suitability.${k}`;
  return {
    id: `suit_${k}`, key: path, label, group: 'Suitability',
    cell: (r) => (has(pick(r, path))
      ? tipBadge(path, prettyEnum(pick(r, path)), suitTone(k, pick(r, path))) : null),
    sort: (r) => enumSort(SUIT_ORDER[k], pick(r, path)),
    value: (r) => pick(r, path),
  };
}

function colNum(id, path, label, unit, group, full) {
  return {
    id, key: path, label, num: true, group, full,
    cell: (r) => fmtNum(pick(r, path), unit),
    sort: (r) => pick(r, path),
    value: (r) => pick(r, path),
  };
}

function colRange(id, path, label, unit, group, full) {
  return {
    id, key: path, label, group, full, num: true,
    cell: (r) => fmtRange(pick(r, path), unit),
    sort: (r) => {
      const range = pick(r, path);
      if (!range) return undefined;
      return isNum(range.recommended) ? range.recommended : (isNum(range.min) ? range.min : range.max);
    },
    value: (r) => fmtRange(pick(r, path), unit),
  };
}

function colText(id, path, label, group, full) {
  return {
    id, key: path, label, group, full,
    cell: (r) => pick(r, path),
    sort: (r) => pick(r, path),
    value: (r) => pick(r, path),
  };
}

function colEnum(id, path, label, group, order, toneFn, full) {
  return {
    id, key: path, label, group, full,
    cell: (r) => (has(pick(r, path))
      ? tipBadge(path, prettyEnum(pick(r, path)), toneFn ? toneFn(pick(r, path)) : 'neutral') : null),
    sort: (r) => (order ? enumSort(order, pick(r, path)) : pick(r, path)),
    value: (r) => pick(r, path),
  };
}

function colBool(id, path, label, group, badIsTrue, full) {
  return {
    id, key: path, label, group, full,
    cell: (r) => (pick(r, path) === undefined || pick(r, path) === null ? null
      : badge(pick(r, path) ? 'yes' : 'no', badIsTrue ? (pick(r, path) ? 'mid' : 'good') : (pick(r, path) ? 'good' : 'neutral'))),
    sort: (r) => (pick(r, path) === true ? 1 : pick(r, path) === false ? 0 : undefined),
    value: (r) => (pick(r, path) === undefined || pick(r, path) === null ? '' : (pick(r, path) ? 'yes' : 'no')),
  };
}

const joinList = (v) => (Array.isArray(v) ? v.join(', ') : '');

/* --- filament columns -------------------------------------------------- */

const FILAMENT_COLUMNS = [
  {
    id: 'name', label: 'Name', group: 'Identity', always: true,
    cell: (r) => el('span', {},
      el('a', { href: `#/filament/${encodeURIComponent(r.id)}` }, r.name || r.id),
      filamentFlags(r)),
    sort: (r) => r.name,
    value: (r) => r.name,
  },
  { id: 'id', label: 'ID', group: 'Identity', cell: (r) => el('code', { text: r.id }), sort: (r) => r.id, value: (r) => r.id },
  {
    id: 'polymer_class', key: 'polymer_class', label: 'Class', group: 'Identity',
    cell: (r) => (has(r.polymer_class) ? el('span', { class: 'pill-class', text: prettyEnum(r.polymer_class) }) : null),
    sort: (r) => r.polymer_class, value: (r) => r.polymer_class,
  },
  colText('variation_kind', 'variation_kind', 'Variation kind', 'Identity'),
  {
    id: 'base_type', key: 'base_type', label: 'Base type', group: 'Identity',
    cell: (r) => (has(r.base_type) ? refLink('filaments', r.base_type, shortName('filaments', r.base_type)) : null),
    sort: (r) => r.base_type, value: (r) => r.base_type,
  },
  { id: 'aliases', label: 'Aliases', group: 'Identity', cell: (r) => joinList(r.aliases), sort: (r) => joinList(r.aliases), value: (r) => joinList(r.aliases) },
  { id: 'summary', label: 'Summary', group: 'Identity', cell: (r) => r.summary, sort: (r) => r.summary, value: (r) => r.summary },
  {
    id: 'status', label: 'Status', group: 'Identity',
    cell: (r) => statusBadge(r.status), sort: (r) => r.status, value: (r) => r.status,
  },
  {
    id: 'confidence', key: 'provenance.confidence', label: 'Confidence', group: 'Identity',
    cell: (r) => confidenceBadge(r.confidence || pick(r, 'provenance.confidence')),
    sort: (r) => enumSort(['placeholder', 'low', 'medium', 'high'], r.confidence || pick(r, 'provenance.confidence')),
    value: (r) => r.confidence || pick(r, 'provenance.confidence'),
  },

  colScore('ease_of_print', 'Ease'),
  colScore('dimensional_stability', 'Dim.'),
  colScore('warp_tendency', 'Warp'),
  colScore('layer_adhesion', 'Layers'),
  colScore('compression_strength', 'Compr.'),
  colScore('temperature_tolerance', 'Heat'),
  colScore('uv_tolerance', 'UV'),
  colScore('weather_tolerance', 'Weather'),
  colScore('water_tolerance', 'Water'),

  {
    id: 'price', key: 'price', label: 'Price', num: true, group: 'Price',
    cell: (r) => fmtPriceKg(r.price),
    sort: (r) => pick(r, 'price.usd_per_kg_low'),
    value: (r) => fmtPriceKg(r.price),
  },
  colNum('price_low', 'price.usd_per_kg_low', 'Price low (USD/kg)', null, 'Price'),
  colNum('price_high', 'price.usd_per_kg_high', 'Price high (USD/kg)', null, 'Price'),

  {
    id: 'suitability', label: 'Suitability', group: 'Suitability',
    cell: (r) => (has(r.suitability) ? suitabilityBadges(r.suitability) : null),
    value: (r) => Object.keys(SUIT_ORDER)
      .filter((k) => has(pick(r, `suitability.${k}`)))
      .map((k) => `${k}: ${pick(r, `suitability.${k}`)}`).join('; '),
  },
  colSuit('high_temperature', 'High temp'),
  colSuit('outdoor', 'Outdoor'),
  colSuit('food_contact', 'Food contact'),
  colSuit('load_bearing', 'Load bearing'),

  {
    id: 'ventilation', key: 'emissions.ventilation', label: 'Ventilation', group: 'Emissions',
    cell: (r) => tipBadgeNode('emissions.ventilation', ventilationBadge(pick(r, 'emissions.ventilation'))),
    sort: (r) => enumSort(VENT_ORDER, pick(r, 'emissions.ventilation')),
    value: (r) => pick(r, 'emissions.ventilation'),
  },
  colEnum('voc_level', 'emissions.voc_level', 'VOC level', 'Emissions', LEVEL_ORDER, levelTone),
  colEnum('particulate_level', 'emissions.particulate_level', 'Particulates', 'Emissions', LEVEL_ORDER, levelTone),
  {
    id: 'primary_emissions', key: 'emissions.primary_emissions', label: 'Primary emissions', group: 'Emissions',
    cell: (r) => joinList(pick(r, 'emissions.primary_emissions')),
    value: (r) => joinList(pick(r, 'emissions.primary_emissions')),
  },

  colBool('enclosure', 'enclosure_recommended', 'Enclosure', 'Printing', true),
  colBool('chamber', 'heated_chamber_required', 'Heated chamber', 'Printing', true),
  colBool('hardened_nozzle', 'printing.requires_hardened_nozzle', 'Hardened nozzle', 'Printing', true, true),
  colRange('nozzle_temp', 'printing.nozzle_temp_c', 'Nozzle temp', '°C', 'Printing', true),
  colRange('bed_temp', 'printing.bed_temp_c', 'Bed temp', '°C', 'Printing', true),
  colRange('ambient_temp', 'printing.ambient_temp_c', 'Chamber temp', '°C', 'Printing', true),
  colRange('speed', 'printing.speed_mm_s', 'Speed', 'mm/s', 'Printing', true),

  {
    id: 'ams', key: 'feeding.ams_compatible', label: 'AMS', group: 'Feeding',
    cell: (r) => tipBadgeNode('feeding.ams_compatible', amsBadge(pick(r, 'feeding.ams_compatible'))),
    sort: (r) => enumSort(AMS_ORDER, pick(r, 'feeding.ams_compatible')),
    value: (r) => pick(r, 'feeding.ams_compatible'),
  },
  {
    id: 'drive_system', key: 'feeding.drive_system', label: 'Drive system', group: 'Feeding',
    cell: (r) => tipBadgeNode('feeding.drive_system', driveBadge(pick(r, 'feeding.drive_system'))),
    sort: (r) => enumSort(['any', 'direct-drive-recommended', 'direct-drive-required'], pick(r, 'feeding.drive_system')),
    value: (r) => pick(r, 'feeding.drive_system'),
  },
  colBool('feeding_assistant', 'feeding.feeding_assistant_recommended', 'Feeding assistant', 'Feeding', true),

  colNum('density', 'properties.density_g_cm3', 'Density', 'g/cm³', 'Properties', true),
  colNum('grams_per_100cm3', 'properties.grams_per_100cm3', 'g / 100 cm³', 'g', 'Properties', true),
  colNum('cm3_per_100g', 'properties.cm3_per_100g', 'cm³ / 100 g', 'cm³', 'Properties', true),
  colNum('tg', 'properties.glass_transition_c', 'Tg', '°C', 'Properties', true),
  colNum('hdt', 'properties.heat_deflection_c', 'HDT', '°C', 'Properties', true),
  colNum('max_service', 'properties.max_service_temp_c', 'Max service', '°C', 'Properties', true),
  colRange('tensile', 'properties.tensile_strength_mpa', 'Tensile', 'MPa', 'Properties', true),
  colRange('shrinkage', 'properties.shrinkage_pct', 'Shrinkage', '%', 'Properties', true),
  {
    id: 'shore', key: 'properties.shore_hardness', label: 'Shore hardness', group: 'Properties',
    cell: (r) => (has(r.shore_hardness) ? r.shore_hardness : pick(r, 'properties.shore_hardness')),
    sort: (r) => (has(r.shore_hardness) ? r.shore_hardness : pick(r, 'properties.shore_hardness')),
    value: (r) => (has(r.shore_hardness) ? r.shore_hardness : pick(r, 'properties.shore_hardness')),
  },
  colEnum('hygroscopy', 'storage.hygroscopy', 'Hygroscopy', 'Drying', ['low', 'moderate', 'high', 'extreme'], null, true),
  colEnum('drying_required', 'drying.required_before_use', 'Drying required', 'Drying', ['rarely', 'if-exposed', 'always'], null, true),

  {
    id: 'use_cases', key: 'use_cases.recommended', label: 'Recommended for', group: 'Other',
    cell: (r) => joinList(pick(r, 'use_cases.recommended')),
    value: (r) => joinList(pick(r, 'use_cases.recommended')),
  },
  {
    id: 'trade_names', label: 'Products', group: 'Other', num: true,
    cell: (r) => (tradeNameCount(r) ? String(tradeNameCount(r)) : null),
    sort: (r) => tradeNameCount(r), value: (r) => tradeNameCount(r) || '',
  },
  {
    id: 'alternatives', key: 'alternatives', label: 'Alternatives', group: 'Other', full: true,
    cell: (r) => refChips('filaments', (r.alternatives || []).map((a) => a.filament_id)),
    sort: (r) => (Array.isArray(r.alternatives) ? r.alternatives.length : undefined),
    value: (r) => (r.alternatives || []).map((a) => a.filament_id).join(', '),
  },
];

const FILAMENT_DEFAULT_COLS = ['name', 'polymer_class', 'ease_of_print', 'warp_tendency',
  'temperature_tolerance', 'layer_adhesion', 'dimensional_stability', 'weather_tolerance',
  'price', 'ventilation', 'suitability'];

/** The flag badges under a filament name (kept out of the column cell body). */
function filamentFlags(f) {
  const flags = el('span', { class: 'badge-group' });
  if (f.enclosure_recommended) flags.appendChild(badge('enclosure', 'mid', 'Enclosure recommended'));
  if (f.heated_chamber_required) flags.appendChild(badge('chamber', 'bad', 'Heated chamber required'));
  if (has(f.base_type)) flags.appendChild(badge(`variation of ${f.base_type}`, 'neutral'));
  if (pick(f, 'feeding.drive_system') === 'direct-drive-required') {
    flags.appendChild(badge('direct drive required', 'bad', 'Needs a direct-drive extruder'));
  }
  if (pick(f, 'feeding.ams_compatible') === 'no') flags.appendChild(amsBadge('no'));
  const shore = has(f.shore_hardness) ? f.shore_hardness : pick(f, 'properties.shore_hardness');
  if (has(shore)) flags.appendChild(badge(`Shore ${shore}`, 'neutral', 'Shore hardness'));
  if (pick(f, 'emissions.ventilation') === 'required') flags.appendChild(ventilationBadge('required'));
  const products = tradeNameCount(f);
  if (products) {
    flags.appendChild(badge(`sold as ${products} product${products === 1 ? '' : 's'}`, 'neutral',
      'Manufacturer product names that are this material chemically'));
  }
  if (isPlaceholder(f)) flags.appendChild(badge('example', 'example', 'Example data pending research'));
  return flags.childNodes.length ? el('span', { class: 'sub' }, flags) : null;
}

/* --- manufacturer columns ---------------------------------------------- */

const MANUFACTURER_COLUMNS = [
  {
    id: 'name', label: 'Name', group: 'Identity', always: true,
    cell: (m) => el('span', {},
      el('a', { href: `#/manufacturer/${encodeURIComponent(m.id)}` }, m.name || m.id),
      isPlaceholder(m) ? el('span', { class: 'sub' }, badge('example', 'example', 'Example data pending research')) : null,
      m.summary ? el('span', { class: 'sub', text: m.summary }) : null),
    sort: (m) => m.name, value: (m) => m.name,
  },
  { id: 'id', label: 'ID', group: 'Identity', cell: (m) => el('code', { text: m.id }), sort: (m) => m.id, value: (m) => m.id },
  {
    id: 'brands', label: 'Brands', group: 'Identity',
    cell: (m) => tagList((m.brands || []).slice(0, 8)),
    sort: (m) => (m.brands || []).length, value: (m) => joinList(m.brands),
  },
  {
    id: 'brands_count', label: 'Brand count', group: 'Identity', num: true,
    cell: (m) => String((m.brands || []).length), sort: (m) => (m.brands || []).length,
    value: (m) => (m.brands || []).length,
  },
  {
    id: 'country', key: 'manufacturing_countries', label: 'Made in', group: 'Identity',
    cell: (m) => joinList(m.manufacturing_countries),
    sort: (m) => (m.manufacturing_countries || [])[0], value: (m) => joinList(m.manufacturing_countries),
  },
  colText('hq', 'headquarters_country', 'Headquarters', 'Identity', true),
  {
    id: 'tier', key: 'price_tier', label: 'Price tier', group: 'Identity',
    cell: (m) => (has(m.price_tier) ? badge(m.price_tier, 'neutral') : null),
    sort: (m) => enumSort(['budget', 'mid', 'premium', 'engineering'], m.price_tier),
    value: (m) => m.price_tier,
  },
  {
    id: 'plates', key: 'makes_plates', label: 'Plates', group: 'Products',
    cell: (m) => (m.makes_plates === true ? badge('plates', 'good') : null),
    sort: (m) => (m.makes_plates === true ? 1 : m.makes_plates === false ? 0 : undefined),
    value: (m) => (m.makes_plates === undefined || m.makes_plates === null ? '' : (m.makes_plates ? 'yes' : 'no')),
  },
  {
    id: 'plate_ids', label: 'Plate products', group: 'Products', full: true,
    cell: (m) => refChips('plates', m.plate_ids),
    sort: (m) => (m.plate_ids || []).length, value: (m) => joinList(m.plate_ids),
  },
  {
    id: 'product_lines', label: 'Product lines', group: 'Products', num: true, full: true,
    cell: (m) => (Array.isArray(m.product_lines) ? String(m.product_lines.length) : null),
    sort: (m) => (m.product_lines || []).length,
    value: (m) => (Array.isArray(m.product_lines) ? m.product_lines.length : ''),
  },
  {
    id: 'website', key: 'endpoints.website', label: 'Website', group: 'Products', full: true,
    cell: (m) => {
      const url = pick(m, 'endpoints.website');
      return has(url) ? externalLink(url, trimUrlTail(url)) : null;
    },
    sort: (m) => pick(m, 'endpoints.website'), value: (m) => pick(m, 'endpoints.website'),
  },
  { id: 'summary', label: 'Summary', group: 'Identity', cell: (m) => m.summary, sort: (m) => m.summary, value: (m) => m.summary },
  { id: 'status', label: 'Status', group: 'Identity', cell: (m) => statusBadge(m.status), sort: (m) => m.status, value: (m) => m.status },
  {
    id: 'confidence', key: 'provenance.confidence', label: 'Confidence', group: 'Identity',
    cell: (m) => confidenceBadge(m.confidence || pick(m, 'provenance.confidence')),
    sort: (m) => enumSort(['placeholder', 'low', 'medium', 'high'], m.confidence || pick(m, 'provenance.confidence')),
    value: (m) => m.confidence || pick(m, 'provenance.confidence'),
  },
];

const MANUFACTURER_DEFAULT_COLS = ['name', 'brands', 'country', 'tier', 'plates'];

/* --- plate columns ------------------------------------------------------ */

const PLATE_COLUMNS = [
  {
    id: 'name', label: 'Name', group: 'Identity', always: true,
    cell: (r, ctx) => {
      const entity = ctx.full.get(r.id) || {};
      const flags = el('span', { class: 'badge-group' });
      if (isPlaceholder(r)) flags.appendChild(badge('example', 'example', 'Example data pending research'));
      const soldAs = tradeNameCount(r) || tradeNameCount(entity);
      if (soldAs) {
        flags.appendChild(badge(`sold as ${soldAs}`, 'neutral',
          `${soldAs} vendor product${soldAs === 1 ? '' : 's'} use this surface — searchable by product name`));
      }
      return el('span', {},
        el('a', { href: `#/plate/${encodeURIComponent(r.id)}` }, r.name || r.id),
        flags.childNodes.length ? el('span', { class: 'sub' }, flags) : null,
        r.summary ? el('span', { class: 'sub', text: r.summary }) : null);
    },
    sort: (r) => r.name, value: (r) => r.name,
  },
  { id: 'id', label: 'ID', group: 'Identity', cell: (r) => el('code', { text: r.id }), sort: (r) => r.id, value: (r) => r.id },
  {
    id: 'texture', key: 'texture', label: 'Texture', group: 'Identity',
    cell: (r) => (has(r.texture) ? el('span', { class: 'pill-class', text: prettyEnum(r.texture) }) : null),
    sort: (r) => r.texture, value: (r) => r.texture,
  },
  { id: 'surface', key: 'surface_makeup', label: 'Surface makeup', group: 'Identity', cell: (r) => r.surface_makeup, sort: (r) => r.surface_makeup, value: (r) => r.surface_makeup },
  { id: 'summary', label: 'Summary', group: 'Identity', cell: (r) => r.summary, sort: (r) => r.summary, value: (r) => r.summary },
  {
    id: 'compat', label: 'Filament compatibility', group: 'Compatibility',
    cell: (r, ctx) => plateCompatCell(r, ctx),
    value: (r, ctx) => severityFreeCompat(ctx.full.get(r.id))
      .map(([rating, group]) => `${rating}: ${group.length}`).join('; '),
  },
  {
    id: 'compat_recommended', label: 'Recommended count', group: 'Compatibility', num: true,
    cell: (r, ctx) => String(plateRatingCount(ctx.full.get(r.id), 'recommended')),
    sort: (r, ctx) => plateRatingCount(ctx.full.get(r.id), 'recommended'),
    value: (r, ctx) => plateRatingCount(ctx.full.get(r.id), 'recommended'),
  },
  {
    id: 'compat_avoid', label: 'Avoid count', group: 'Compatibility', num: true,
    cell: (r, ctx) => String(plateRatingCount(ctx.full.get(r.id), 'avoid')),
    sort: (r, ctx) => plateRatingCount(ctx.full.get(r.id), 'avoid'),
    value: (r, ctx) => plateRatingCount(ctx.full.get(r.id), 'avoid'),
  },
  {
    id: 'damage', key: 'damage_avoidance', label: 'Damage risks', group: 'Care',
    cell: (r, ctx) => {
      const counts = severityCounts((ctx.full.get(r.id) || {}).damage_avoidance);
      if (!counts.length) return null;
      const group = el('span', { class: 'badge-group' });
      for (const [sev, n] of counts) group.appendChild(badge(`${sev}: ${n}`, severityTone(sev)));
      return group;
    },
    sort: (r, ctx) => severityCount(ctx.full.get(r.id), 'destroys'),
    value: (r, ctx) => severityCounts((ctx.full.get(r.id) || {}).damage_avoidance)
      .map(([sev, n]) => `${sev}: ${n}`).join('; '),
  },
  {
    id: 'destroys', label: 'Destroys count', group: 'Care', num: true,
    cell: (r, ctx) => String(severityCount(ctx.full.get(r.id), 'destroys')),
    sort: (r, ctx) => severityCount(ctx.full.get(r.id), 'destroys'),
    value: (r, ctx) => severityCount(ctx.full.get(r.id), 'destroys'),
  },
  {
    id: 'temp_limit', key: 'temperature_limits_c', label: 'Temp limit', group: 'Care', num: true,
    cell: (r, ctx) => fmtRange((ctx.full.get(r.id) || {}).temperature_limits_c, '°C'),
    sort: (r, ctx) => {
      const range = (ctx.full.get(r.id) || {}).temperature_limits_c;
      return range ? (isNum(range.max) ? range.max : range.min) : undefined;
    },
    value: (r, ctx) => fmtRange((ctx.full.get(r.id) || {}).temperature_limits_c, '°C'),
  },
  {
    id: 'price', key: 'price', label: 'Price', group: 'Care', num: true,
    cell: (r, ctx) => fmtPricePlate((ctx.full.get(r.id) || {}).price),
    sort: (r, ctx) => pick(ctx.full.get(r.id) || {}, 'price.usd_low'),
    value: (r, ctx) => fmtPricePlate((ctx.full.get(r.id) || {}).price),
  },
  {
    id: 'manufacturers', label: 'Offered by', group: 'Care',
    cell: (r, ctx) => joinList((ctx.full.get(r.id) || {}).manufacturers),
    value: (r, ctx) => joinList((ctx.full.get(r.id) || {}).manufacturers),
  },
  {
    id: 'trade_names', label: 'Products', group: 'Care', num: true,
    cell: (r, ctx) => {
      const n = tradeNameCount(r) || tradeNameCount(ctx.full.get(r.id));
      return n ? String(n) : null;
    },
    sort: (r, ctx) => tradeNameCount(r) || tradeNameCount(ctx.full.get(r.id)),
    value: (r, ctx) => tradeNameCount(r) || tradeNameCount(ctx.full.get(r.id)) || '',
  },
  { id: 'status', label: 'Status', group: 'Identity', cell: (r) => statusBadge(r.status), sort: (r) => r.status, value: (r) => r.status },
  {
    id: 'confidence', key: 'provenance.confidence', label: 'Confidence', group: 'Identity',
    cell: (r) => confidenceBadge(r.confidence || pick(r, 'provenance.confidence')),
    sort: (r) => enumSort(['placeholder', 'low', 'medium', 'high'], r.confidence || pick(r, 'provenance.confidence')),
    value: (r) => r.confidence || pick(r, 'provenance.confidence'),
  },
];

const PLATE_DEFAULT_COLS = ['name', 'texture', 'surface', 'compat'];

const plateCompatList = (entity) => (Array.isArray(entity && entity.filament_compatibility)
  ? entity.filament_compatibility : []);
const severityFreeCompat = (entity) => groupByRating(plateCompatList(entity));
const plateRatingCount = (entity, rating) => plateCompatList(entity).filter((c) => c.rating === rating).length;
const severityCount = (entity, sev) => ((entity && Array.isArray(entity.damage_avoidance))
  ? entity.damage_avoidance.filter((d) => d && d.severity === sev).length : 0);

/** Rating counts plus the specific hit for whatever filament is being filtered on. */
function plateCompatCell(r, ctx) {
  const compat = plateCompatList(ctx.full.get(r.id));
  const cell = el('span', { class: 'badge-group' });
  for (const [rating, group] of groupByRating(compat)) {
    const tone = rating === 'recommended' ? 'good' : rating === 'avoid' ? 'bad' : 'mid';
    cell.appendChild(badge(`${RATING_LABEL[rating] || rating}: ${group.length}`, tone,
      group.map((c) => shortName('filaments', c.filament_id)).join(', ')));
  }
  const target = ctx.state && ctx.state.compat;
  if (target) {
    const hit = compat.find((c) => c.filament_id === target);
    if (hit) {
      cell.appendChild(badge(`${shortName('filaments', target)}: ${RATING_LABEL[hit.rating] || hit.rating}`,
        hit.rating === 'recommended' ? 'good' : hit.rating === 'avoid' ? 'bad' : 'mid', hit.notes || null));
    }
  }
  return cell.childNodes.length ? cell : null;
}

/* --- column plumbing ---------------------------------------------------- */

const COLUMN_CATALOG = {
  filaments: FILAMENT_COLUMNS,
  manufacturers: MANUFACTURER_COLUMNS,
  plates: PLATE_COLUMNS,
};
const DEFAULT_COLUMNS = {
  filaments: FILAMENT_DEFAULT_COLS,
  manufacturers: MANUFACTURER_DEFAULT_COLS,
  plates: PLATE_DEFAULT_COLS,
};

function columnById(kind, id) {
  return (COLUMN_CATALOG[kind] || []).find((c) => c.id === id) || null;
}

/** Resolve the state's column ids to column defs; unknown ids are dropped. */
function activeColumns(kind, ids) {
  const wanted = Array.isArray(ids) && ids.length ? ids : DEFAULT_COLUMNS[kind];
  const cols = wanted.map((id) => columnById(kind, id)).filter(Boolean);
  if (!cols.length) return DEFAULT_COLUMNS[kind].map((id) => columnById(kind, id)).filter(Boolean);
  // The name column carries the link to the entity, so it is never dropped.
  if (!cols.some((c) => c.id === 'name')) cols.unshift(columnById(kind, 'name'));
  return cols;
}

const columnsNeedFull = (cols) => cols.some((c) => c.full);

/** Sort getter for the current sort key, falling back to the name column. */
function columnSorter(kind, sortKey, ctx) {
  const col = columnById(kind, sortKey);
  const target = (col && col.sort) ? col : columnById(kind, 'name');
  return (row) => target.sort(row, ctx);
}

/** Column picker: grouped checkboxes, reflected in the URL like any filter. */
function columnsControl(kind, state, api, opts) {
  const o = opts || {};
  const catalog = COLUMN_CATALOG[kind] || [];
  const activeIds = activeColumns(kind, state.cols).map((c) => c.id);
  const groups = [];
  for (const col of catalog) {
    if (col.always) continue;
    let group = groups.find((g) => g.name === (col.group || 'Other'));
    if (!group) { group = { name: col.group || 'Other', cols: [] }; groups.push(group); }
    group.cols.push(col);
  }

  const body = el('div', { class: 'columns-picker' });
  for (const group of groups) {
    const chips = el('div', { class: 'chips' });
    for (const col of group.cols) {
      const on = activeIds.includes(col.id);
      const label = el('label', { class: `chip${on ? ' on' : ''}`, title: col.full ? 'Loads full entity data' : null });
      const input = el('input', {
        type: 'checkbox',
        dataset: { focusKey: `col:${col.id}` },
        onchange: (e) => {
          label.classList.toggle('on', e.target.checked);
          const current = activeColumns(kind, state.cols).map((c) => c.id);
          const next = e.target.checked
            ? current.concat(current.includes(col.id) ? [] : [col.id])
            : current.filter((id) => id !== col.id);
          if (o.onChange) o.onChange(next); else api.set({ cols: next });
        },
      });
      input.checked = on;
      appendKids(label, [input, txt(col.label), col.full ? el('span', { class: 'chip-note', text: '+' }) : null]);
      chips.appendChild(label);
    }
    body.appendChild(el('div', { class: 'field' },
      el('span', { class: 'field-label', text: group.name }), chips));
  }
  body.appendChild(el('div', { class: 'row-actions' },
    el('button', {
      class: 'btn-sm',
      onclick: () => { if (o.onChange) o.onChange(DEFAULT_COLUMNS[kind].slice()); else api.set({ cols: DEFAULT_COLUMNS[kind].slice() }); },
    }, 'Reset columns'),
    el('span', { class: 'small faint', text: 'Columns marked + load the full entity files.' })));

  return collapsible('Columns', `${activeIds.length} shown`, body, { open: false });
}

/* --- generic table renderer --------------------------------------------- */

/**
 * Render rows through the active column set.
 * opts: { compareKind, ctx }
 */
function dataTable(kind, rows, state, api, opts) {
  const o = opts || {};
  const ctx = o.ctx || {};
  const cols = activeColumns(kind, state.cols);
  const onSort = (key) => api.sortBy(key);

  const head = el('tr', {});
  if (o.compareKind) head.appendChild(el('th', { scope: 'col', class: 'no-print', 'aria-label': 'Compare' }, ''));
  for (const col of cols) {
    head.appendChild(col.sort
      ? sortableHeader(col.label, col.id, state.sort, state.dir, onSort, { num: col.num, tipKey: col.key })
      : el('th', { scope: 'col', class: col.num ? 'num' : null },
        col.key ? propLabel(col.key, { label: col.label }) : txt(col.label)));
  }

  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr', {});
    if (o.compareKind) {
      tr.appendChild(el('td', { class: 'no-print', 'data-label': 'Compare' },
        selectCheckbox(o.compareKind, row.id, api.refresh)));
    }
    for (const col of cols) {
      const content = col.cell ? col.cell(row, ctx) : null;
      tr.appendChild(el('td', {
        class: `${col.num ? 'num ' : ''}${col.id === 'name' ? 'cell-name' : ''}`.trim() || null,
        'data-label': col.label,
      }, has(content) ? content : dash()));
    }
    body.appendChild(tr);
  }
  return el('div', { class: 'table-wrap' },
    el('table', { class: 'responsive-table' }, el('thead', {}, head), body));
}

/* --- export ------------------------------------------------------------- */

/** Text of a value that may be a DOM node built for display. */
function nodeText(v) {
  if (v === null || v === undefined || v === false) return '';
  if (typeof Node !== 'undefined' && v instanceof Node) {
    const items = v.querySelectorAll ? v.querySelectorAll('li') : [];
    if (items.length) return Array.from(items).map((li) => li.textContent.trim()).join('; ');
    return (v.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return String(v);
}

/** Export scalar: never "undefined"/"null" — missing data exports as empty. */
function exportValue(col, row, ctx) {
  let v = col.value ? col.value(row, ctx) : (col.cell ? col.cell(row, ctx) : '');
  if (v === null || v === undefined || v === false) return '';
  if (typeof v === 'number') return isFinite(v) ? v : '';
  if (typeof v === 'object') return nodeText(v);
  return String(v);
}

/** [{ id, name, <field path>: value }] for the given rows and columns. */
function buildExportRecords(kind, rows, cols, ctx) {
  return rows.map((row) => {
    const rec = { id: row.id === undefined ? '' : row.id, name: row.name || '' };
    for (const col of cols) {
      if (col.id === 'name' || col.id === 'id') continue;
      rec[col.key || col.id] = exportValue(col, row, ctx);
    }
    return rec;
  });
}

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCSV(fields, rows) {
  const lines = [fields.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n') + '\r\n';
}

function recordsToCSV(records) {
  const fields = recordFields(records);
  return rowsToCSV(fields, records.map((rec) => fields.map((f) => rec[f])));
}

function recordFields(records) {
  const fields = [];
  for (const rec of records) for (const key of Object.keys(rec)) if (!fields.includes(key)) fields.push(key);
  return fields;
}

const xmlEscape = (v) => String(v === null || v === undefined ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function recordsToXML(rootName, itemName, records) {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>',
    `<${rootName} count="${records.length}" generated="${xmlEscape(new Date().toISOString())}">`];
  for (const rec of records) {
    out.push(`  <${itemName} id="${xmlEscape(rec.id)}">`);
    out.push(`    <name>${xmlEscape(rec.name)}</name>`);
    for (const key of Object.keys(rec)) {
      if (key === 'id' || key === 'name') continue;
      out.push(`    <field path="${xmlEscape(key)}">${xmlEscape(rec[key])}</field>`);
    }
    out.push(`  </${itemName}>`);
  }
  out.push(`</${rootName}>`);
  return out.join('\n') + '\n';
}

function downloadText(filename, mime, text) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename, style: 'display:none' });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 0);
}

const todayStamp = () => new Date().toISOString().slice(0, 10);

/**
 * Export buttons for a list view. `getPayload()` returns the rows and columns
 * that are on screen right now, so the download always matches what is shown.
 */
function exportControl(kind, getPayload) {
  const run = (format) => {
    const { rows, cols, ctx } = getPayload();
    const records = buildExportRecords(kind, rows, cols, ctx);
    const base = `${kind}-${todayStamp()}`;
    if (format === 'csv') downloadText(`${base}.csv`, 'text/csv', recordsToCSV(records));
    else if (format === 'json') downloadText(`${base}.json`, 'application/json', JSON.stringify(records, null, 2) + '\n');
    else downloadText(`${base}.xml`, 'application/xml', recordsToXML(kind, SINGULAR[kind] || 'item', records));
  };
  return el('div', { class: 'export-control row-actions' },
    el('span', { class: 'small faint', text: 'Export view:' }),
    el('button', { class: 'btn-sm', dataset: { export: 'csv' }, onclick: () => run('csv') }, 'CSV'),
    el('button', { class: 'btn-sm', dataset: { export: 'json' }, onclick: () => run('json') }, 'JSON'),
    el('button', { class: 'btn-sm', dataset: { export: 'xml' }, onclick: () => run('xml') }, 'XML'));
}

/* ==========================================================================
 * 10. View: filament list
 * ========================================================================== */

/** Values that are never written into the URL (they are the implicit state). */
const FILAMENT_DEFAULTS = { ease: 1, temp: 1, sort: 'name', dir: 'asc', cols: FILAMENT_DEFAULT_COLS };
const LIST_DEFAULTS = { sort: 'name', dir: 'asc', cols: MANUFACTURER_DEFAULT_COLS };
const PLATE_DEFAULTS = { sort: 'name', dir: 'asc', rating: 'recommended', cols: PLATE_DEFAULT_COLS };

function readFilamentState(p) {
  return {
    q: paramStr(p, 'q'),
    cls: paramList(p, 'cls'),
    ease: paramNum(p, 'ease', 1),
    temp: paramNum(p, 'temp', 1),
    ht: paramStr(p, 'ht'),
    out: paramStr(p, 'out'),
    food: paramStr(p, 'food'),
    load: paramStr(p, 'load'),
    enc: paramBool(p, 'enc'),
    chamber: paramBool(p, 'chamber'),
    base: paramBool(p, 'base'),
    maxp: paramNum(p, 'maxp', null),
    vent: paramStr(p, 'vent'),
    ams: paramStr(p, 'ams'),
    sort: paramStr(p, 'sort', 'name'),
    dir: paramStr(p, 'dir', 'asc'),
    cols: paramList(p, 'cols'),
  };
}

function filterFilaments(rows, s) {
  return rows.filter((f) => {
    if (!matchesText(s.q, [
      f.name, f.id, f.summary, f.variation_kind, f.polymer_class,
      (f.aliases || []).join(' '),
      (pick(f, 'use_cases.recommended') || []).join(' '),
      (pick(f, 'use_cases.not_recommended') || []).join(' '),
      // brand/product names: "ninjaflex" should find tpu-85a
      (f.trade_names || []).map((t) => `${t.product || ''} ${t.manufacturer || ''}`).join(' '),
    ])) return false;
    if (s.cls.length && !s.cls.includes(f.polymer_class)) return false;
    if (s.ease > 1) { const v = pick(f, 'scores.ease_of_print'); if (!isNum(v) || v < s.ease) return false; }
    if (s.temp > 1) { const v = pick(f, 'scores.temperature_tolerance'); if (!isNum(v) || v < s.temp) return false; }
    for (const [key, want] of [['high_temperature', s.ht], ['outdoor', s.out], ['food_contact', s.food], ['load_bearing', s.load]]) {
      if (!want) continue;
      const order = SUIT_ORDER[key];
      const have = pick(f, `suitability.${key}`);
      if (order.indexOf(have) < order.indexOf(want)) return false;
    }
    if (s.enc && f.enclosure_recommended !== true) return false;
    if (s.chamber && f.heated_chamber_required !== true) return false;
    if (s.base && has(f.base_type)) return false;
    if (isNum(s.maxp)) {
      const lo = pick(f, 'price.usd_per_kg_low');
      if (!isNum(lo) || lo > s.maxp) return false;
    }
    if (s.vent) {
      // optional/recommended are "at most this much ventilation" (optional <=
      // recommended <= required); 'required' is an exact match, since "at most
      // required" would match everything and be a dead option.
      const have = pick(f, 'emissions.ventilation');
      if (!has(have)) return false;
      if (s.vent === 'required') {
        if (have !== 'required') return false;
      } else if (VENT_ORDER.indexOf(have) > VENT_ORDER.indexOf(s.vent)) return false;
    }
    if (s.ams) {
      // "at least this much material-station compatibility": no < conditional < yes
      const have = pick(f, 'feeding.ams_compatible');
      if (!has(have) || AMS_ORDER.indexOf(have) < AMS_ORDER.indexOf(s.ams)) return false;
    }
    return true;
  });
}

/* --------------------------------------------------------------------------
 * List-view scaffolding
 *
 * Filter controls are built ONCE and are never rebuilt while the user
 * interacts with them, so a focused <input> is never destroyed mid-word and
 * the caret never jumps. Only the results region (table/cards) and the count
 * line re-render. The URL is kept in sync with a debounced
 * history.replaceState, which the hashchange handler ignores as
 * self-originated so it can never re-render over the user's typing.
 * ------------------------------------------------------------------------ */

/** Remember which control had focus so it can be restored after a re-render. */
function activeFocusKey() {
  const node = document.activeElement;
  return node && node.dataset ? (node.dataset.focusKey || null) : null;
}

function restoreFocus(key) {
  if (!key) return;
  const escape = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : ((s) => s);
  const node = document.querySelector(`[data-focus-key="${escape(key)}"]`);
  if (node) node.focus();
}

/**
 * Build a filterable list page.
 * config: { route, state, defaults, readState, title, subtitle, total,
 *           emptyText, compareKind, compute, buildControls, renderResults }
 */
function listView(config) {
  const container = el('div', {});
  const controlsHost = el('div', { class: 'filter-controls' });
  const resultsHost = el('div', { class: 'results-host' });
  const barHost = el('div', {});
  const countNode = el('span', { class: 'result-count' });
  const state = config.state;

  const syncUrl = debounce(() => writeParams(config.route, state, config.defaults), 200);

  const renderResults = () => {
    const shown = config.compute(state);
    api.shown = shown;                     // what export must write
    countNode.textContent = `${shown.length} of ${config.total} shown`;
    const focusKey = activeFocusKey();
    clear(resultsHost);
    resultsHost.appendChild(shown.length
      ? config.renderResults(shown, state, api)
      : el('p', { class: 'muted', text: config.emptyText }));
    clear(barHost);
    if (config.compareKind) barHost.appendChild(compareBar(config.compareKind, api.refresh));
    restoreFocus(focusKey);
  };
  const renderResultsSoon = debounce(renderResults, 200);

  const api = {
    shown: [],
    /** Discrete controls (select, checkbox, chip, sort): apply immediately. */
    set(patch) { Object.assign(state, patch); renderResults(); syncUrl(); },
    /** A change that alters the control set itself (e.g. column picker). */
    setRebuild(patch) { Object.assign(state, patch); buildControls(); renderResults(); syncUrl(); },
    /**
     * Live text inputs: state updates on every keystroke, but filtering is
     * debounced and no control DOM is touched, so typing is never interrupted.
     */
    setLive(patch) { Object.assign(state, patch); renderResultsSoon(); syncUrl(); },
    refresh() { renderResults(); },
    sortBy(key) {
      api.set({ sort: key, dir: state.sort === key && state.dir === 'asc' ? 'desc' : 'asc' });
    },
  };

  function buildControls() {
    clear(controlsHost);
    appendKids(controlsHost, [config.buildControls(state, api)]);
  }

  /* Reset is an explicit action, so rebuilding the controls here is expected. */
  const reset = () => {
    Object.assign(state, config.readState(new URLSearchParams()));
    buildControls();
    renderResults();
    writeParams(config.route, state, config.defaults);
  };

  buildControls();
  container.appendChild(el('div', { class: 'page-head' },
    el('h1', { text: config.title }),
    config.subtitle ? el('p', { class: 'sub' }, config.subtitle) : null));
  container.appendChild(el('section', { class: 'card filters no-print' },
    controlsHost,
    el('div', { class: 'filter-foot' },
      countNode,
      el('span', { class: 'spacer' }),
      config.foot ? config.foot(state, api) : null,
      el('button', { class: 'btn-sm', onclick: reset }, 'Reset filters'))));
  container.appendChild(resultsHost);
  container.appendChild(barHost);
  renderResults();
  return container;
}

/** Search box wired for live typing: never rebuilt, filtering debounced. */
function searchField(id, label, placeholder, state, api) {
  const input = el('input', {
    type: 'search', id, placeholder,
    dataset: { focusKey: id },
    oninput: (e) => api.setLive({ q: e.target.value }),
  });
  input.value = state.q || '';
  return field(label, input);
}

async function viewFilaments(route) {
  const rows = listOf('filaments');

  /*
   * `emissions` and `feeding` are expected in the index summary. If an older
   * index.json lacks them, fall back to reading the entity files — but only
   * when a filter that needs them is actually in use.
   */
  let extrasReady = rows.every((f) => has(pick(f, 'emissions')) && has(pick(f, 'feeding')));
  const ensureExtras = async () => {
    if (extrasReady) return;
    const byId = new Map((await loadAllEntities('filaments')).map((e) => [e.id, e]));
    for (const row of rows) {
      const full = byId.get(row.id);
      if (!full) continue;
      if (has(full.emissions) && !has(row.emissions)) row.emissions = full.emissions;
      if (has(full.feeding) && !has(row.feeding)) row.feeding = full.feeding;
      const shore = pick(full, 'properties.shore_hardness');
      if (has(shore) && !has(row.shore_hardness)) row.shore_hardness = shore;
    }
    extrasReady = true;
  };

  /* Property/printing columns live in the entity files, not the index summary. */
  let fullReady = false;
  const ensureFullRows = async () => {
    if (fullReady) return;
    const byId = new Map((await loadAllEntities('filaments')).map((e) => [e.id, e]));
    for (const row of rows) {
      const full = byId.get(row.id);
      if (full) Object.assign(row, full);
    }
    fullReady = true;
    extrasReady = true;
  };

  const state = readFilamentState(route.params);
  if (columnsNeedFull(activeColumns('filaments', state.cols))) await ensureFullRows();
  else if (state.vent || state.ams) await ensureExtras();

  /** Filters that read fields the index may not carry load them on demand. */
  const setExtra = (api, patch) => {
    if (!extrasReady) { ensureExtras().then(() => api.set(patch)); return; }
    api.set(patch);
  };

  /** Turning on a properties column pulls the entity files in first. */
  const setColumns = (api, cols) => {
    if (!fullReady && columnsNeedFull(activeColumns('filaments', cols))) {
      ensureFullRows().then(() => api.set({ cols }));
      return;
    }
    api.set({ cols });
  };

  return listView({
    route,
    state,
    defaults: FILAMENT_DEFAULTS,
    readState: readFilamentState,
    title: 'Filaments',
    subtitle: frag(
      txt(`${rows.length} material${rows.length === 1 ? '' : 's'} in the catalog. `),
      txt('Hover any property label for its glossary definition.')),
    total: rows.length,
    emptyText: 'No filaments match these filters.',
    compareKind: 'filaments',
    compute: (s) => sortRows(filterFilaments(rows, s), columnSorter('filaments', s.sort, {}), s.dir),
    buildControls: (s, api) => filamentControls(rows, s, api, setExtra, setColumns),
    renderResults: (shown, s, api) => dataTable('filaments', shown, s, api, { compareKind: 'filaments' }),
    foot: (s, api) => exportControl('filaments',
      () => ({ rows: api.shown, cols: activeColumns('filaments', s.cols), ctx: {} })),
  });
}

function filamentControls(rows, s, api, setExtra, setColumns) {
  const classes = Array.from(new Set(rows.map((f) => f.polymer_class).filter(has))).sort();
  return frag(
    el('div', { class: 'filter-grid' },
      searchField('f-q', 'Search', 'name, alias, use case…', s, api),
      field('Min ease of print', rangeControl('f-ease', s.ease, 1, 10, (v) => api.setLive({ ease: v })),
        { key: 'scores.ease_of_print' }),
      field('Min temperature tolerance', rangeControl('f-temp', s.temp, 1, 10, (v) => api.setLive({ temp: v })),
        { key: 'scores.temperature_tolerance' }),
      field('Max price (USD/kg)', numberField('f-maxp', isNum(s.maxp) ? s.maxp : '', 'any',
        (v) => api.setLive({ maxp: v === '' ? null : Number(v) }))),
      field('High temperature', selectControl('f-ht', [['', 'any'], ['moderate', 'moderate or better'], ['yes', 'yes']], s.ht, (v) => api.set({ ht: v })),
        { key: 'suitability.high_temperature' }),
      field('Outdoor', selectControl('f-out', [['', 'any'], ['limited', 'limited or better'], ['yes', 'yes']], s.out, (v) => api.set({ out: v })),
        { key: 'suitability.outdoor' }),
      field('Food contact', selectControl('f-food', [['', 'any'], ['conditional', 'conditional or better'], ['yes-certified-lines', 'certified lines']], s.food, (v) => api.set({ food: v })),
        { key: 'suitability.food_contact' }),
      field('Load bearing', selectControl('f-load', [['', 'any'], ['light', 'light or better'], ['moderate', 'moderate or better'], ['high', 'high']], s.load, (v) => api.set({ load: v })),
        { key: 'suitability.load_bearing' }),
      field('AMS compatible', selectControl('f-ams', [
        ['', 'all'],
        ['conditional', 'yes or conditional'],
        ['yes', 'yes only'],
      ], s.ams, (v) => setExtra(api, { ams: v })), { key: 'feeding.ams_compatible' }),
      field('Ventilation', selectControl('f-vent', [
        ['', 'any'],
        ['optional', 'optional only'],
        ['recommended', 'optional or recommended'],
        ['required', 'required only'],
      ], s.vent, (v) => setExtra(api, { vent: v })), { key: 'emissions.ventilation' })),
    classes.length ? field('Polymer class', chipGroup(classes, s.cls, (value, on) => {
      api.set({ cls: on ? s.cls.concat([value]) : s.cls.filter((c) => c !== value) });
    }), { key: 'polymer_class' }) : null,
    el('div', { class: 'checkline' },
      checkbox('f-enc', 'Enclosure recommended', s.enc, (v) => api.set({ enc: v }), 'printing.enclosure_recommended'),
      checkbox('f-chamber', 'Heated chamber required', s.chamber, (v) => api.set({ chamber: v }), 'printing.heated_chamber_required'),
      checkbox('f-base', 'Base types only (no variations)', s.base, (v) => api.set({ base: v }))),
    columnsControl('filaments', s, api, { onChange: (cols) => setColumns(api, cols) }));
}


function checkbox(id, labelText, checked, onChange, tipKey) {
  const input = el('input', {
    type: 'checkbox', id, dataset: { focusKey: id },
    onchange: (e) => onChange(e.target.checked),
  });
  input.checked = Boolean(checked);
  return el('label', { for: id }, input, txt(labelText),
    tipKey ? propLabel(tipKey, { label: labelText, iconOnly: true }) : null);
}

/** Number input that stays live while typing (no rebuild, debounced filter). */
function numberField(id, value, placeholder, onInput) {
  const input = el('input', {
    type: 'number', id, min: '0', step: '1', placeholder,
    dataset: { focusKey: id },
    oninput: (e) => onInput(e.target.value),
  });
  input.value = value === '' || value === null || value === undefined ? '' : String(value);
  return input;
}

function debounce(fn, ms) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

/* ==========================================================================
 * 11. View: manufacturer list
 * ========================================================================== */

function readManufacturerState(p) {
  return {
    q: paramStr(p, 'q'),
    country: paramStr(p, 'country'),
    tier: paramStr(p, 'tier'),
    plates: paramBool(p, 'plates'),
    sort: paramStr(p, 'sort', 'name'),
    dir: paramStr(p, 'dir', 'asc'),
    cols: paramList(p, 'cols'),
  };
}

async function viewManufacturers(route) {
  const rows = listOf('manufacturers');
  const state = readManufacturerState(route.params);

  /* Headquarters, product lines and endpoints are entity-file fields. */
  let fullReady = false;
  const ensureFullRows = async () => {
    if (fullReady) return;
    const byId = new Map((await loadAllEntities('manufacturers')).map((e) => [e.id, e]));
    for (const row of rows) {
      const full = byId.get(row.id);
      if (full) Object.assign(row, full);
    }
    fullReady = true;
  };
  if (columnsNeedFull(activeColumns('manufacturers', state.cols))) await ensureFullRows();

  const setColumns = (api, cols) => {
    if (!fullReady && columnsNeedFull(activeColumns('manufacturers', cols))) {
      ensureFullRows().then(() => api.set({ cols }));
      return;
    }
    api.set({ cols });
  };

  const filterRows = (s) => rows.filter((m) => {
    if (!matchesText(s.q, [m.name, m.id, m.summary, (m.brands || []).join(' '),
      (m.manufacturing_countries || []).join(' ')])) return false;
    if (s.country && !(m.manufacturing_countries || []).includes(s.country)) return false;
    if (s.tier && m.price_tier !== s.tier) return false;
    if (s.plates && m.makes_plates !== true) return false;
    return true;
  });

  return listView({
    route,
    state,
    defaults: LIST_DEFAULTS,
    readState: readManufacturerState,
    title: 'Manufacturers',
    subtitle: txt(`${rows.length} compan${rows.length === 1 ? 'y' : 'ies'} in the catalog. ` +
      'Countries listed are where filament is made, not where it is sold.'),
    total: rows.length,
    emptyText: 'No manufacturers match these filters.',
    compute: (s) => sortRows(filterRows(s), columnSorter('manufacturers', s.sort, {}), s.dir),
    buildControls: (s, api) => manufacturerControls(rows, s, api, setColumns),
    renderResults: (shown, s, api) => dataTable('manufacturers', shown, s, api, {}),
    foot: (s, api) => exportControl('manufacturers',
      () => ({ rows: api.shown, cols: activeColumns('manufacturers', s.cols), ctx: {} })),
  });
}

function manufacturerControls(rows, s, api, setColumns) {
  const countries = Array.from(new Set(rows.flatMap((m) => m.manufacturing_countries || []))).sort();
  const tiers = Array.from(new Set(rows.map((m) => m.price_tier).filter(has))).sort();
  return frag(
    el('div', { class: 'filter-grid' },
      searchField('m-q', 'Search', 'company or brand…', s, api),
      field('Manufacturing country', selectControl('m-country',
        [['', 'any']].concat(countries.map((c) => [c, c])), s.country, (v) => api.set({ country: v }))),
      field('Price tier', selectControl('m-tier',
        [['', 'any']].concat(tiers.map((t) => [t, prettyEnum(t)])), s.tier, (v) => api.set({ tier: v })))),
    el('div', { class: 'checkline' },
      checkbox('m-plates', 'Makes build plates', s.plates, (v) => api.set({ plates: v }))),
    columnsControl('manufacturers', s, api, { onChange: (cols) => setColumns(api, cols) }));
}


/* ==========================================================================
 * 12. View: plate list
 * ========================================================================== */

function readPlateState(p) {
  return {
    q: paramStr(p, 'q'),
    texture: paramList(p, 'texture'),
    compat: paramStr(p, 'compat'),
    rating: paramStr(p, 'rating', 'recommended'),
    sort: paramStr(p, 'sort', 'name'),
    dir: paramStr(p, 'dir', 'asc'),
    cols: paramList(p, 'cols'),
  };
}

async function viewPlates(route) {
  const rows = listOf('plates');
  // Compatibility lives in the entity files, not in the index summary.
  const full = new Map((await loadAllEntities('plates')).map((p) => [p.id, p]));
  const state = readPlateState(route.params);

  const compatOf = (id, filamentId) => {
    const entity = full.get(id);
    if (!entity || !Array.isArray(entity.filament_compatibility)) return null;
    return entity.filament_compatibility.find((c) => c.filament_id === filamentId) || null;
  };

  const filterRows = (s) => rows.filter((r) => {
    if (!matchesText(s.q, [r.name, r.id, r.summary, r.surface_makeup, r.texture,
      ((full.get(r.id) || {}).aliases || []).join(' '),
      plateSearchBlob(r, full.get(r.id))])) return false;
    if (s.texture.length && !s.texture.includes(r.texture)) return false;
    if (s.compat) {
      const c = compatOf(r.id, s.compat);
      if (!c) return false;
      if (s.rating === 'recommended' && c.rating !== 'recommended') return false;
      if (s.rating === 'usable' && c.rating === 'avoid') return false;
      if (s.rating === 'avoid' && c.rating !== 'avoid') return false;
    }
    return true;
  });

  return listView({
    route,
    state,
    defaults: PLATE_DEFAULTS,
    readState: readPlateState,
    title: 'Build plates',
    subtitle: txt(`${rows.length} plate type${rows.length === 1 ? '' : 's'} in the catalog.`),
    total: rows.length,
    emptyText: 'No plates match these filters.',
    compareKind: 'plates',
    compute: (s) => sortRows(filterRows(s), columnSorter('plates', s.sort, { full, state: s }), s.dir),
    buildControls: (s, api) => plateControls(rows, s, api),
    renderResults: (shown, s, api) => dataTable('plates', shown, s, api,
      { compareKind: 'plates', ctx: { full, state: s } }),
    foot: (s, api) => exportControl('plates',
      () => ({ rows: api.shown, cols: activeColumns('plates', s.cols), ctx: { full, state: s } })),
  });
}

function plateControls(rows, s, api) {
  const textures = Array.from(new Set(rows.map((r) => r.texture).filter(has))).sort();
  const filamentOptions = listOf('filaments').map((f) => [f.id, f.name || f.id]);
  return frag(
    el('div', { class: 'filter-grid' },
      searchField('p-q', 'Search', 'name, surface, alias, product…', s, api),
      field('Compatible with filament', selectControl('p-compat',
        [['', 'any']].concat(filamentOptions), s.compat, (v) => api.set({ compat: v }))),
      field('Compatibility rating', selectControl('p-rating',
        [['recommended', 'recommended only'], ['usable', 'recommended or usable-with-prep'], ['avoid', 'avoid']],
        s.rating, (v) => api.set({ rating: v })))),
    textures.length ? field('Texture', chipGroup(textures, s.texture, (value, on) => {
      api.set({ texture: on ? s.texture.concat([value]) : s.texture.filter((t) => t !== value) });
    }), { key: 'texture' }) : null,
    columnsControl('plates', s, api));
}


/* ==========================================================================
 * 13. Detail pages
 * ========================================================================== */

function detailHeader(entity, opts) {
  const o = opts || {};
  const meta = el('div', { class: 'detail-meta' });
  if (o.classLabel) meta.appendChild(el('span', { class: 'pill-class', text: o.classLabel }));
  const sb = statusBadge(entity.status);
  if (sb) meta.appendChild(sb);
  const cb = confidenceBadge(pick(entity, 'provenance.confidence'));
  if (cb) meta.appendChild(cb);
  const lv = pick(entity, 'provenance.last_verified');
  if (lv) meta.appendChild(badge(`verified ${lv}`, 'neutral', 'Date this entry was last checked'));
  appendKids(meta, [o.extraBadges || null]);

  return el('div', { class: 'detail-head' },
    el('div', { class: 'titles' },
      el('h1', { text: entity.name || entity.id }),
      meta,
      Array.isArray(entity.aliases) && entity.aliases.length
        ? el('p', { class: 'small muted', text: `Also known as: ${entity.aliases.join(', ')}` }) : null,
      entity.summary ? el('p', { class: 'detail-summary', text: entity.summary }) : null),
    o.actions ? el('div', { class: 'row-actions no-print' }, o.actions) : null);
}

function provenanceSection(entity) {
  const p = entity.provenance;
  if (!has(p)) return null;
  const sources = Array.isArray(p.sources) ? p.sources : [];
  const list = sources.length ? el('ul', { class: 'linklist sources' }) : null;
  for (const src of sources) list.appendChild(el('li', {}, linkify(src)));
  return section('Provenance', 'provenance.confidence',
    kvTable([
      ['provenance.confidence', p.confidence ? confidenceBadge(p.confidence) : null, { label: 'Confidence' }],
      ['provenance.last_verified', p.last_verified, { label: 'Last verified' }],
      ['status', entity.status ? statusBadge(entity.status) : null, { label: 'Entry status' }],
    ]),
    has(p.conflicts) ? el('h3', { text: 'Unresolved source conflicts' }) : null,
    has(p.conflicts) ? el('p', { class: 'prose' }, prose(p.conflicts)) : null,
    list ? el('h3', { text: 'Sources' }) : null,
    list);
}

/* ---------- filament detail ---------- */

const SCORE_KEYS = ['ease_of_print', 'dimensional_stability', 'warp_tendency', 'layer_adhesion',
  'compression_strength', 'temperature_tolerance', 'uv_tolerance', 'weather_tolerance', 'water_tolerance'];

function scoresSection(scores) {
  if (!has(scores)) return null;
  const meters = el('div', { class: 'meters' });
  const keys = SCORE_KEYS.filter((k) => isNum(scores[k]))
    .concat(Object.keys(scores).filter((k) => !SCORE_KEYS.includes(k) && isNum(scores[k])));
  for (const k of keys) meters.appendChild(scoreMeter(k, scores[k]));
  if (!meters.childNodes.length) return null;
  return section('Scores (1–10)', null, meters,
    el('p', { class: 'small faint', text: 'Higher is better on every scale except warp tendency, where 10 means it warps the most.' }));
}

function printingSection(f) {
  const pr = f.printing;
  if (!has(pr)) return null;
  return section('Printing', null, kvTable([
    ['printing.nozzle_temp_c', fmtRange(pr.nozzle_temp_c, '°C')],
    ['printing.bed_temp_c', fmtRange(pr.bed_temp_c, '°C')],
    ['printing.ambient_temp_c', fmtRange(pr.ambient_temp_c, '°C')],
    ['printing.speed_mm_s', fmtRange(pr.speed_mm_s, 'mm/s')],
    ['printing.part_cooling_fan_pct', fmtRange(pr.part_cooling_fan_pct, '%')],
    ['printing.enclosure_recommended', pr.enclosure_recommended === undefined ? null
      : badge(pr.enclosure_recommended ? 'recommended' : 'not needed', pr.enclosure_recommended ? 'mid' : 'good')],
    ['printing.heated_chamber_required', pr.heated_chamber_required === undefined ? null
      : badge(pr.heated_chamber_required ? 'required' : 'not required', pr.heated_chamber_required ? 'bad' : 'good')],
    ['printing.requires_hardened_nozzle', pr.requires_hardened_nozzle === undefined ? null
      : badge(pr.requires_hardened_nozzle ? 'hardened nozzle required' : 'brass nozzle ok', pr.requires_hardened_nozzle ? 'bad' : 'good')],
    ['printing.enclosure_open_for_cooling', pr.enclosure_open_for_cooling === undefined ? null
      : badge(pr.enclosure_open_for_cooling ? 'open the enclosure' : 'keep the enclosure closed',
        pr.enclosure_open_for_cooling ? 'mid' : 'neutral')],
    ['printing.notes', pr.notes],
  ]));
}

function dryingSection(f) {
  const d = f.drying;
  const st = f.storage;
  if (!has(d) && !has(st)) return null;
  return section('Drying & storage', 'drying', kvTable([
    ['drying.required_before_use', d && d.required_before_use ? prettyEnum(d.required_before_use) : null, { label: 'Drying required' }],
    ['drying.temp_c', d ? fmtRange(d.temp_c, '°C') : null, { label: 'Drying temperature' }],
    ['drying.time_hours', d ? fmtRange(d.time_hours, 'h') : null, { label: 'Drying time' }],
    ['drying.methods', d && Array.isArray(d.methods) ? tagList(d.methods) : null, { label: 'Drying methods' }],
    ['drying.dryness_validation', d ? d.dryness_validation : null],
    ['drying.notes', d ? d.notes : null, { label: 'Drying notes' }],
    ['storage.hygroscopy', st && st.hygroscopy ? prettyEnum(st.hygroscopy) : null],
    ['storage.max_humidity_pct', st ? fmtNum(st.max_humidity_pct, '% RH') : null, { label: 'Max storage humidity' }],
    ['storage.recommendations', st ? st.recommendations : null, { label: 'Storage' }],
  ]));
}

function propertiesSection(f) {
  const p = f.properties;
  if (!has(p)) return null;
  return section('Physical properties', null, kvTable([
    ['properties.density_g_cm3', fmtNum(p.density_g_cm3, 'g/cm³')],
    ['properties.grams_per_100cm3', fmtNum(p.grams_per_100cm3, 'g / 100 cm³')],
    ['properties.cm3_per_100g', fmtNum(p.cm3_per_100g, 'cm³ / 100 g')],
    ['properties.shrinkage_pct', fmtRange(p.shrinkage_pct, '%')],
    ['properties.glass_transition_c', fmtNum(p.glass_transition_c, '°C')],
    ['properties.heat_deflection_c', fmtNum(p.heat_deflection_c, '°C')],
    ['properties.max_service_temp_c', fmtNum(p.max_service_temp_c, '°C')],
    ['properties.tensile_strength_mpa', fmtRange(p.tensile_strength_mpa, 'MPa')],
    ['properties.shore_hardness', p.shore_hardness],
    ['properties.notes', p.notes, { label: 'Property notes' }],
  ]));
}

function feedingSection(f) {
  const fd = f.feeding;
  const shore = pick(f, 'properties.shore_hardness');
  if (!has(fd) && !has(shore)) return null;
  const headline = el('p', { class: 'headline-badges' });
  appendKids(headline, [amsBadge(fd && fd.ams_compatible), driveBadge(fd && fd.drive_system)]);
  return section('Feeding & handling', 'feeding.drive_system',
    headline.childNodes.length ? headline : null,
    kvTable([
      ['feeding.drive_system', fd && has(fd.drive_system)
        ? badge(DRIVE_LABELS[fd.drive_system] || prettyEnum(fd.drive_system), driveTone(fd.drive_system)) : null],
      ['feeding.ams_compatible', fd && has(fd.ams_compatible)
        ? badge(prettyEnum(fd.ams_compatible), amsTone(fd.ams_compatible)) : null],
      ['feeding.feeding_assistant_recommended', fd && fd.feeding_assistant_recommended === undefined ? null
        : (fd ? badge(fd.feeding_assistant_recommended ? 'recommended' : 'not needed',
          fd.feeding_assistant_recommended ? 'mid' : 'good') : null)],
      ['properties.shore_hardness', shore],
      ['feeding.notes', fd && fd.notes, { label: 'Feeding notes' }],
    ]));
}

function emissionsSection(f) {
  const e = f.emissions;
  if (!has(e)) return null;
  return section('Emissions & ventilation', 'emissions.ventilation',
    has(e.ventilation)
      ? el('p', { class: 'vent-headline' },
        tipBadgeNode('emissions.ventilation', ventilationBadge(e.ventilation)))
      : null,
    kvTable([
      ['emissions.voc_level', has(e.voc_level) ? tipBadge('emissions.voc_level', prettyEnum(e.voc_level), levelTone(e.voc_level)) : null],
      ['emissions.particulate_level', has(e.particulate_level) ? tipBadge('emissions.particulate_level', prettyEnum(e.particulate_level), levelTone(e.particulate_level)) : null],
      ['emissions.primary_emissions', tagList(e.primary_emissions), { label: 'Primary emissions' }],
      ['emissions.notes', e.notes, { label: 'Emission notes' }],
    ]));
}

function suitabilitySection(f) {
  if (!has(f.suitability)) return null;
  const rows = Object.keys(SUIT_ORDER)
    .filter((k) => has(f.suitability[k]))
    .map((k) => [`suitability.${k}`, badge(prettyEnum(f.suitability[k]), suitTone(k, f.suitability[k]))]);
  return section('Suitability', null, kvTable(rows));
}

function useCasesSection(f) {
  const u = f.use_cases;
  if (!has(u)) return null;
  const rec = bulletList(u.recommended, 'pros');
  const not = bulletList(u.not_recommended, 'cons');
  if (!rec && !not) return null;
  return section('Use cases', null, el('div', { class: 'pros-cons' },
    rec ? el('div', {}, el('h3', { text: 'Recommended for' }), rec) : null,
    not ? el('div', {}, el('h3', { text: 'Not recommended for' }), not) : null));
}

/**
 * "Alternatives to consider" — sibling materials to reach for instead, with the
 * reason. Absent field renders nothing; unknown ids render as plain text.
 */
function alternativeRows(f) {
  return (Array.isArray(f.alternatives) ? f.alternatives : [])
    .filter((a) => a && has(a.filament_id));
}

function alternativesSection(f) {
  const list = alternativeRows(f);
  if (!list.length) return null;
  const body = el('tbody');
  for (const alt of list) {
    body.appendChild(el('tr', {},
      el('td', { 'data-label': 'Material' },
        refLink('filaments', alt.filament_id) || txt(String(alt.filament_id))),
      el('td', { 'data-label': 'Why' }, alt.reason || '—')));
  }
  return section('Alternatives to consider', 'alternatives',
    el('div', { class: 'table-wrap' },
      el('table', { class: 'responsive-table' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Material'),
          el('th', { scope: 'col' }, 'Why'))),
        body)));
}

/** One-line alternatives summary for the printable sheet. */
function alternativesLine(f, max) {
  const list = alternativeRows(f);
  if (!list.length) return '';
  return trimText(list
    .map((alt) => {
      const name = shortName('filaments', alt.filament_id);
      return alt.reason ? `${name} (${alt.reason})` : name;
    })
    .join('; '), max || 150);
}

function compatibilitySection(f) {
  const c = f.compatibility;
  if (!has(c)) return null;
  return section('Compatibility', 'compatibility.bonds_with', kvTable([
    ['compatibility.bonds_with', refList('filaments', c.bonds_with)],
    ['compatibility.support_materials', refList('filaments', c.support_materials)],
    ['compatibility.usable_as_support_for', refList('filaments', c.usable_as_support_for)],
    ['compatibility.notes', c.notes, { label: 'Compatibility notes' }],
  ]));
}

/**
 * Build plates for one filament, grouped by rating. Every plate in the catalog
 * can be rated for every material, so groups collapse once they get long.
 */
function plateRecommendationsSection(f) {
  const recs = f.plate_recommendations;
  if (!Array.isArray(recs) || !recs.length) return null;
  const groups = groupByRating(recs);

  const blocks = groups.map(([rating, rows], i) => {
    const body = el('tbody');
    for (const r of rows) {
      body.appendChild(el('tr', {},
        el('td', { 'data-label': 'Plate' }, refLink('plates', r.plate_id) || txt(String(r.plate_id))),
        el('td', { 'data-label': 'Notes' }, has(r.notes) ? linkify(r.notes) : txt('—'))));
    }
    const table = el('div', { class: 'table-wrap' },
      el('table', { class: 'responsive-table' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Plate'), el('th', { scope: 'col' }, 'Notes'))),
        body));
    // First group (best rating) opens; the rest stay collapsed unless tiny.
    return collapsible(RATING_LABEL[rating] || prettyEnum(rating), `${rows.length}`, table,
      { open: i === 0 || recs.length <= 4, tone: rating });
  });

  return section('Build plates', null,
    el('p', { class: 'small faint', text: `${recs.length} plate${recs.length === 1 ? '' : 's'} rated for this material.` }),
    blocks);
}

/**
 * "Sold as" — vendor product names that are this entity. Shared by filaments
 * (chemically identical materials) and plates (same surface type).
 *
 * Grouped by *displayed* vendor name, not by the raw string: sources sometimes
 * carry two spellings of one vendor (differing only in a parenthetical), which
 * would otherwise render as two identical-looking rows. Products are
 * de-duplicated within a group for the same reason.
 */
function tradeNamesSection(f, opts) {
  const o = opts || {};
  const names = f.trade_names;
  if (!Array.isArray(names) || !names.length) return null;

  const byMaker = new Map();
  for (const t of names) {
    if (!t || !has(t.product)) continue;
    const raw = has(t.manufacturer) ? t.manufacturer : '';
    const key = raw ? shortName('manufacturers', raw) : '';
    if (!byMaker.has(key)) byMaker.set(key, { ids: [], products: [], seen: new Set() });
    const group = byMaker.get(key);
    // Prefer a raw id that resolves to a catalog manufacturer, so the row links.
    if (raw && !group.ids.includes(raw)) group.ids.push(raw);
    const dedupeKey = String(t.product).trim().toLowerCase();
    if (group.seen.has(dedupeKey)) continue;
    group.seen.add(dedupeKey);
    group.products.push(t);
  }
  const makers = Array.from(byMaker.keys()).sort((a, b) => a.localeCompare(b));

  const list = el('ul', { class: 'trade-list' });
  for (const makerName of makers) {
    const group = byMaker.get(makerName);
    const makerId = group.ids.find((id) => entityExists('manufacturers', id)) || group.ids[0] || '';
    const products = el('ul', { class: 'taglist' });
    for (const t of group.products) {
      products.appendChild(el('li', {
        class: t.notes ? 'has-note' : null,
        title: t.notes || null,
      }, t.product, t.notes ? el('span', { class: 'note-dot', 'aria-hidden': 'true' }, '*') : null));
    }
    list.appendChild(el('li', { class: 'trade-row' },
      el('span', { class: 'trade-maker' },
        makerId ? (refLink('manufacturers', makerId, shortName('manufacturers', makerId)) || txt(makerId))
          : txt('Unattributed')),
      products));
  }

  // Count what is actually shown, so the blurb matches the list after de-duplication.
  const total = makers.reduce((n, m) => n + byMaker.get(m).products.length, 0);
  const withNotes = names.some((t) => has(t.notes));
  const body = frag(list, withNotes
    ? el('p', { class: 'small faint', text: '* hover a product for match notes and spec deltas.' }) : null);

  return section('Sold as', null,
    el('p', { class: 'small faint' },
      txt(`${total} product${total === 1 ? '' : 's'} from ${makers.length} manufacturer${makers.length === 1 ? '' : 's'} `),
      txt(o.blurb || 'are this material chemically (matched by makeup and specs).')),
    makers.length > 8 ? collapsible('Product names', `${total}`, body, { open: false }) : body);
}

function relatedFilaments(f) {
  const kids = listOf('filaments').filter((x) => x.base_type === f.id);
  const parent = has(f.base_type) ? refLink('filaments', f.base_type) : null;
  if (!kids.length && !parent) return null;
  return section('Related materials', null, kvTable([
    ['base_type', parent, { label: 'Variation of' }],
    ['variation_kind', f.variation_kind ? prettyEnum(f.variation_kind) : null],
    ['variations', kids.length ? refList('filaments', kids.map((k) => k.id)) : null, { label: 'Variations of this material' }],
  ]));
}

function madeBySection(id) {
  const makers = listOf('manufacturers').filter((m) => {
    const entity = DATA.entities.get(`manufacturers/${m.id}`);
    if (!entity) return false;
    return (entity.product_lines || []).some((line) => (line.filament_ids || []).includes(id));
  });
  if (!makers.length) return null;
  return section('Manufacturers with product lines', null, refList('manufacturers', makers.map((m) => m.id)));
}

async function viewFilamentDetail(id) {
  const f = await loadEntity('filaments', id);
  /*
   * `trade_names` names the manufacturers directly, so the page needs one fetch.
   * Only fall back to scanning every manufacturer's product lines (58+ fetches)
   * when an entry predates trade_names.
   */
  const hasTradeNames = Array.isArray(f.trade_names) && f.trade_names.length > 0;
  if (!hasTradeNames) await loadAllEntities('manufacturers').catch(() => []);
  return frag(
    backCrumb('#/filaments', 'All filaments'),
    detailHeader(f, {
      classLabel: prettyEnum(f.polymer_class),
      extraBadges: [
        pick(f, 'feeding.drive_system') === 'direct-drive-required' ? driveBadge('direct-drive-required') : null,
        pick(f, 'feeding.ams_compatible') === 'no' ? amsBadge('no') : null,
        pick(f, 'emissions.ventilation') === 'required' ? ventilationBadge('required') : null,
      ],
      actions: [
        el('a', { class: 'btn', href: `#/filament/${encodeURIComponent(f.id)}/sheet` }, 'Reference sheet'),
        el('button', {
          class: 'btn-sm',
          onclick: (e) => {
            toggleSelection('filaments', f.id, !selection.filaments.has(f.id));
            e.target.textContent = selection.filaments.has(f.id) ? 'Selected for compare ✓' : 'Add to compare';
          },
        }, selection.filaments.has(f.id) ? 'Selected for compare ✓' : 'Add to compare'),
      ],
    }),
    placeholderBanner(f),
    (has(f.chemical_makeup) || has(f.polymer_class)) ? section('Chemistry', 'polymer_class', kvTable([
      ['polymer_class', prettyEnum(f.polymer_class)],
      ['chemical_makeup', f.chemical_makeup],
    ])) : null,
    printingSection(f),
    dryingSection(f),
    twoColumns(
      [propertiesSection(f), suitabilitySection(f)],
      [scoresSection(f.scores), priceSection(f)]),
    useCasesSection(f),
    alternativesSection(f),
    compatibilitySection(f),
    plateRecommendationsSection(f),
    relatedFilaments(f),
    tradeNamesSection(f),
    hasTradeNames ? null : madeBySection(f.id),
    feedingSection(f),
    emissionsSection(f),
    f.safety_notes ? section('Safety', null, el('p', { class: 'prose' }, prose(f.safety_notes))) : null,
    f.additional_notes ? section('Additional notes', null, el('p', { class: 'prose' }, prose(f.additional_notes))) : null,
    provenanceSection(f));
}

function priceSection(f) {
  if (!has(f.price)) return null;
  return section('Price', null, kvTable([
    ['price', fmtPriceKg(f.price), { label: 'Typical street price' }],
    ['price.notes', f.price.notes, { label: 'Price notes' }],
  ]));
}

/* ---------- manufacturer detail ---------- */

async function viewManufacturerDetail(id) {
  const m = await loadEntity('manufacturers', id);

  const oem = Array.isArray(m.oem_relationships) && m.oem_relationships.length
    ? (() => {
      const body = el('tbody');
      for (const r of m.oem_relationships) {
        body.appendChild(el('tr', {},
          el('td', { 'data-label': 'Company' }, r.company || '—'),
          el('td', { 'data-label': 'Relationship' }, prettyEnum(r.relationship)),
          el('td', { 'data-label': 'Notes' }, has(r.notes) ? linkify(r.notes) : txt('—'))));
      }
      return el('div', { class: 'table-wrap' }, el('table', { class: 'responsive-table' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Company'), el('th', { scope: 'col' }, 'Relationship'), el('th', { scope: 'col' }, 'Notes'))),
        body));
    })()
    : null;

  const lineCount = Array.isArray(m.product_lines) ? m.product_lines.length : 0;
  const lines = lineCount
    ? (() => {
      const body = el('tbody');
      for (const line of m.product_lines) {
        body.appendChild(el('tr', {},
          el('td', { 'data-label': 'Line' }, line.name || '—'),
          // Materials link through to filament pages when the id is in the catalog.
          el('td', { 'data-label': 'Materials' }, refChips('filaments', line.filament_ids) || txt('—')),
          el('td', { 'data-label': 'Notes' }, has(line.notes) ? linkify(line.notes) : txt('—'))));
      }
      const table = el('div', { class: 'table-wrap' }, el('table', { class: 'responsive-table' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Product line'), el('th', { scope: 'col' }, 'Materials'), el('th', { scope: 'col' }, 'Notes'))),
        body));
      // Large catalogues (40+ lines) collapse so the rest of the page stays reachable.
      return lineCount > 15
        ? collapsible('All product lines', `${lineCount}`, table, { open: false })
        : table;
    })()
    : null;

  // Every distinct material this manufacturer's lines cover, as quick links.
  const lineMaterials = Array.from(new Set((m.product_lines || [])
    .flatMap((line) => line.filament_ids || []))).filter((fid) => entityExists('filaments', fid));

  const ep = m.endpoints || {};
  const social = ep.social && typeof ep.social === 'object' ? Object.keys(ep.social) : [];
  const socialList = social.length ? el('ul', { class: 'taglist' }) : null;
  for (const key of social) socialList.appendChild(el('li', {}, externalLink(ep.social[key], key)));

  return frag(
    backCrumb('#/manufacturers', 'All manufacturers'),
    detailHeader(m, { classLabel: m.price_tier ? `${prettyEnum(m.price_tier)} tier` : null }),
    placeholderBanner(m),
    section('Identity', null, kvTable([
      ['headquarters_country', m.headquarters_country],
      ['manufacturing_countries', tagList(m.manufacturing_countries)],
      ['brands', tagList(m.brands)],
      ['price_tier', m.price_tier ? badge(m.price_tier, 'neutral') : null],
      ['makes_plates', m.makes_plates === undefined ? null : badge(m.makes_plates ? 'yes' : 'no', m.makes_plates ? 'good' : 'neutral')],
      ['plate_ids', refList('plates', m.plate_ids), { label: 'Plate products' }],
    ])),
    oem ? section('OEM & white-label relationships', null, oem) : null,
    lines ? section('Product lines', null,
      el('p', { class: 'small faint', text: `${lineCount} product line${lineCount === 1 ? '' : 's'}${lineMaterials.length ? ` covering ${lineMaterials.length} materials` : ''}.` }),
      lineMaterials.length ? refChips('filaments', lineMaterials) : null,
      lines) : null,
    (has(ep.website) || has(ep.store) || has(ep.docs) || has(ep.support) || socialList)
      ? section('Endpoints', null, kvTable([
        ['endpoints.website', externalLink(ep.website), { label: 'Website' }],
        ['endpoints.store', externalLink(ep.store), { label: 'Store' }],
        ['endpoints.docs', externalLink(ep.docs), { label: 'Documentation' }],
        ['endpoints.support', externalLink(ep.support), { label: 'Support' }],
        ['endpoints.social', socialList, { label: 'Social' }],
      ]))
      : null,
    m.additional_notes ? section('Additional notes', null, el('p', { class: 'prose' }, prose(m.additional_notes))) : null,
    provenanceSection(m));
}

/* ---------- plate detail ---------- */

/** One table of filament-compatibility rows (no rating column — the group is the rating). */
function plateCompatGroupTable(rows) {
  const body = el('tbody');
  for (const c of rows) {
    body.appendChild(el('tr', {},
      el('td', { 'data-label': 'Filament' }, refLink('filaments', c.filament_id) || txt(String(c.filament_id))),
      el('td', { 'data-label': 'Bed temperature' }, fmtRange(c.bed_temp_c, '°C') || '—'),
      el('td', { 'data-label': 'Adhesion aid' }, c.adhesion_aid || '—'),
      el('td', { 'data-label': 'Notes' }, has(c.notes) ? linkify(c.notes) : txt('—'))));
  }
  return el('div', { class: 'table-wrap' }, el('table', { class: 'responsive-table' },
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col' }, 'Filament'),
      el('th', { scope: 'col' }, propLabel('printing.bed_temp_c', { label: 'Bed temp' })),
      el('th', { scope: 'col' }, 'Adhesion aid'),
      el('th', { scope: 'col' }, 'Notes'))),
    body));
}

/**
 * Plate compatibility, grouped by rating. A researched plate rates 30-46
 * materials, so a flat table buries the useful part (what it is good at).
 */
function plateCompatSection(p) {
  const rows = Array.isArray(p.filament_compatibility) ? p.filament_compatibility : [];
  if (!rows.length) return null;
  const groups = groupByRating(rows);
  const blocks = groups.map(([rating, group], i) =>
    collapsible(RATING_LABEL[rating] || prettyEnum(rating), `${group.length}`,
      plateCompatGroupTable(group), { open: i === 0 || rows.length <= 8, tone: rating }));

  const summary = el('span', { class: 'badge-group' });
  for (const [rating, group] of groups) {
    const tone = rating === 'recommended' ? 'good' : rating === 'avoid' ? 'bad' : 'mid';
    summary.appendChild(badge(`${RATING_LABEL[rating] || rating}: ${group.length}`, tone));
  }
  return section('Filament compatibility', null,
    el('p', {}, summary),
    el('p', { class: 'small faint', text: `${rows.length} materials rated on this surface.` }),
    blocks);
}

/**
 * "Do not use" table: what damages this specific surface and why, worst first.
 * Severity is optional in the schema, so unrated rows still render.
 */
function damageAvoidanceSection(p) {
  const rows = sortBySeverity(p.damage_avoidance);
  if (!rows.length) return null;

  const body = el('tbody');
  for (const row of rows) {
    body.appendChild(el('tr', { class: `sev-${row.severity || 'unrated'}` },
      el('td', { 'data-label': 'Do not use', class: 'cell-name' }, row.item || '—'),
      el('td', { 'data-label': 'Severity' }, severityBadge(row.severity) || el('span', { class: 'faint', text: '—' })),
      el('td', { 'data-label': 'Why' }, has(row.reason) ? linkify(row.reason) : txt('—'))));
  }

  const tally = el('span', { class: 'badge-group' });
  for (const [severity, n] of severityCounts(rows)) {
    tally.appendChild(badge(`${n} ${severity}`, severityTone(severity)));
  }

  return section('Do not use — damage avoidance', 'damage_avoidance',
    el('p', { class: 'small' }, tally),
    el('div', { class: 'table-wrap' },
      el('table', { class: 'responsive-table damage-table' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Item'),
          el('th', { scope: 'col' }, 'Severity'),
          el('th', { scope: 'col' }, 'Why it damages this surface'))),
        body)));
}

async function viewPlateDetail(id) {
  /*
   * One fetch: the plate's own filament_compatibility table is the authoritative
   * (and reciprocal) list, so there is no need to scan every filament entity.
   */
  const p = await loadEntity('plates', id);

  return frag(
    backCrumb('#/plates', 'All plates'),
    detailHeader(p, {
      classLabel: p.texture ? prettyEnum(p.texture) : null,
      actions: [
        el('a', { class: 'btn', href: `#/plate/${encodeURIComponent(p.id)}/sheet` }, 'Reference sheet'),
        el('button', {
          class: 'btn-sm',
          onclick: (e) => {
            toggleSelection('plates', p.id, !selection.plates.has(p.id));
            e.target.textContent = selection.plates.has(p.id) ? 'Selected for compare ✓' : 'Add to compare';
          },
        }, selection.plates.has(p.id) ? 'Selected for compare ✓' : 'Add to compare'),
      ],
    }),
    placeholderBanner(p),
    section('Surface', null, kvTable([
      ['texture', p.texture ? prettyEnum(p.texture) : null],
      ['surface_makeup', p.surface_makeup],
      ['temperature_limits_c', fmtRange(p.temperature_limits_c, '°C'), { label: 'Temperature limits' }],
      ['price', fmtPricePlate(p.price), { label: 'Typical price' }],
      ['price.notes', pick(p, 'price.notes'), { label: 'Price notes' }],
      ['manufacturers', tagList(p.manufacturers), { label: 'Offered by' }],
    ])),
    tradeNamesSection(p, { blurb: 'are this surface type (matched by makeup and behaviour).' }),
    plateCompatSection(p),
    (has(p.preparation) || has(p.cleaning)) ? section('Preparation & cleaning', null, kvTable([
      ['preparation', p.preparation],
      ['cleaning', p.cleaning],
    ])) : null,
    damageAvoidanceSection(p),
    (has(p.model_removal) || has(p.stuck_print_recovery)) ? section('Removal & recovery', null, kvTable([
      ['model_removal', p.model_removal, { label: 'Model removal' }],
      ['stuck_print_recovery', p.stuck_print_recovery, { label: 'Stuck print recovery' }],
    ])) : null,
    p.lifespan_notes ? section('Lifespan & wear', null, el('p', { class: 'prose' }, prose(p.lifespan_notes))) : null,
    p.additional_notes ? section('Additional notes', null, el('p', { class: 'prose' }, prose(p.additional_notes))) : null,
    provenanceSection(p));
}

/* ==========================================================================
 * 14. Printable reference sheets
 * ========================================================================== */

/**
 * Reference sheets must stay a single printed page, but researched entries can
 * carry paragraphs of prose. Trim on a word boundary; the detail page has it all.
 */
function trimText(str, max) {
  if (!has(str)) return null;
  const text = String(str).trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '') + '…';
}

function sheetBlock(title, ...content) {
  const body = content.flat(Infinity).filter(Boolean);
  if (!body.length) return null;
  return el('div', { class: 'sheet-block' }, el('h2', { text: title }), ...body);
}

function miniTable(rows) {
  const body = el('tbody');
  let n = 0;
  for (const row of rows) {
    if (!row) continue;
    const [label, value] = row;
    if (!has(value)) continue;
    n += 1;
    body.appendChild(el('tr', {},
      el('th', { scope: 'row' }, label),
      el('td', {}, value instanceof Node ? value : txt(value))));
  }
  return n ? el('table', { class: 'kv' }, body) : null;
}

function printButton() {
  return el('div', { class: 'row-actions no-print', style: 'margin-bottom:.8rem' },
    el('button', { class: 'btn-primary', onclick: () => window.print() }, 'Print this sheet'),
    el('span', { class: 'small faint', text: 'Prints as a single clean page — navigation and filters are stripped.' }));
}

async function viewFilamentSheet(id) {
  const f = await loadEntity('filaments', id);
  const pr = f.printing || {};
  const d = f.drying || {};
  const st = f.storage || {};
  const props = f.properties || {};
  const scores = f.scores || {};

  const flags = [];
  if (pr.enclosure_recommended) flags.push('enclosure recommended');
  if (pr.heated_chamber_required) flags.push('heated chamber REQUIRED');
  if (pr.requires_hardened_nozzle) flags.push('hardened nozzle required');
  if (pr.enclosure_open_for_cooling) flags.push('run enclosure open / cover off');

  const topScores = el('div', { class: 'meters' });
  for (const k of ['ease_of_print', 'warp_tendency', 'temperature_tolerance', 'layer_adhesion', 'weather_tolerance']) {
    if (isNum(scores[k])) topScores.appendChild(scoreMeter(k, scores[k]));
  }

  return frag(
    backCrumb(`#/filament/${encodeURIComponent(id)}`, 'Full engineering page'),
    printButton(),
    el('article', { class: 'sheet' },
      el('h1', { text: f.name || f.id }),
      el('p', { class: 'sheet-sub' },
        txt([prettyEnum(f.polymer_class), f.chemical_makeup].filter(has).join(' · ')),
        pick(f, 'provenance.last_verified') ? txt(` · verified ${pick(f, 'provenance.last_verified')}`) : null,
        isPlaceholder(f) ? txt(' · EXAMPLE DATA — pending research') : null),
      f.summary ? el('p', { class: 'fine', text: trimText(f.summary, 170) }) : null,
      el('div', { class: 'sheet-cols' },
        sheetBlock('Print settings', miniTable([
          ['Nozzle', fmtRange(pr.nozzle_temp_c, '°C')],
          ['Bed', fmtRange(pr.bed_temp_c, '°C')],
          ['Chamber / ambient', fmtRange(pr.ambient_temp_c, '°C')],
          ['Speed', fmtRange(pr.speed_mm_s, 'mm/s')],
          ['Part cooling', fmtRange(pr.part_cooling_fan_pct, '%')],
          ['Hardware', flags.length ? flags.join('; ') : 'no special hardware'],
        ]), pr.notes ? el('p', { class: 'fine', text: trimText(pr.notes, 150) }) : null),
        sheetBlock('Drying & storage', miniTable([
          ['Dry before use', prettyEnum(d.required_before_use)],
          ['Dry at', fmtRange(d.temp_c, '°C')],
          ['For', fmtRange(d.time_hours, 'h')],
          ['Methods', Array.isArray(d.methods) ? trimText(d.methods.join(', '), 90) : null],
          ['Hygroscopy', prettyEnum(st.hygroscopy)],
          ['Store', trimText(st.recommendations, 95)],
          ['Max humidity', fmtNum(st.max_humidity_pct, '% RH')],
        ]), d.dryness_validation
          ? el('p', { class: 'fine' }, el('strong', { text: 'Dryness check: ' }), txt(trimText(d.dryness_validation, 115))) : null),
        sheetBlock('Key properties', miniTable([
          ['Density', fmtNum(props.density_g_cm3, 'g/cm³')],
          ['Per 100 cm³', fmtNum(props.grams_per_100cm3, 'g')],
          ['Per 100 g', fmtNum(props.cm3_per_100g, 'cm³')],
          ['Shrinkage', fmtRange(props.shrinkage_pct, '%')],
          ['Tg', fmtNum(props.glass_transition_c, '°C')],
          ['HDT', fmtNum(props.heat_deflection_c, '°C')],
          ['Max service', fmtNum(props.max_service_temp_c, '°C')],
          ['Tensile', fmtRange(props.tensile_strength_mpa, 'MPa')],
          ['Price', fmtPriceKg(f.price)],
        ])),
        topScores.childNodes.length ? sheetBlock('Scores', topScores,
          el('p', { class: 'fine faint', text: 'Warp tendency is inverted: 10 = warps most.' })) : null,
        has(f.suitability) ? sheetBlock('Suitability', suitabilityBadges(f.suitability)) : null,
        (pick(f, 'use_cases.recommended') || pick(f, 'use_cases.not_recommended'))
          ? sheetBlock('Use cases',
            bulletList((pick(f, 'use_cases.recommended') || []).slice(0, 5), 'pros fine'),
            (pick(f, 'use_cases.not_recommended') || []).length
              ? frag(el('p', { class: 'fine', style: 'margin:.2rem 0 0' }, el('strong', { text: 'Avoid for: ' }),
                txt(trimText((pick(f, 'use_cases.not_recommended') || []).join('; '), 120)))) : null)
          : null,
        /*
         * Every plate in the catalog is rated for every material, so the sheet
         * carries the bench-relevant summary: which surfaces to reach for,
         * which to avoid, and a count for everything in between.
         */
        Array.isArray(f.plate_recommendations) && f.plate_recommendations.length
          ? (() => {
            const by = new Map(groupByRating(f.plate_recommendations));
            const names = (rating) => (by.get(rating) || [])
              .map((r) => shortName('plates', r.plate_id)).join(', ');
            const middle = ['usable', 'usable-with-prep']
              .reduce((n, k) => n + (by.get(k) || []).length, 0);
            return sheetBlock('Build plates', miniTable([
              ['Use', names('recommended')],
              ['Avoid', names('avoid')],
              ['Also usable', middle ? `${middle} other plate${middle === 1 ? '' : 's'}` : null],
            ]),
            (by.get('recommended') || [])[0] && (by.get('recommended') || [])[0].notes
              ? el('p', { class: 'fine', text: trimText((by.get('recommended') || [])[0].notes, 105) }) : null);
          })() : null,
        has(f.compatibility) ? sheetBlock('Compatibility', miniTable([
          ['Bonds with', (pick(f, 'compatibility.bonds_with') || []).join(', ')],
          ['Supports', (pick(f, 'compatibility.support_materials') || []).join(', ')],
          ['Support for', (pick(f, 'compatibility.usable_as_support_for') || []).join(', ')],
        ])) : null,
        (has(f.feeding) || has(pick(f, 'properties.shore_hardness'))) ? sheetBlock('Feeding & handling',
          el('p', { class: 'vent-headline' },
            amsBadge(pick(f, 'feeding.ams_compatible')),
            txt(' '),
            driveBadge(pick(f, 'feeding.drive_system'))),
          miniTable([
            ['Shore hardness', pick(f, 'properties.shore_hardness')],
            ['Feed assistant', pick(f, 'feeding.feeding_assistant_recommended') === undefined ? null
              : (pick(f, 'feeding.feeding_assistant_recommended') ? 'recommended' : 'not needed')],
          ])) : null,
        (has(f.emissions) || f.safety_notes) ? sheetBlock('Emissions & safety',
          has(pick(f, 'emissions.ventilation'))
            ? el('p', { class: 'vent-headline' }, ventilationBadge(pick(f, 'emissions.ventilation'))) : null,
          miniTable([
            ['VOC level', has(pick(f, 'emissions.voc_level'))
              ? badge(prettyEnum(pick(f, 'emissions.voc_level')), levelTone(pick(f, 'emissions.voc_level'))) : null],
            ['Particulates', has(pick(f, 'emissions.particulate_level'))
              ? badge(prettyEnum(pick(f, 'emissions.particulate_level')), levelTone(pick(f, 'emissions.particulate_level'))) : null],
            ['Emits', trimText((pick(f, 'emissions.primary_emissions') || []).join(', '), 110)],
          ]),
          pick(f, 'emissions.notes') ? el('p', { class: 'fine', text: trimText(pick(f, 'emissions.notes'), 120) }) : null,
          f.safety_notes ? el('p', { class: 'fine', text: trimText(f.safety_notes, 110) }) : null) : null,
        /* One compact line only — the sheet's one-page guarantee comes first. */
        alternativesLine(f, 150) ? sheetBlock('Alternatives',
          el('p', { class: 'fine', text: alternativesLine(f, 150) })) : null),
      el('p', { class: 'fine faint sheet-foot' },
        txt(`Condensed sheet — see the full entry for complete notes. Confidence: ${pick(f, 'provenance.confidence') || 'unknown'}. Filament Field Guide — ${f.id}`))));
}

async function viewPlateSheet(id) {
  const p = await loadEntity('plates', id);
  const compat = Array.isArray(p.filament_compatibility) ? p.filament_compatibility : [];

  return frag(
    backCrumb(`#/plate/${encodeURIComponent(id)}`, 'Full plate page'),
    printButton(),
    el('article', { class: 'sheet' },
      el('h1', { text: p.name || p.id }),
      el('p', { class: 'sheet-sub' },
        txt([prettyEnum(p.texture), p.surface_makeup].filter(has).join(' · ')),
        isPlaceholder(p) ? txt(' · EXAMPLE DATA — pending research') : null),
      p.summary ? el('p', { class: 'fine', text: trimText(p.summary, 260) }) : null,
      el('div', { class: 'sheet-cols' },
        /*
         * Researched plates carry a paragraph-length surface_makeup and long
         * vendor lists; untrimmed they push the sheet onto a second page.
         * The detail page keeps the full text.
         */
        sheetBlock('At a glance', miniTable([
          ['Texture', prettyEnum(p.texture)],
          ['Surface', trimText(p.surface_makeup, 150)],
          ['Temp limits', fmtRange(p.temperature_limits_c, '°C')],
          ['Price', fmtPricePlate(p.price)],
          ['Offered by', trimText(Array.isArray(p.manufacturers) ? p.manufacturers.join(', ') : null, 110)],
          // Product names help identify a plate at the printer; the full list is on the detail page.
          ['Sold as', tradeNameCount(p)
            ? trimText((p.trade_names || []).map((t) => t.product).filter(has).join(', '), 110) : null],
        ])),
        /*
         * A researched plate rates 30-46 materials — one row each would run to
         * several pages. Group by rating and name the materials instead.
         */
        compat.length ? (() => {
          const by = new Map(groupByRating(compat));
          const names = (rating) => (by.get(rating) || [])
            .map((c) => shortName('filaments', c.filament_id)).join(', ');
          return sheetBlock('Filament compatibility',
            el('p', { class: 'fine faint', style: 'margin:0 0 .2rem' },
              txt(`${compat.length} materials rated`)),
            miniTable([
              ['Recommended', names('recommended')],
              ['With prep', names('usable-with-prep') || names('usable')],
              ['Avoid', names('avoid')],
            ]));
        })() : null,
        /*
         * Sheet carries only the plate-killers: the full reasons run to
         * paragraphs and live on the detail page. Item names alone are the
         * actionable part at the printer.
         */
        destroysItems(p.damage_avoidance).length
          ? sheetBlock('Do not use', el('p', { class: 'fine never-line' },
            el('strong', { text: 'Never: ' }),
            txt(destroysItems(p.damage_avoidance).join(' · ')))) : null,
        p.preparation ? sheetBlock('Preparation', el('p', { class: 'fine', text: trimText(p.preparation, 320) })) : null,
        p.cleaning ? sheetBlock('Cleaning', el('p', { class: 'fine', text: trimText(p.cleaning, 320) })) : null,
        p.model_removal ? sheetBlock('Model removal', el('p', { class: 'fine', text: trimText(p.model_removal, 320) })) : null,
        p.stuck_print_recovery ? sheetBlock('Stuck print recovery', el('p', { class: 'fine', text: trimText(p.stuck_print_recovery, 320) })) : null,
        p.lifespan_notes ? sheetBlock('Lifespan', el('p', { class: 'fine', text: trimText(p.lifespan_notes, 320) })) : null),
      el('p', { class: 'fine faint sheet-foot' },
        txt(`Confidence: ${pick(p, 'provenance.confidence') || 'unknown'}. Filament Field Guide — ${p.id}`))));
}

/* ==========================================================================
 * 15. Compare views
 * ========================================================================== */

const FILAMENT_COMPARE_ROWS = [
  { key: 'polymer_class', get: (f) => prettyEnum(f.polymer_class) },
  { key: 'chemical_makeup', get: (f) => f.chemical_makeup },
  { key: 'summary', label: 'Summary', get: (f) => f.summary },
  { key: 'price', label: 'Price', get: (f) => fmtPriceKg(f.price) },
  { key: 'printing.nozzle_temp_c', get: (f) => fmtRange(pick(f, 'printing.nozzle_temp_c'), '°C') },
  { key: 'printing.bed_temp_c', get: (f) => fmtRange(pick(f, 'printing.bed_temp_c'), '°C') },
  { key: 'printing.ambient_temp_c', get: (f) => fmtRange(pick(f, 'printing.ambient_temp_c'), '°C') },
  { key: 'printing.speed_mm_s', get: (f) => fmtRange(pick(f, 'printing.speed_mm_s'), 'mm/s') },
  { key: 'printing.part_cooling_fan_pct', get: (f) => fmtRange(pick(f, 'printing.part_cooling_fan_pct'), '%') },
  { key: 'printing.enclosure_recommended', get: (f) => boolBadge(pick(f, 'printing.enclosure_recommended'), true) },
  { key: 'printing.enclosure_open_for_cooling', get: (f) => boolBadge(pick(f, 'printing.enclosure_open_for_cooling'), false) },
  { key: 'printing.heated_chamber_required', get: (f) => boolBadge(pick(f, 'printing.heated_chamber_required'), true) },
  { key: 'printing.requires_hardened_nozzle', get: (f) => boolBadge(pick(f, 'printing.requires_hardened_nozzle'), true) },
  { key: 'drying.required_before_use', get: (f) => prettyEnum(pick(f, 'drying.required_before_use')) },
  { key: 'drying.temp_c', label: 'Drying temperature', get: (f) => fmtRange(pick(f, 'drying.temp_c'), '°C') },
  { key: 'drying.time_hours', label: 'Drying time', get: (f) => fmtRange(pick(f, 'drying.time_hours'), 'h') },
  { key: 'storage.hygroscopy', get: (f) => prettyEnum(pick(f, 'storage.hygroscopy')) },
  { key: 'properties.density_g_cm3', get: (f) => fmtNum(pick(f, 'properties.density_g_cm3'), 'g/cm³') },
  { key: 'properties.grams_per_100cm3', get: (f) => fmtNum(pick(f, 'properties.grams_per_100cm3'), 'g') },
  { key: 'properties.cm3_per_100g', get: (f) => fmtNum(pick(f, 'properties.cm3_per_100g'), 'cm³') },
  { key: 'properties.shrinkage_pct', get: (f) => fmtRange(pick(f, 'properties.shrinkage_pct'), '%') },
  { key: 'properties.glass_transition_c', get: (f) => fmtNum(pick(f, 'properties.glass_transition_c'), '°C') },
  { key: 'properties.heat_deflection_c', get: (f) => fmtNum(pick(f, 'properties.heat_deflection_c'), '°C') },
  { key: 'properties.max_service_temp_c', get: (f) => fmtNum(pick(f, 'properties.max_service_temp_c'), '°C') },
  { key: 'properties.tensile_strength_mpa', get: (f) => fmtRange(pick(f, 'properties.tensile_strength_mpa'), 'MPa') },
  { key: 'properties.shore_hardness', get: (f) => pick(f, 'properties.shore_hardness') },
  { key: 'feeding.drive_system', get: (f) => driveBadge(pick(f, 'feeding.drive_system')) },
  { key: 'feeding.ams_compatible', get: (f) => amsBadge(pick(f, 'feeding.ams_compatible')) },
  {
    key: 'feeding.feeding_assistant_recommended',
    get: (f) => boolBadge(pick(f, 'feeding.feeding_assistant_recommended'), true),
  },
].concat(SCORE_KEYS.map((k) => ({
  key: `scores.${k}`,
  score: k,
  get: (f) => (isNum(pick(f, `scores.${k}`)) ? scoreInline(k, pick(f, `scores.${k}`)) : null),
}))).concat(Object.keys(SUIT_ORDER).map((k) => ({
  key: `suitability.${k}`,
  get: (f) => (has(pick(f, `suitability.${k}`))
    ? badge(prettyEnum(pick(f, `suitability.${k}`)), suitTone(k, pick(f, `suitability.${k}`)))
    : null),
}))).concat([
  { key: 'use_cases.recommended', label: 'Recommended for', get: (f) => bulletList(pick(f, 'use_cases.recommended')) },
  { key: 'use_cases.not_recommended', label: 'Not recommended for', get: (f) => bulletList(pick(f, 'use_cases.not_recommended')) },
  { key: 'compatibility.bonds_with', get: (f) => refList('filaments', pick(f, 'compatibility.bonds_with')) },
  { key: 'compatibility.support_materials', get: (f) => refList('filaments', pick(f, 'compatibility.support_materials')) },
  {
    key: 'emissions.ventilation',
    get: (f) => ventilationBadge(pick(f, 'emissions.ventilation')),
  },
  {
    key: 'emissions.voc_level',
    get: (f) => (has(pick(f, 'emissions.voc_level'))
      ? badge(prettyEnum(pick(f, 'emissions.voc_level')), levelTone(pick(f, 'emissions.voc_level'))) : null),
  }, {
    key: 'emissions.particulate_level',
    get: (f) => (has(pick(f, 'emissions.particulate_level'))
      ? badge(prettyEnum(pick(f, 'emissions.particulate_level')), levelTone(pick(f, 'emissions.particulate_level'))) : null),
  },
  {
    key: 'alternatives',
    label: 'Alternatives to consider',
    get: (f) => {
      const list = alternativeRows(f);
      if (!list.length) return null;
      const ul = el('ul', { class: 'linklist' });
      for (const alt of list) {
        ul.appendChild(el('li', {},
          refLink('filaments', alt.filament_id, shortName('filaments', alt.filament_id))
            || txt(String(alt.filament_id)),
          alt.reason ? txt(` — ${alt.reason}`) : null));
      }
      return ul;
    },
  },
  { key: 'safety_notes', label: 'Safety', get: (f) => f.safety_notes },
  { key: 'provenance.confidence', label: 'Confidence', get: (f) => confidenceBadge(pick(f, 'provenance.confidence')) },
]);

/** Filament ids a plate rates at a given level, in catalog order. */
function plateRated(p, rating) {
  return (Array.isArray(p.filament_compatibility) ? p.filament_compatibility : [])
    .filter((c) => c.rating === rating)
    .map((c) => c.filament_id);
}

/** Per-filament notes keyed by id, for chip tooltips in the compare view. */
function plateCompatNotes(p) {
  const out = {};
  for (const c of (Array.isArray(p.filament_compatibility) ? p.filament_compatibility : [])) {
    const parts = [fmtRange(c.bed_temp_c, '°C'), c.adhesion_aid ? `aid: ${c.adhesion_aid}` : null, c.notes];
    out[c.filament_id] = parts.filter(has).join(' · ');
  }
  return out;
}

const PLATE_COMPARE_ROWS = [
  { key: 'texture', get: (p) => prettyEnum(p.texture) },
  { key: 'surface_makeup', get: (p) => p.surface_makeup },
  { key: 'summary', label: 'Summary', get: (p) => p.summary },
  { key: 'temperature_limits_c', label: 'Temperature limits', get: (p) => fmtRange(p.temperature_limits_c, '°C') },
  { key: 'price', label: 'Price', get: (p) => fmtPricePlate(p.price) },
  { key: 'manufacturers', label: 'Offered by', get: (p) => (Array.isArray(p.manufacturers) ? p.manufacturers.join(', ') : null) },
  {
    key: 'trade_names',
    label: 'Sold as',
    get: (p) => {
      const n = tradeNameCount(p);
      if (!n) return null;
      const makers = new Set((p.trade_names || []).map((t) => t && t.manufacturer).filter(has));
      return txt(`${n} product${n === 1 ? '' : 's'} from ${makers.size} vendor${makers.size === 1 ? '' : 's'}`);
    },
  },
  {
    key: 'damage_avoidance',
    label: 'Damage avoidance',
    get: (p) => {
      const counts = severityCounts(p.damage_avoidance);
      if (!counts.length) return null;
      const group = el('span', { class: 'badge-group' });
      for (const [severity, n] of counts) group.appendChild(badge(`${n} ${severity}`, severityTone(severity)));
      return group;
    },
  },
  {
    key: 'damage_avoidance.destroys',
    label: 'Never use',
    get: (p) => {
      const items = destroysItems(p.damage_avoidance);
      return items.length ? bulletList(items) : null;
    },
  },
  {
    key: 'filament_compatibility',
    label: 'Materials rated',
    get: (p) => {
      const rows = Array.isArray(p.filament_compatibility) ? p.filament_compatibility : [];
      if (!rows.length) return null;
      const group = el('span', { class: 'badge-group' });
      for (const [rating, list] of groupByRating(rows)) {
        const tone = rating === 'recommended' ? 'good' : rating === 'avoid' ? 'bad' : 'mid';
        group.appendChild(badge(`${RATING_LABEL[rating] || rating}: ${list.length}`, tone));
      }
      return group;
    },
  },
].concat(['recommended', 'usable-with-prep', 'avoid'].map((rating) => ({
  key: `filament_compatibility.${rating}`,
  label: RATING_LABEL[rating] || prettyEnum(rating),
  get: (p) => refChips('filaments', plateRated(p, rating), { titles: plateCompatNotes(p) }),
}))).concat([
  { key: 'preparation', get: (p) => p.preparation },
  { key: 'cleaning', get: (p) => p.cleaning },
  { key: 'model_removal', label: 'Model removal', get: (p) => p.model_removal },
  { key: 'stuck_print_recovery', label: 'Stuck print recovery', get: (p) => p.stuck_print_recovery },
  { key: 'lifespan_notes', label: 'Lifespan', get: (p) => p.lifespan_notes },
  { key: 'provenance.confidence', label: 'Confidence', get: (p) => confidenceBadge(pick(p, 'provenance.confidence')) },
]);

function boolBadge(v, badIsTrue) {
  if (v === undefined || v === null) return null;
  const tone = badIsTrue ? (v ? 'mid' : 'good') : (v ? 'good' : 'neutral');
  return badge(v ? 'yes' : 'no', tone);
}

/**
 * Side-by-side table. Returns { node, matrix } so the export writes exactly the
 * rows that were rendered — including the drop of rows nobody has data for.
 */
function compareTable(entities, rows, kindPath) {
  const matrix = [];
  const head = el('tr', {}, el('th', { class: 'rowhead', scope: 'col' }, 'Property'));
  for (const e of entities) {
    head.appendChild(el('th', { scope: 'col' },
      el('a', { href: `#/${kindPath}/${encodeURIComponent(e.id)}` }, e.name || e.id),
      isPlaceholder(e) ? frag(txt(' '), badge('example', 'example')) : null));
  }
  const body = el('tbody');
  for (const row of rows) {
    const cells = entities.map((e) => row.get(e));
    if (!cells.some((c) => has(c))) continue;   // drop rows nobody has data for
    const tr = el('tr', {}, el('th', { class: 'rowhead', scope: 'row' },
      propLabel(row.key, { label: row.label })));
    const label = row.label || (glossaryFor(row.key) || {}).term || humanizeKey(row.key);
    matrix.push({ property: label, path: row.key, values: cells.map((c) => (has(c) ? nodeText(c) : '')) });
    cells.forEach((c) => {
      tr.appendChild(el('td', { 'data-label': row.label || humanizeKey(row.key) },
        has(c) ? (c instanceof Node ? c : txt(c)) : el('span', { class: 'faint', text: '—' })));
    });
    body.appendChild(tr);
  }
  return {
    node: el('div', { class: 'table-wrap' },
      el('table', { class: 'compare-table' }, el('thead', {}, head), body)),
    matrix,
  };
}

/**
 * Export the comparison matrix: one row per property, one column per entity.
 * Values are the text of what is on screen, so the file matches the page.
 */
function compareExportControl(kind, entities, matrix) {
  const ids = entities.map((e) => e.id);
  const names = entities.map((e) => e.name || e.id);

  const run = (format) => {
    const base = `compare-${kind}-${ids.join('-')}-${todayStamp()}`;
    if (format === 'csv') {
      const rows = matrix.map((row) => [row.property].concat(row.values));
      downloadText(`${base}.csv`, 'text/csv', rowsToCSV(['property'].concat(names), rows));
      return;
    }
    if (format === 'json') {
      const payload = {
        kind,
        generated: new Date().toISOString(),
        entities: entities.map((e) => ({ id: e.id, name: e.name || e.id })),
        properties: matrix.map((row) => {
          const rec = { property: row.property, path: row.path || '' };
          ids.forEach((id, i) => { rec[id] = row.values[i]; });
          return rec;
        }),
      };
      downloadText(`${base}.json`, 'application/json', JSON.stringify(payload, null, 2) + '\n');
      return;
    }
    const out = ['<?xml version="1.0" encoding="UTF-8"?>',
      `<comparison kind="${xmlEscape(kind)}" generated="${xmlEscape(new Date().toISOString())}">`,
      '  <entities>'];
    entities.forEach((e) => {
      out.push(`    <entity id="${xmlEscape(e.id)}" name="${xmlEscape(e.name || e.id)}"/>`);
    });
    out.push('  </entities>');
    for (const row of matrix) {
      out.push(`  <property name="${xmlEscape(row.property)}" path="${xmlEscape(row.path || '')}">`);
      ids.forEach((id, i) => {
        out.push(`    <value entity="${xmlEscape(id)}">${xmlEscape(row.values[i])}</value>`);
      });
      out.push('  </property>');
    }
    out.push('</comparison>');
    downloadText(`${base}.xml`, 'application/xml', out.join('\n') + '\n');
  };

  return el('div', { class: 'export-control row-actions no-print' },
    el('span', { class: 'small faint', text: `Export ${matrix.length} propert${matrix.length === 1 ? 'y' : 'ies'}:` }),
    el('button', { class: 'btn-sm', dataset: { export: 'csv' }, onclick: () => run('csv') }, 'CSV'),
    el('button', { class: 'btn-sm', dataset: { export: 'json' }, onclick: () => run('json') }, 'JSON'),
    el('button', { class: 'btn-sm', dataset: { export: 'xml' }, onclick: () => run('xml') }, 'XML'));
}

async function viewCompare(kind, idsRaw) {
  const ids = String(idsRaw || '').split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean);
  const singular = SINGULAR[kind];
  if (!ids.length) {
    return frag(el('h1', { text: 'Compare' }),
      el('p', { class: 'muted', text: 'No entries selected. Pick two or more rows from a list view.' }),
      el('p', {}, el('a', { class: 'btn', href: `#/${kind}` }, `Back to ${kind}`)));
  }
  const loaded = await Promise.all(ids.map((id) => loadEntity(kind, id).catch(() => ({ id, name: id, __missing: true }))));
  const present = loaded.filter((e) => !e.__missing);
  const missing = loaded.filter((e) => e.__missing).map((e) => e.id);
  const rows = kind === 'filaments' ? FILAMENT_COMPARE_ROWS : PLATE_COMPARE_ROWS;

  // Keep the compare selection in sync so the list view reflects this URL.
  selection[kind] = new Set(present.map((e) => e.id));

  const table = present.length ? compareTable(present, rows, singular) : null;

  return frag(
    backCrumb(`#/${kind}`, `All ${kind}`),
    el('div', { class: 'page-head' },
      el('h1', { text: `Compare ${kind}` }),
      el('p', { class: 'sub', text: present.map((e) => e.name || e.id).join('  vs  ') })),
    missing.length ? el('div', { class: 'banner' }, el('div', {},
      el('strong', { text: 'Not found: ' }), txt(missing.join(', ')))) : null,
    table ? compareExportControl(kind, present, table.matrix) : null,
    table ? table.node : el('p', { class: 'muted', text: 'Nothing to compare.' }),
    el('p', { class: 'small faint no-print', text: 'This URL is shareable — it encodes the exact comparison.' }));
}

/* ==========================================================================
 * 16. Glossary view
 * ========================================================================== */

function viewGlossary() {
  const entries = DATA.glossaryList.slice().sort((a, b) =>
    String(a.term || a.key).localeCompare(String(b.term || b.key)));
  if (!entries.length) {
    return frag(el('h1', { text: 'Glossary' }), el('p', { class: 'muted', text: 'No glossary entries are available.' }));
  }
  const toc = el('ul', { class: 'toc no-print' });
  for (const e of entries) {
    toc.appendChild(el('li', {}, el('a', { href: `#/glossary#${anchorId(e.key)}` }, e.term || e.key)));
  }

  const out = frag(
    el('div', { class: 'page-head' },
      el('h1', { text: 'Glossary' }),
      el('p', { class: 'sub', text: 'Every property in this catalog is defined here. Tooltips across the site read from this same file.' })),
    el('section', { class: 'card no-print' }, el('h2', { text: 'Contents' }), toc));

  for (const e of entries) {
    const rubricKeys = e.rubric ? Object.keys(e.rubric).map(Number).filter((n) => !isNaN(n)).sort((a, b) => b - a) : [];
    const rubricList = rubricKeys.length ? el('ul', { class: 'rubric-list' }) : null;
    for (const k of rubricKeys) {
      rubricList.appendChild(el('li', {},
        el('span', { class: 'rk', text: `${k}/10` }),
        el('span', { text: e.rubric[String(k)] })));
    }
    out.appendChild(el('section', { class: 'card glossary-entry', id: anchorId(e.key) },
      el('h2', { text: e.term || e.key }),
      el('p', { class: 'glossary-key', text: e.key }),
      e.definition ? el('p', { text: e.definition }) : null,
      e.why_it_matters ? el('p', { class: 'muted' }, el('strong', { text: 'Why it matters: ' }), txt(e.why_it_matters)) : null,
      e.units ? el('p', { class: 'small faint', text: `Units: ${e.units}` }) : null,
      isInverted(e.key) ? el('p', { class: 'small' }, badge('inverted scale — 10 is worst', 'mid')) : null,
      rubricList ? frag(el('h3', { text: 'Scoring rubric' }), rubricList) : null,
      Array.isArray(e.see_also) && e.see_also.length
        ? el('p', { class: 'small' }, txt('See also: '), ...e.see_also.map((k, i) => frag(
          i ? txt(', ') : null,
          DATA.glossary.has(k) ? el('a', { href: `#/glossary#${anchorId(k)}` }, (DATA.glossary.get(k).term || k)) : txt(k))))
        : null));
  }
  return out;
}

/* ==========================================================================
 * 17. Router
 * ========================================================================== */

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const hashIdx = raw.indexOf('#');
  const anchor = hashIdx >= 0 ? raw.slice(hashIdx + 1) : '';
  const pathAndQuery = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const qIdx = pathAndQuery.indexOf('?');
  const query = qIdx >= 0 ? pathAndQuery.slice(qIdx + 1) : '';
  const path = qIdx >= 0 ? pathAndQuery.slice(0, qIdx) : pathAndQuery;
  const parts = path.split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch (e) { return p; }
  });
  return { parts, params: new URLSearchParams(query), anchor, raw };
}

function highlightNav(parts) {
  const map = {
    filaments: 'filaments', filament: 'filaments',
    manufacturers: 'manufacturers', manufacturer: 'manufacturers',
    plates: 'plates', plate: 'plates',
    glossary: 'glossary',
  };
  let active = map[parts[0]] || '';
  if (parts[0] === 'compare') active = map[parts[1]] || '';
  for (const a of document.querySelectorAll('#site-nav a')) {
    if (a.dataset.nav === active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function notFound(route) {
  return frag(
    el('h1', { text: 'Page not found' }),
    el('p', { class: 'muted' }, txt('No route matches '), el('code', { text: '#' + route.raw }), txt('.')),
    el('p', {}, el('a', { class: 'btn', href: '#/filaments' }, 'Go to filaments')));
}

function missingEntity(kind, id) {
  return frag(
    el('h1', { text: 'Entry not found' }),
    el('p', { class: 'muted' }, txt(`No ${SINGULAR[kind] || kind} with id `), el('code', { text: String(id) }), txt(' exists in this catalog yet.')),
    el('p', {}, el('a', { class: 'btn', href: `#/${kind}` }, `Browse ${kind}`)));
}

async function resolveRoute(route) {
  const [a, b, c] = route.parts;

  if (!a || a === 'filaments') return viewFilaments(route);
  if (a === 'manufacturers') return viewManufacturers(route);
  if (a === 'plates') return viewPlates(route);
  if (a === 'glossary') return viewGlossary();

  if (a === 'filament' && b) {
    if (!entityExists('filaments', b)) return missingEntity('filaments', b);
    return c === 'sheet' ? viewFilamentSheet(b) : viewFilamentDetail(b);
  }
  if (a === 'manufacturer' && b) {
    if (!entityExists('manufacturers', b)) return missingEntity('manufacturers', b);
    return viewManufacturerDetail(b);
  }
  if (a === 'plate' && b) {
    if (!entityExists('plates', b)) return missingEntity('plates', b);
    return c === 'sheet' ? viewPlateSheet(b) : viewPlateDetail(b);
  }
  if (a === 'compare' && (b === 'filaments' || b === 'plates')) return viewCompare(b, c);

  return notFound(route);
}

function renderFetchError(err) {
  const isFile = location.protocol === 'file:';
  const box = el('div', { class: 'error-box' },
    el('h2', { text: 'Could not load catalog data' }),
    el('p', { text: err && err.message ? err.message : String(err) }));
  if (isFile) {
    box.appendChild(el('p', {},
      txt('The page was opened directly from disk ('),
      el('code', { text: 'file://' }),
      txt('), so the browser blocks reading the JSON data files. Serve the folder over HTTP instead:')));
    box.appendChild(el('p', {}, el('code', { text: 'cd /path/to/this/repo && python -m http.server 8000' })));
    box.appendChild(el('p', {}, txt('then open '), el('code', { text: 'http://localhost:8000/' }), txt('.')));
  } else {
    box.appendChild(el('p', {}, txt('Check that the '), el('code', { text: 'data/' }),
      txt(' directory is published alongside '), el('code', { text: 'index.html' }),
      txt(', and that '), el('code', { text: 'scripts/validate.py' }),
      txt(' has regenerated '), el('code', { text: 'data/index.json' }), txt('.')));
    box.appendChild(el('p', {}, el('button', { class: 'btn-primary', onclick: () => location.reload() }, 'Retry')));
  }
  return box;
}

let renderToken = 0;

/** hashchange entry point: ignores the app's own replaceState writes. */
function onHashChange() {
  if (selfHash !== null && location.hash === selfHash) return;
  router();
}

async function router() {
  const token = ++renderToken;
  selfHash = null;
  const route = parseHash();
  const app = document.getElementById('app');
  highlightNav(route.parts);
  Tooltip.hide();

  clear(app);
  app.appendChild(el('p', { class: 'loading', text: 'Loading…' }));

  let content;
  try {
    await loadIndex();
    await loadGlossary();
    content = await resolveRoute(route);
  } catch (err) {
    if (window.console) console.error(err);
    content = renderFetchError(err);
  }
  if (token !== renderToken) return;   // a newer navigation won

  clear(app);
  app.appendChild(content);

  if (route.anchor) {
    const target = document.getElementById(route.anchor);
    if (target) { target.scrollIntoView({ block: 'start' }); return; }
  }
  window.scrollTo(0, 0);
}

/* ==========================================================================
 * 18. Boot
 * ========================================================================== */

/** Printing must show everything, including collapsed rating groups. */
function setupPrintExpansion() {
  window.addEventListener('beforeprint', () => {
    for (const d of document.querySelectorAll('details.group:not([open])')) {
      d.dataset.printExpanded = '1';
      d.open = true;
    }
  });
  window.addEventListener('afterprint', () => {
    for (const d of document.querySelectorAll('details.group[data-print-expanded]')) {
      d.open = false;
      delete d.dataset.printExpanded;
    }
  });
}

function boot() {
  Tooltip.init();
  setupPrintExpansion();
  window.addEventListener('hashchange', onHashChange);
  if (!location.hash) location.replace('#/filaments');
  router();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
