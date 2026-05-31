#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const GLOBAL_TIMEOUT_MS = 180000;
const SECTION_TIMEOUT_MS = 30000;
const auditStartTime = Date.now();

const watchdog = setTimeout(() => {
  process.stderr.write('\nABSOLUTE DEEP AUDIT bootstrap timeout: exceeded 180 seconds.\n');
  process.exit(2);
}, GLOBAL_TIMEOUT_MS);

const registry = require(path.join(root, 'src', 'scientific-parameters.js'));
const {
  SCIENTIFIC_PARAMETER_REGISTRY,
  SCIENTIFIC_PARAMETER_ORDER,
  SCIENTIFIC_PRESETS
} = registry;

const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const packagePath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const productionFiles = [
  'index.html',
  '404.html',
  ...safeRgFiles('src'),
  ...safeRgFiles('docs').filter(file => file.endsWith('.md')),
  'README.md',
  'LICENSE.md',
  'CITATION.cff',
  'package.json'
].filter((file, index, arr) => arr.indexOf(file) === index && fs.existsSync(path.join(root, file)));

const audit = {
  currentSection: null,
  assertions: 0,
  failures: [],
  sections: [],
  capturedWarnings: [],
  capturedErrors: []
};

function safeRgFiles(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  const out = [];
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) walk(abs);
      else out.push(path.relative(root, abs).replace(/\\/g, '/'));
    }
  };
  walk(full);
  return out;
}

function stringifyContext(context) {
  if (context === undefined) return '';
  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return String(context);
  }
}

function recordFailure(message, context = {}) {
  audit.failures.push({
    section: audit.currentSection || 'Bootstrap',
    message,
    context
  });
}

function assert(condition, message, context = {}) {
  audit.assertions += 1;
  if (!condition) recordFailure(message, context);
}

function assertApproxEqual(a, b, tolerance, message, context = {}) {
  const actual = Number(a);
  const expected = Number(b);
  const ok =
    Number.isFinite(actual) &&
    Number.isFinite(expected) &&
    Math.abs(actual - expected) <= tolerance;
  assert(ok, message, { expected, actual, tolerance, ...context });
}

function assertRelApproxEqual(a, b, relTolerance, message, context = {}) {
  const actual = Number(a);
  const expected = Number(b);
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assertApproxEqual(actual, expected, scale * relTolerance, message, context);
}

function assertDeepEqual(a, b, message, context = {}) {
  const actual = stableJson(a);
  const expected = stableJson(b);
  assert(actual === expected, message, { expected: b, actual: a, ...context });
}

function stableJson(value) {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v).sort().reduce((out, key) => {
        out[key] = v[key];
        return out;
      }, {});
    }
    return v;
  });
}

async function section(name, fn) {
  audit.currentSection = name;
  const beforeAssertions = audit.assertions;
  const beforeFailures = audit.failures.length;
  const start = Date.now();
  process.stdout.write(`\n[ABSOLUTE] ${name}\n`);

  try {
    await fn();
  } catch (error) {
    recordFailure('Section threw an unexpected error.', {
      error: error && error.stack ? error.stack : String(error)
    });
  }

  const elapsed = Date.now() - start;
  if (elapsed > SECTION_TIMEOUT_MS) {
    recordFailure('Section exceeded bounded runtime target.', {
      elapsedMs: elapsed,
      limitMs: SECTION_TIMEOUT_MS
    });
  }

  const assertions = audit.assertions - beforeAssertions;
  const failures = audit.failures.length - beforeFailures;
  const status = failures ? 'FAIL' : 'PASS';
  audit.sections.push({ name, status, assertions, failures, elapsedMs: elapsed });
  process.stdout.write(`${status}: ${name} (${assertions} assertions, ${failures} failures, ${elapsed} ms)\n`);
}

function parseAttrs(attrSource) {
  const attrs = {};
  const regex = /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/=`]+)))?/g;
  let match;
  while ((match = regex.exec(attrSource || ''))) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function toDatasetKey(name) {
  return name.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }

  sync() {
    this.owner._className = [...this.values].join(' ');
  }

  setFromString(value) {
    this.values = new Set(String(value || '').split(/\s+/).filter(Boolean));
    this.sync();
  }

  add(...names) {
    names.filter(Boolean).forEach(name => this.values.add(name));
    this.sync();
  }

  remove(...names) {
    names.filter(Boolean).forEach(name => this.values.delete(name));
    this.sync();
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.values.has(name) : !!force;
    if (shouldAdd) this.values.add(name);
    else this.values.delete(name);
    this.sync();
    return shouldAdd;
  }

  contains(name) {
    return this.values.has(name);
  }

  toString() {
    return [...this.values].join(' ');
  }
}

class FakeElement {
  constructor(tagName = 'div', attrs = {}, ownerDocument = null) {
    this.ownerDocument = ownerDocument;
    this.tagName = String(tagName || 'div').toUpperCase();
    this.nodeName = this.tagName;
    this.id = attrs.id || '';
    this.type = attrs.type || '';
    this.value = Object.prototype.hasOwnProperty.call(attrs, 'value') ? String(attrs.value) : '';
    this.checked = Object.prototype.hasOwnProperty.call(attrs, 'checked');
    this.disabled = Object.prototype.hasOwnProperty.call(attrs, 'disabled');
    this.href = attrs.href || '';
    this.rel = attrs.rel || '';
    this.target = attrs.target || '';
    this.download = attrs.download || '';
    this.attributes = { ...attrs };
    this.dataset = {};
    this.style = {
      display: attrs.style && /display\s*:\s*none/i.test(attrs.style) ? 'none' : '',
      textAlign: '',
      color: '',
      padding: '',
      left: '',
      top: '',
      opacity: '',
      setProperty(name, value) {
        this[name] = value;
      }
    };
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this._innerHTML = '';
    this._textContent = '';
    this._className = '';
    this.classList = new FakeClassList(this);

    if (attrs.class) this.classList.setFromString(attrs.class);
    for (const [name, value] of Object.entries(attrs)) {
      if (name.startsWith('data-')) this.dataset[toDatasetKey(name)] = value;
    }
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? '');
    this._textContent = stripHtml(this._innerHTML);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value ?? '');
    this._innerHTML = this._textContent;
  }

  get innerText() {
    return this.textContent || stripHtml(this.innerHTML);
  }

  set innerText(value) {
    this.textContent = value;
  }

  setAttribute(name, value) {
    const normalized = String(value);
    this.attributes[name] = normalized;
    if (name === 'class') this.className = normalized;
    if (name === 'id') this.id = normalized;
    if (name.startsWith('data-')) this.dataset[toDatasetKey(name)] = normalized;
    if (name === 'href') this.href = normalized;
    if (name === 'rel') this.rel = normalized;
    if (name === 'target') this.target = normalized;
    if (name === 'download') this.download = normalized;
    if (name === 'aria-pressed') this.ariaPressed = normalized;
  }

  getAttribute(name) {
    if (name === 'class') return this.className || null;
    if (name === 'id') return this.id || null;
    if (name === 'href') return this.href || null;
    if (name === 'rel') return this.rel || null;
    if (name === 'target') return this.target || null;
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }

  prepend(child) {
    if (child) {
      child.parentNode = this;
      this.children.unshift(child);
    }
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    if (child) child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
      this.parentNode.removeChild(this);
    }
  }

  cloneNode(deep = false) {
    const clone = new FakeElement(this.tagName, { ...this.attributes }, this.ownerDocument);
    clone.value = this.value;
    clone.checked = this.checked;
    clone.disabled = this.disabled;
    clone.innerHTML = this.innerHTML;
    clone.textContent = this.textContent;
    clone.dataset = { ...this.dataset };
    clone.href = this.href;
    clone.rel = this.rel;
    clone.target = this.target;
    if (deep) this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
    return clone;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(eventOrType, init = {}) {
    const event =
      typeof eventOrType === 'string'
        ? { type: eventOrType, ...init }
        : { ...(eventOrType || {}) };
    event.type = event.type || init.type;
    event.target = event.target || this;
    event.currentTarget = this;
    event.preventDefault = event.preventDefault || function preventDefault() {};
    event.stopPropagation = event.stopPropagation || function stopPropagation() {};
    for (const handler of this.listeners[event.type] || []) handler.call(this, event);
    return true;
  }

  click() {
    return this.dispatchEvent('click');
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const all = [];
    const collect = node => {
      for (const child of node.children || []) {
        all.push(child);
        collect(child);
      }
    };
    collect(this);

    if (/input\[id\],\s*select\[id\],\s*textarea\[id\]/.test(selector)) {
      return this.ownerDocument
        ? this.ownerDocument.querySelectorAll('input[id], select[id], textarea[id]')
        : [];
    }
    return all.filter(el => matchesSelector(el, selector));
  }

  insertAdjacentHTML(position, html) {
    if (position === 'afterbegin') this.innerHTML = String(html) + this.innerHTML;
    else this.innerHTML += String(html);
  }

  getContext() {
    return {
      clearRect() {},
      fillRect() {},
      beginPath() {},
      arc() {},
      fill() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      createRadialGradient() {
        return { addColorStop() {} };
      },
      createLinearGradient() {
        return { addColorStop() {} };
      }
    };
  }
}

function matchesSelector(el, selector) {
  if (!el || !selector) return false;
  const selectors = String(selector).split(',').map(s => s.trim()).filter(Boolean);
  return selectors.some(sel => matchesSingleSelector(el, sel));
}

function matchesSingleSelector(el, selector) {
  if (selector.includes(' ')) {
    const parts = selector.split(/\s+/);
    return matchesSingleSelector(el, parts[parts.length - 1]);
  }

  if (selector === '*') return true;
  if (selector === 'input[id]') return el.tagName === 'INPUT' && !!el.id;
  if (selector === 'select[id]') return el.tagName === 'SELECT' && !!el.id;
  if (selector === 'textarea[id]') return el.tagName === 'TEXTAREA' && !!el.id;
  if (selector === 'input') return el.tagName === 'INPUT';
  if (selector === 'select') return el.tagName === 'SELECT';
  if (selector === 'textarea') return el.tagName === 'TEXTAREA';
  if (selector === 'button') return el.tagName === 'BUTTON';
  if (selector === 'a') return el.tagName === 'A';

  const dataMatch = selector.match(/^\[data-([A-Za-z0-9_-]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
  if (dataMatch) {
    const key = dataMatch[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!Object.prototype.hasOwnProperty.call(el.dataset, key)) return false;
    return dataMatch[2] === undefined || String(el.dataset[key]) === dataMatch[2];
  }

  const classDataMatch = selector.match(/^\.([A-Za-z0-9_-]+)\[data-([A-Za-z0-9_-]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
  if (classDataMatch) {
    const cls = classDataMatch[1];
    const key = classDataMatch[2].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!el.classList.contains(cls)) return false;
    if (!Object.prototype.hasOwnProperty.call(el.dataset, key)) return false;
    return classDataMatch[3] === undefined || String(el.dataset[key]) === classDataMatch[3];
  }

  if (selector.startsWith('#')) return el.id === selector.slice(1);
  if (selector.startsWith('.')) {
    const classes = selector.split('.').filter(Boolean);
    return classes.every(cls => el.classList.contains(cls));
  }
  return el.tagName.toLowerCase() === selector.toLowerCase();
}

class FakeDocument {
  constructor(html) {
    this.elements = [];
    this.elementsById = new Map();
    this.body = this.createElement('body');
    this.head = this.createElement('head');
    this.documentElement = this.createElement('html');
    this._loadFromHtml(html);
  }

  _loadFromHtml(html) {
    const tagRegex = /<([A-Za-z][A-Za-z0-9:-]*)([^<>]*?)>/g;
    let match;
    while ((match = tagRegex.exec(html))) {
      const tagName = match[1].toLowerCase();
      if (tagName.startsWith('!') || tagName === 'script' || tagName === 'link' || tagName === 'meta') continue;
      const attrs = parseAttrs(match[2]);
      const el = new FakeElement(tagName, attrs, this);
      this._register(el);
    }
    this._ensureRequiredHarnessElements();
  }

  _register(el) {
    el.ownerDocument = this;
    this.elements.push(el);
    if (el.id) this.elementsById.set(el.id, el);
    this.body.appendChild(el);
    return el;
  }

  _ensure(id, tagName = 'div', attrs = {}) {
    if (this.elementsById.has(id)) return this.elementsById.get(id);
    return this._register(new FakeElement(tagName, { id, ...attrs }, this));
  }

  _ensureRequiredHarnessElements() {
    const extraIds = [
      'scale-linear',
      'scale-log',
      'copy-tooltip',
      'calc-console',
      'calc-console-panel',
      'nt-chart-svg-wrap',
      'nt-meta',
      'adv-ghz-result',
      'adv-vol-note',
      'adv-long-note',
      'adv-ard-result',
      'adv-temporal-timeline',
      'adv-temporal-text',
      'detection-results'
    ];
    extraIds.forEach(id => this._ensure(id));

    for (const id of SCIENTIFIC_PARAMETER_ORDER) {
      this._ensure(id, 'input');
      this._ensure(`${id}_min`, 'input');
      this._ensure(`${id}_max`, 'input');
      this._ensure(`card-${id}`, 'div', { class: 'input-card' });
    }
  }

  createElement(tagName) {
    return new FakeElement(tagName, {}, this);
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    if (selector === '#share-buttons a') {
      return this.elements.filter(el => el.tagName === 'A' && /^share-/.test(el.id));
    }
    if (/^#[^\s]+\s+/.test(selector)) {
      const [, childSelector] = selector.match(/^#[^\s]+\s+(.+)$/);
      return this.elements.filter(el => matchesSelector(el, childSelector));
    }
    if (/input\[id\],\s*select\[id\],\s*textarea\[id\]/.test(selector)) {
      return this.elements.filter(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !!el.id);
    }
    return this.elements.filter(el => matchesSelector(el, selector));
  }

  addEventListener() {}
}

function createHarness() {
  const document = new FakeDocument(indexHtml);
  const loadHandlers = [];
  const errors = [];
  const warnings = [];
  const unhandled = [];

  const sandbox = {
    document,
    console: {
      log() {},
      info() {},
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      error(...args) {
        errors.push(args.map(String).join(' '));
      }
    },
    navigator: {
      clipboard: {
        writeText() {
          return Promise.resolve();
        }
      }
    },
    location: {
      href: 'https://example.test/index.html',
      search: '',
      hash: '',
      origin: 'https://example.test',
      pathname: '/index.html'
    },
    localStorage: createLocalStorage(),
    Blob,
    URL: {
      createObjectURL() {
        return 'blob:absolute-audit';
      },
      revokeObjectURL() {}
    },
    URLSearchParams,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    RegExp,
    parseFloat,
    parseInt,
    isNaN,
    setTimeout(fn) {
      if (typeof fn === 'function') fn();
      return 1;
    },
    clearTimeout() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    getComputedStyle(el) {
      return {
        display: (el && el.style && el.style.display) || 'block'
      };
    },
    Event: class Event {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    },
    ApexCharts: class ApexCharts {
      constructor(el, options) {
        this.el = el;
        this.options = options || {};
        if (this.el) this.el.__chart = this;
      }
      render() {
        if (this.el) {
          this.el.innerHTML = '<div data-audit-chart="rendered"></div>';
          this.el.__chartOptions = this.options;
        }
        return Promise.resolve();
      }
      updateOptions(options) {
        this.options = { ...this.options, ...(options || {}) };
        if (this.el) {
          this.el.__chartOptions = this.options;
          this.el.innerHTML = '<div data-audit-chart="updated"></div>';
        }
        return Promise.resolve();
      }
      updateSeries(series) {
        this.options = { ...this.options, series: series || [] };
        if (this.el) {
          this.el.__chartSeries = series || [];
          this.el.innerHTML = '<div data-audit-chart="series-updated"></div>';
        }
        return Promise.resolve();
      }
      destroy() {}
    },
    MathJax: {
      typesetClear() {},
      typesetPromise() {
        return Promise.resolve();
      }
    },
    addEventListener(type, handler) {
      if (type === 'load') loadHandlers.push(handler);
    },
    removeEventListener() {},
    innerWidth: 1280,
    innerHeight: 720
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  const context = vm.createContext(sandbox);
  const scriptRefs = [...indexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
    .map(match => match[1])
    .filter(src => !/^https?:\/\//i.test(src));

  try {
    for (const ref of scriptRefs) {
      const cleanRef = ref.split('?')[0];
      const full = path.join(root, cleanRef);
      const code = fs.readFileSync(full, 'utf8');
      vm.runInContext(code, context, { filename: cleanRef });
    }
    bindInlineHandlers(document, context);
    for (const handler of loadHandlers) handler.call(context);
  } catch (error) {
    errors.push(error && error.stack ? error.stack : String(error));
  }

  const helpers = buildHarnessHelpers(document, context, errors, warnings, unhandled);
  return helpers;
}

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    _dump() {
      return Object.fromEntries(store.entries());
    }
  };
}

function bindInlineHandlers(document, context) {
  for (const el of document.elements) {
    const onclick = el.getAttribute('onclick');
    if (onclick) {
      el.addEventListener('click', event => {
        context.event = event;
        vm.runInContext(onclick, context, { filename: `inline onclick ${el.id || el.tagName}` });
      });
    }
  }
}

function buildHarnessHelpers(document, context, errors, warnings, unhandled) {
  const run = code => vm.runInContext(code, context, { filename: 'absolute-audit-helper.js' });

  const helperSource = `
    ({
      hasFunction(name) { return typeof globalThis[name] === 'function'; },
      byId(id) { return document.getElementById(id); },
      setInputValue(id, value) {
        const el = document.getElementById(id);
        if (!el) throw new Error('Missing element ' + id);
        el.value = String(value);
        return el.value;
      },
      dispatchInput(id) {
        const el = document.getElementById(id);
        if (!el) throw new Error('Missing element ' + id);
        el.dispatchEvent('input');
      },
      dispatchChange(id) {
        const el = document.getElementById(id);
        if (!el) throw new Error('Missing element ' + id);
        el.dispatchEvent('change');
      },
      click(id) {
        const el = document.getElementById(id);
        if (!el) throw new Error('Missing element ' + id);
        el.click();
      },
      getNumber(id) {
        const el = document.getElementById(id);
        if (!el) return NaN;
        const parsed = parseFloat(el.value);
        return Number.isFinite(parsed) ? parsed : NaN;
      },
      snapshotAllScientificInputs() {
        const out = {};
        ${JSON.stringify(SCIENTIFIC_PARAMETER_ORDER)}.forEach(id => {
          const el = document.getElementById(id);
          out[id] = el ? String(el.value) : null;
        });
        return out;
      },
      snapshotAllBounds() {
        const out = {};
        ${JSON.stringify(SCIENTIFIC_PARAMETER_ORDER)}.forEach(id => {
          const minEl = document.getElementById(id + '_min');
          const maxEl = document.getElementById(id + '_max');
          out[id] = {
            min: minEl ? String(minEl.value) : null,
            max: maxEl ? String(maxEl.value) : null
          };
        });
        return out;
      },
      snapshotScenarioState() {
        return typeof getScenarioState === 'function' ? getScenarioState() : null;
      },
      runDeterministic() {
        return typeof calculateDeterministic === 'function' ? calculateDeterministic() : null;
      },
      runMonteCarlo(options = {}) {
        return typeof monteCarloCalculate === 'function'
          ? monteCarloCalculate({ samples: 96, seed: 20260531, distribution: 'lognormal', engine: 'standard', correlation: 'independent', ...options })
          : null;
      },
      independentProduct() {
        return ${JSON.stringify(SCIENTIFIC_PARAMETER_ORDER)}
          .reduce((product, id) => {
            const el = document.getElementById(id);
            const value = el ? parseFloat(el.value) : 1;
            if (!Number.isFinite(value)) return product;
            if (id === 'f_H2O' && typeof isH2OEnabled !== 'undefined' && !isH2OEnabled) return product;
            if (id === 'f_CHNOPS' && typeof isCHNOPSEnabled !== 'undefined' && !isCHNOPSEnabled) return product;
            if (id === 'f_complex_life' && typeof isComplexLifeEnabled !== 'undefined' && !isComplexLifeEnabled) return product;
            if (id === 'f_x' && typeof isXEnabled !== 'undefined' && !isXEnabled) return product;
            return product * value;
          }, 1);
      },
      loadPreset(name) { return typeof loadPreset === 'function' ? loadPreset(name) : null; },
      setBayesian(mode) { return typeof setBayesian === 'function' ? setBayesian(mode) : null; },
      calculateDistanceToNearestPlanet() { return typeof calculateDistanceToNearestPlanet === 'function' ? calculateDistanceToNearestPlanet() : null; },
      applyGalaxyPresetSelection(key) { return typeof applyGalaxyPresetSelection === 'function' ? applyGalaxyPresetSelection(key) : null; },
      getMonteCarloOptions(options = {}) { return typeof getMonteCarloOptions === 'function' ? getMonteCarloOptions(options) : null; },
      getMonteCarloBoundsDescriptor(options) { return typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor(options) : null; },
      getMonteCarloBoundsBlockingErrors(descriptor) { return typeof getMonteCarloBoundsBlockingErrors === 'function' ? getMonteCarloBoundsBlockingErrors(descriptor) : []; },
      getParamSamplingState(id, descriptor) { return typeof getParamSamplingState === 'function' ? getParamSamplingState(id, descriptor) : null; },
      getConfigurationWarnings() { return typeof getConfigurationWarnings === 'function' ? getConfigurationWarnings() : []; },
      invalidateScenarioResults(clearDeterministic) { return typeof invalidateScenarioResults === 'function' ? invalidateScenarioResults(clearDeterministic) : null; },
      invalidateResults(markCustom, clearDeterministic) { return typeof invalidateResults === 'function' ? invalidateResults(markCustom, clearDeterministic) : null; },
      invalidateDisplayOrDistanceOnly(clearDeterministic) { return typeof invalidateDisplayOrDistanceOnly === 'function' ? invalidateDisplayOrDistanceOnly(clearDeterministic) : null; },
      applyProbabilityClamp(id) { return typeof applyProbabilityClamp === 'function' ? applyProbabilityClamp(id) : null; },
      clearAllClampWarnings(ids) { return typeof clearAllClampWarnings === 'function' ? clearAllClampWarnings(ids) : null; },
      buildJSONExportSnapshot() { return typeof buildJSONExportSnapshot === 'function' ? buildJSONExportSnapshot() : null; },
      buildLatexExportText() { return typeof buildLatexExportText === 'function' ? buildLatexExportText() : ''; },
      buildShareSummary() { return typeof buildShareSummary === 'function' ? buildShareSummary() : ''; },
      saveHistoryEntry() { return typeof saveHistoryEntry === 'function' ? saveHistoryEntry() : null; },
      readHistoryStore() { return typeof readHistoryStore === 'function' ? readHistoryStore() : { items: [] }; },
      clearHistoryStore() { return typeof clearHistoryStore === 'function' ? clearHistoryStore() : null; },
      buildUniverseScaleHtml(mode) { return typeof buildUniverseScaleHtml === 'function' ? buildUniverseScaleHtml(mode) : ''; },
      getUniverseScaleBasis(mode) { return typeof getUniverseScaleBasis === 'function' ? getUniverseScaleBasis(mode) : null; },
      getActiveDistanceSnapshot() { return typeof getActiveDistanceSnapshot === 'function' ? getActiveDistanceSnapshot() : null; },
      getMonteCarloState() { return typeof getMonteCarloState === 'function' ? getMonteCarloState() : null; },
      setAdvancedModule(key, enabled) {
        if (typeof ADV === 'undefined' || !ADV.modules || !ADV.modules[key]) return false;
        ADV.enabled = Object.values(ADV.modules).some(module => module.enabled) || !!enabled;
        ADV.modules[key].enabled = !!enabled;
        if (!enabled) ADV.enabled = Object.values(ADV.modules).some(module => module.enabled);
        return true;
      },
      getAdvancedState() {
        if (typeof ADV === 'undefined') return null;
        return {
          enabled: ADV.enabled,
          modules: Object.fromEntries(Object.entries(ADV.modules).map(([k, v]) => [k, !!v.enabled]))
        };
      },
      getRuntimeSnapshot() {
        return {
          deterministicPlanets: typeof deterministicPlanets !== 'undefined' ? deterministicPlanets : null,
          hasDeterministicCalculation: typeof hasDeterministicCalculation !== 'undefined' ? hasDeterministicCalculation : null,
          simulationCompleted: typeof simulationCompleted !== 'undefined' ? simulationCompleted : null,
          monteCarloState: typeof monteCarloState !== 'undefined' ? monteCarloState : null,
          mcMedianQ50: typeof mcMedianQ50 !== 'undefined' ? mcMedianQ50 : null,
          mcArithmeticMean: typeof mcArithmeticMean !== 'undefined' ? mcArithmeticMean : null,
          mcQ025: typeof mcQ025 !== 'undefined' ? mcQ025 : null,
          mcQ975: typeof mcQ975 !== 'undefined' ? mcQ975 : null,
          activePreset: typeof activePreset !== 'undefined' ? activePreset : null,
          scenarioState: typeof scenarioState !== 'undefined' ? scenarioState : null,
          bayesianMode: typeof bayesianMode !== 'undefined' ? bayesianMode : null,
          galaxyName: typeof galaxyName !== 'undefined' ? galaxyName : null,
          lastResultsLength: typeof lastResults !== 'undefined' && Array.isArray(lastResults) ? lastResults.length : null,
          monteCarloBoundsMode: typeof monteCarloBoundsMode !== 'undefined' ? monteCarloBoundsMode : null,
          monteCarloBoundsLabel: typeof monteCarloBoundsLabel !== 'undefined' ? monteCarloBoundsLabel : null,
          chartStale: {
            monteCarloChart: (document.getElementById('monteCarloChart') || { dataset: {} }).dataset.stale,
            gaussianChart: (document.getElementById('gaussianChart') || { dataset: {} }).dataset.stale
          }
        };
      },
      getHtml(id) {
        const el = document.getElementById(id);
        return el ? String(el.innerHTML || '') : '';
      },
      getText(id) {
        const el = document.getElementById(id);
        return el ? String(el.textContent || el.innerText || el.innerHTML || '') : '';
      },
      getValue(id) {
        const el = document.getElementById(id);
        return el ? String(el.value) : '';
      },
      getDataset(id, key) {
        const el = document.getElementById(id);
        return el && el.dataset ? el.dataset[key] : undefined;
      },
      galaxyPresetKeys() {
        return typeof GALAXY_PRESET_MAP !== 'undefined' ? Object.keys(GALAXY_PRESET_MAP) : [];
      },
      galaxyPresetMap() {
        return typeof GALAXY_PRESET_MAP !== 'undefined' ? JSON.parse(JSON.stringify(GALAXY_PRESET_MAP)) : {};
      },
      baseSampleIds() {
        return typeof BASE_SAMPLE_IDS !== 'undefined' ? BASE_SAMPLE_IDS.slice() : [];
      },
      probabilityFields() {
        return typeof PROBABILITY_FIELDS_GLOBAL !== 'undefined' ? Array.from(PROBABILITY_FIELDS_GLOBAL) : [];
      },
      runExistingFunction(name, ...args) {
        if (typeof globalThis[name] !== 'function') return undefined;
        return globalThis[name](...args);
      }
    })
  `;

  const api = run(helperSource);
  return {
    document,
    context,
    errors,
    warnings,
    unhandled,
    ...api
  };
}

function loadCleanPreset(h, key = 'kepler') {
  h.loadPreset(key);
  h.runDeterministic();
  const snapshot = h.getRuntimeSnapshot();
  assert(snapshot.hasDeterministicCalculation === true, `${key}: deterministic calculation completed`, snapshot);
  return snapshot;
}

function runSeededMc(h, options = {}) {
  const summary = h.runMonteCarlo({
    samples: options.samples || 96,
    seed: options.seed || 20260531,
    mcMode: options.mcMode,
    distribution: options.distribution || 'lognormal',
    engine: options.engine || 'standard',
    correlation: options.correlation || 'independent',
    updateUi: options.updateUi
  });
  return summary;
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function snapshotVisibleHash(h) {
  return stableJson({
    inputs: h.snapshotAllScientificInputs(),
    bounds: h.snapshotAllBounds(),
    scenario: h.snapshotScenarioState(),
    descriptor: h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'auto' }))
  });
}

function mutateValueString(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '1';
  if (n === 0) return '1';
  if (Math.abs(n) < 1) return String(Math.min(1, n * 0.91));
  return String(n * 0.91);
}

function independentProductFromPreset(presetKey) {
  const preset = SCIENTIFIC_PRESETS[presetKey];
  return SCIENTIFIC_PARAMETER_ORDER.reduce((product, id) => {
    if (id === 'f_H2O' && preset.enableH2O === false) return product;
    if (id === 'f_CHNOPS' && preset.enableCHNOPS === false) return product;
    if (id === 'f_complex_life' && !preset.enableComplex) return product;
    if (id === 'f_x' && !preset.enableX) return product;
    return product * preset.values[id];
  }, 1);
}

function localScriptRefs() {
  return [...indexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
    .map(match => match[1])
    .filter(src => !/^https?:\/\//i.test(src));
}

function localHrefRefs() {
  return [...indexHtml.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)]
    .map(match => match[1])
    .filter(ref =>
      !/^https?:\/\//i.test(ref) &&
      !/^mailto:/i.test(ref) &&
      !/^#/i.test(ref) &&
      !/^data:/i.test(ref)
    );
}

function runNodeScript(relativePath, args = [], timeout = 25000) {
  const scriptPath = path.join(root, relativePath);
  if (!fs.existsSync(scriptPath)) {
    return { status: 'missing', stdout: '', stderr: `${relativePath} missing` };
  }
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024 * 12
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error) : ''
  };
}

await section('Bootstrap', () => {
  const h = createHarness();
  assert(Array.isArray(h.errors), 'Harness error capture initialized');
  assert(Array.isArray(h.warnings), 'Harness warning capture initialized');
  assert(h.errors.length === 0, 'No bootstrap/runtime exception during controlled DOM initialization', {
    errors: h.errors
  });
  assert(typeof h.byId === 'function', 'byId helper exists');
  assert(typeof h.setInputValue === 'function', 'setInputValue helper exists');
  assert(typeof h.dispatchInput === 'function', 'dispatchInput helper exists');
  assert(typeof h.dispatchChange === 'function', 'dispatchChange helper exists');
  assert(typeof h.click === 'function', 'click helper exists');
  assert(typeof h.getNumber === 'function', 'getNumber helper exists');
  assert(typeof h.snapshotAllScientificInputs === 'function', 'snapshotAllScientificInputs helper exists');
  assert(typeof h.snapshotAllBounds === 'function', 'snapshotAllBounds helper exists');
  assert(typeof h.snapshotScenarioState === 'function', 'snapshotScenarioState helper exists');
  assert(typeof h.runDeterministic === 'function', 'runDeterministic helper exists');
  assert(typeof h.runMonteCarlo === 'function', 'runMonteCarlo helper exists');
});

await section('Static Integrity', () => {
  const requiredFiles = [
    'index.html',
    'src',
    'package.json',
    'tools',
    '404.html',
    'README.md',
    'LICENSE.md',
    '.nojekyll'
  ];
  for (const rel of requiredFiles) assert(fs.existsSync(path.join(root, rel)), `Required repository item exists: ${rel}`);

  const citationReferenced = productionFiles.some(rel => fs.readFileSync(path.join(root, rel), 'utf8').includes('CITATION.cff'));
  if (citationReferenced) assert(fs.existsSync(path.join(root, 'CITATION.cff')), 'CITATION.cff exists because it is referenced');

  const ids = [...indexHtml.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert(duplicateIds.length === 0, 'No duplicate HTML ids in index.html', { duplicateIds });

  const criticalIds = [
    'N_GHZ',
    'N_GHZ_min',
    'N_GHZ_max',
    'sampling_uncertainty',
    'mc-basis-mode',
    'iterations',
    'distribution',
    'simulation-engine',
    'bayes-pre',
    'bayes-post'
  ];
  for (const id of criticalIds) assert(ids.includes(id), `Critical id exists: ${id}`, { id });

  const allText = productionFiles.map(rel => [rel, fs.readFileSync(path.join(root, rel), 'utf8')]);
  const debugMarker = 'debu' + 'gger';
  for (const [rel, text] of allText) {
    assert(!/<<<<<<<|=======|>>>>>>/.test(text), `No unresolved merge marker in ${rel}`, { file: rel });
    assert(!(new RegExp(`\\b${debugMarker}\\s*;`)).test(text), `No debug statement in ${rel}`, { file: rel });
  }

  const consoleLogMarker = 'console.' + 'log';
  const prodConsoleLogs = safeRgFiles('src')
    .filter(rel => /\.(js|css|html)$/.test(rel))
    .flatMap(rel => {
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      return [...text.matchAll(new RegExp(`\\b${consoleLogMarker.replace('.', '\\.')}\\s*\\(`, 'g'))].map(match => ({ file: rel, index: match.index }));
    });
  assert(prodConsoleLogs.length === 0, 'No accidental production logging calls in src files', { prodConsoleLogs });

  for (const ref of localScriptRefs()) {
    const clean = ref.split('?')[0];
    assert(fs.existsSync(path.join(root, clean)), `Local script reference exists: ${ref}`, { ref });
  }
  for (const ref of localHrefRefs()) {
    const clean = ref.split('?')[0];
    if (/^src\/styles\.css/.test(clean) || /\.(png|jpg|jpeg|webp|svg|gif|ico|css|js)$/i.test(clean)) {
      assert(fs.existsSync(path.join(root, clean)), `Local asset/style reference exists: ${ref}`, { ref });
    }
  }

  const handlerAttrs = [...indexHtml.matchAll(/<([A-Za-z][A-Za-z0-9:-]*)([^<>]*?)>/g)]
    .flatMap(match =>
      Object.entries(parseAttrs(match[2]))
        .filter(([name]) => /^on[A-Za-z]+$/.test(name))
        .map(([, value]) => value)
    );
  for (const handler of handlerAttrs) {
    let ok = true;
    try {
      new Function(handler);
    } catch {
      ok = false;
    }
    assert(ok, 'Inline event handler parses as JavaScript', { handler });
  }

  const referencedIds = [
    ...new Set(
      safeRgFiles('src')
        .filter(rel => rel.endsWith('.js'))
        .flatMap(rel => {
          const text = fs.readFileSync(path.join(root, rel), 'utf8');
          return [...text.matchAll(/byId\(["']([^"']+)["']\)|getElementById\(["']([^"']+)["']\)/g)]
            .map(match => match[1] || match[2]);
        })
    )
  ];
  const missingCriticalReferences = referencedIds.filter(id => !ids.includes(id) && !/^card-|^interval-/.test(id));
  assert(missingCriticalReferences.length === 0, 'Every literal critical JS id reference exists or is generated/optional', {
    missingCriticalReferences
  });
});

await section('Browser Bootstrap and Runtime Smoke Test', () => {
  const h = createHarness();
  assert(h.errors.length === 0, 'No uncaught exception during app initialization', { errors: h.errors });
  for (const name of [
    'calculateDeterministic',
    'monteCarloCalculate',
    'loadPreset',
    'getMonteCarloOptions',
    'getMonteCarloBoundsDescriptor',
    'getMonteCarloBoundsBlockingErrors'
  ]) {
    assert(h.hasFunction(name), `Core global function exists: ${name}`);
  }
  assert(h.hasFunction('calculate') || h.hasFunction('calculateDeterministic'), 'Calculate entry point exists');
  assert(h.hasFunction('resetDefaults') || h.hasFunction('loadPreset'), 'Reset/default entry point exists through resetDefaults or loadPreset');
  assert(h.document.querySelectorAll('.preset-btn[data-preset]').length >= 4, 'Preset buttons exist');
  assert(SCIENTIFIC_PARAMETER_ORDER.every(id => !!h.byId(id)), 'Scientific central inputs exist');
  assert(SCIENTIFIC_PARAMETER_ORDER.every(id => !!h.byId(`${id}_min`) && !!h.byId(`${id}_max`)), 'Scientific min/max bounds exist');
  for (const id of ['deterministicResult', 'monteCarloResult', 'monteCarloChart', 'gaussianChart', 'share-buttons']) {
    assert(!!h.byId(id), `Main UI element exists: ${id}`);
  }
  const state = h.snapshotScenarioState();
  assert(state && state.state === 'preset' && state.isPreset, 'Initial preset loads cleanly', state);
  h.runDeterministic();
  const det = h.getRuntimeSnapshot().deterministicPlanets;
  assert(finiteNonNegative(det), 'Initial deterministic calculation succeeds', { det });
  const mc = runSeededMc(h, { samples: 64, seed: 202600 });
  assert(mc === null || (mc && mc.n > 0), 'Initial Monte Carlo succeeds or returns controlled null', {
    mc: mc && { n: mc.n, boundsMode: mc.boundsMode }
  });
});

await section('Deterministic Model', () => {
  for (const presetKey of ['kepler', 'consensus', 'optimist', 'pessimist']) {
    const h = createHarness();
    h.loadPreset(presetKey);
    h.runDeterministic();
    const snapshot1 = h.getRuntimeSnapshot();
    const expected = independentProductFromPreset(presetKey);
    assert(finiteNonNegative(snapshot1.deterministicPlanets), `${presetKey}: deterministic result is finite and non-negative`, snapshot1);
    assertRelApproxEqual(snapshot1.deterministicPlanets, expected, 1e-12, `${presetKey}: deterministic result matches independent product`);
    h.runDeterministic();
    const snapshot2 = h.getRuntimeSnapshot();
    assertRelApproxEqual(snapshot2.deterministicPlanets, snapshot1.deterministicPlanets, 1e-15, `${presetKey}: deterministic result reproducible across consecutive runs`);
  }

  const h = createHarness();
  h.loadPreset('kepler');
  h.runDeterministic();
  const before = h.getRuntimeSnapshot().deterministicPlanets;
  const controls = [
    ['iterations', '1200'],
    ['distribution', 'uniform'],
    ['simulation-engine', 'lhs'],
    ['sampling_uncertainty', '25'],
    ['mc-basis-mode', 'globalEnvelope']
  ];
  for (const [id, value] of controls) {
    h.setInputValue(id, value);
    h.dispatchChange(id);
    const after = h.getRuntimeSnapshot().deterministicPlanets;
    assertRelApproxEqual(after, before, 1e-15, `MC-only control ${id} does not change deterministic result`);
  }
});

await section('Preset Roundtrip', () => {
  for (const presetKey of Object.keys(SCIENTIFIC_PRESETS)) {
    const h = createHarness();
    h.loadPreset(presetKey);
    h.runDeterministic();
    const baselineHash = snapshotVisibleHash(h);
    const baselineDet = h.getRuntimeSnapshot().deterministicPlanets;
    const baseInputs = h.snapshotAllScientificInputs();
    const baseBounds = h.snapshotAllBounds();
    const baseState = h.snapshotScenarioState();
    const baseDescriptor = h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'auto' }));

    assert(baseState && baseState.state === 'preset', `${presetKey}: baseline is clean preset`, baseState);
    assert(baseDescriptor.mode === 'presetLocal', `${presetKey}: clean preset auto basis resolves presetLocal`, baseDescriptor);

    for (const id of SCIENTIFIC_PARAMETER_ORDER) {
      const original = baseInputs[id];
      h.setInputValue(id, mutateValueString(original));
      h.dispatchInput(id);
      assert(h.snapshotScenarioState().state !== 'preset', `${presetKey}/${id}: central edit marks scenario modified`, h.snapshotScenarioState());
      h.setInputValue(id, original);
      h.dispatchInput(id);
      assert(h.snapshotScenarioState().state === 'preset', `${presetKey}/${id}: central restore returns clean preset`, h.snapshotScenarioState());
    }

    for (const id of SCIENTIFIC_PARAMETER_ORDER) {
      for (const side of ['min', 'max']) {
        const field = `${id}_${side}`;
        const original = baseBounds[id][side];
        h.setInputValue(field, mutateValueString(original));
        h.dispatchInput(field);
        assert(h.snapshotScenarioState().state !== 'preset', `${presetKey}/${field}: bound edit marks scenario modified`, h.snapshotScenarioState());
        h.setInputValue(field, original);
        h.dispatchInput(field);
        assert(h.snapshotScenarioState().state === 'preset', `${presetKey}/${field}: bound restore returns clean preset`, h.snapshotScenarioState());
      }
    }

    h.setInputValue('N_GHZ_min', `${baseBounds.N_GHZ.min}0`);
    h.dispatchInput('N_GHZ_min');
    h.setInputValue('N_GHZ_max', `${baseBounds.N_GHZ.max}0`);
    h.dispatchInput('N_GHZ_max');
    h.runDeterministic();
    runSeededMc(h, { samples: 64, seed: 202611 });
    h.setInputValue('N_GHZ_min', baseBounds.N_GHZ.min);
    h.dispatchInput('N_GHZ_min');
    h.setInputValue('N_GHZ_max', baseBounds.N_GHZ.max);
    h.dispatchInput('N_GHZ_max');
    h.runDeterministic();
    runSeededMc(h, { samples: 64, seed: 202611 });

    const restoredHash = snapshotVisibleHash(h);
    const restoredDet = h.getRuntimeSnapshot().deterministicPlanets;
    assert(restoredHash === baselineHash, `${presetKey}: extra-zero min/max roundtrip restores exact visible and scenario state`, {
      expected: baselineHash,
      actual: restoredHash
    });
    assertRelApproxEqual(restoredDet, baselineDet, 1e-15, `${presetKey}: extra-zero roundtrip restores deterministic result`);
  }
});

await section('Preset Switching', () => {
  const presetKeys = Object.keys(SCIENTIFIC_PRESETS);
  for (const a of presetKeys) {
    for (const b of presetKeys) {
      if (a === b) continue;
      const h = createHarness();
      h.loadPreset(a);
      const originalA = {
        inputs: h.snapshotAllScientificInputs(),
        bounds: h.snapshotAllBounds()
      };
      for (const id of ['N_GHZ', 'f_complex_life', 'f_H2O', 'f_x'].filter(id => h.byId(id))) {
        h.setInputValue(id, mutateValueString(h.getValue(id)));
        h.dispatchInput(id);
      }
      for (const id of ['N_GHZ_min', 'N_GHZ_max', 'f_complex_life_min', 'f_complex_life_max'].filter(id => h.byId(id))) {
        h.setInputValue(id, mutateValueString(h.getValue(id)));
        h.dispatchInput(id);
      }
      h.runDeterministic();
      runSeededMc(h, { samples: 48, seed: 202612 });
      h.loadPreset(b);
      h.runDeterministic();
      const bState = h.snapshotScenarioState();
      const bExpected = SCIENTIFIC_PRESETS[b].values;
      assert(bState.state === 'preset' && bState.activePreset === b, `${a}->${b}: switch resets clean preset state`, bState);
      for (const [id, value] of Object.entries(bExpected)) {
        assertRelApproxEqual(h.getNumber(id), value, 1e-12, `${a}->${b}: ${id} matches preset B default`);
      }
      assert(h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'auto' })).mode === 'presetLocal', `${a}->${b}: MC basis resolves clean preset B`);
      h.loadPreset(a);
      assertDeepEqual(h.snapshotAllScientificInputs(), originalA.inputs, `${a}->${b}->${a}: preset A central values restored`);
      assertDeepEqual(h.snapshotAllBounds(), originalA.bounds, `${a}->${b}->${a}: preset A bounds restored`);
    }
  }
});

await section('MC Basis', () => {
  const h = createHarness();
  h.loadPreset('kepler');
  assert(h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'auto' })).mode === 'presetLocal', 'Auto mode clean preset resolves presetLocal');

  h.setInputValue('N_GHZ', '12000000000');
  h.dispatchInput('N_GHZ');
  const editedAuto = h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'auto' }));
  assert(['customInput', 'modifiedPresetLocal'].includes(editedAuto.mode), 'Auto mode edited scenario resolves edited/custom basis', editedAuto);

  for (const mode of ['globalEnvelope', 'presetLocal', 'customInput']) {
    const descriptor = h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: mode }));
    assert(descriptor.mode === mode || (mode === 'presetLocal' && descriptor.mode === 'presetLocal'), `Explicit ${mode} basis is honored`, descriptor);
  }

  h.loadPreset('kepler');
  h.setInputValue('N_GHZ', '100000000000');
  h.dispatchInput('N_GHZ');
  const customOptions = h.getMonteCarloOptions({ mcMode: 'customInput' });
  const customDescriptor = h.getMonteCarloBoundsDescriptor(customOptions);
  const customErrors = h.getMonteCarloBoundsBlockingErrors(customDescriptor);
  const customSummary = h.runMonteCarlo({ samples: 32, seed: 202613, mcMode: 'customInput' });
  assert(customDescriptor.mode === 'customInput', 'Programmatic customInput descriptor is customInput', customDescriptor);
  assert(customErrors.some(error => error.id === 'N_GHZ'), 'Programmatic customInput validation sees visible N_GHZ outside bounds', customErrors);
  assert(customSummary === null, 'Programmatic customInput simulation is blocked by the same descriptor');

  const presetOptions = h.getMonteCarloOptions({ mcMode: 'presetLocal' });
  const presetDescriptor = h.getMonteCarloBoundsDescriptor(presetOptions);
  const presetErrors = h.getMonteCarloBoundsBlockingErrors(presetDescriptor);
  const presetSummary = h.runMonteCarlo({ samples: 32, seed: 202613, mcMode: 'presetLocal' });
  assert(presetDescriptor.mode === 'presetLocal', 'Programmatic presetLocal descriptor is presetLocal', presetDescriptor);
  assert(presetErrors.length === 0, 'Programmatic presetLocal validation ignores stale visible custom bounds', presetErrors);
  assert(presetSummary && presetSummary.boundsMode === presetDescriptor.mode, 'Programmatic presetLocal simulation uses same basis as gate', {
    summary: presetSummary && presetSummary.boundsMode,
    descriptor: presetDescriptor.mode
  });
});

await section('MC Reproducibility', () => {
  for (const presetKey of Object.keys(SCIENTIFIC_PRESETS)) {
    for (const mode of ['presetLocal', 'customInput', 'globalEnvelope']) {
      const h1 = createHarness();
      h1.loadPreset(presetKey);
      h1.runDeterministic();
      const s1 = runSeededMc(h1, { samples: 96, seed: 202614, mcMode: mode });
      const h2 = createHarness();
      h2.loadPreset(presetKey);
      h2.runDeterministic();
      const s2 = runSeededMc(h2, { samples: 96, seed: 202614, mcMode: mode });
      assert(s1 && s2, `${presetKey}/${mode}: MC returns summaries`);
      if (!s1 || !s2) continue;
      for (const key of ['p025', 'p500', 'p975', 'mean']) {
        assertRelApproxEqual(s1[key], s2[key], 1e-15, `${presetKey}/${mode}: ${key} reproducible`);
      }
      assert(s1.p025 <= s1.p500 && s1.p500 <= s1.p975, `${presetKey}/${mode}: q2.5 <= q50 <= q97.5`, {
        p025: s1.p025,
        p500: s1.p500,
        p975: s1.p975
      });
      assert(Number.isFinite(s1.mean), `${presetKey}/${mode}: arithmetic mean finite`, { mean: s1.mean });
      assert(s1.results.every(finiteNonNegative), `${presetKey}/${mode}: sampled outputs finite and non-negative`);
      assert(s1.sampledN_GHZ.every(v => Number.isFinite(v) && v >= 0), `${presetKey}/${mode}: count-like sampled N_GHZ non-negative`);
      assert(Number.isFinite(s1.convergence.finalMean), `${presetKey}/${mode}: convergence metadata finite`, s1.convergence);
      const chartStale = h1.getRuntimeSnapshot().chartStale;
      assert(chartStale.monteCarloChart === 'false' && chartStale.gaussianChart === 'false', `${presetKey}/${mode}: chart state updated to latest MC`, chartStale);
    }
  }
});

await section('Bounds Validation', () => {
  const ids = SCIENTIFIC_PARAMETER_ORDER;
  for (const id of ids) {
    const h = createHarness();
    h.loadPreset('kepler');
    if (id === 'f_complex_life') h.click('complex-life-toggle');
    if (id === 'f_x') h.click('x-toggle');
    const baselineHash = snapshotVisibleHash(h);
    const original = {
      central: h.getValue(id),
      min: h.getValue(`${id}_min`),
      max: h.getValue(`${id}_max`)
    };
    const max = Number(original.max);
    const min = Number(original.min);
    h.setInputValue(id, String(max * 10 || 2));
    h.dispatchInput(id);
    const desc = h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'customInput' }));
    let errors = h.getMonteCarloBoundsBlockingErrors(desc);
    const centralAfterHigh = h.getNumber(id);
    const highWasClampedIntoRange = centralAfterHigh <= max && centralAfterHigh <= 1;
    assert(
      errors.some(error => error.id === id && error.kind === 'central-outside') || highWasClampedIntoRange,
      `${id}: central > max produces controlled block or clamp`,
      { errors, centralAfterHigh, max }
    );
    h.setInputValue(id, original.central);
    h.dispatchInput(id);

    h.setInputValue(id, String(min / 10));
    h.dispatchInput(id);
    errors = h.getMonteCarloBoundsBlockingErrors(desc);
    assert(errors.some(error => error.id === id && error.kind === 'central-outside'), `${id}: central < min produces controlled block`, errors);
    h.setInputValue(id, original.central);
    h.dispatchInput(id);

    h.setInputValue(`${id}_min`, String(max * 2 || 2));
    h.setInputValue(`${id}_max`, String(min / 2 || 0.1));
    h.dispatchInput(`${id}_min`);
    errors = h.getMonteCarloBoundsBlockingErrors(desc);
    assert(errors.some(error => error.id === id && error.kind === 'min-gt-max'), `${id}: min > max produces controlled block`, errors);
    h.setInputValue(`${id}_min`, original.min);
    h.setInputValue(`${id}_max`, original.max);
    h.dispatchInput(`${id}_max`);

    const restoredHash = snapshotVisibleHash(h);
    assert(restoredHash === baselineHash, `${id}: exact restore returns baseline descriptor/state`, {
      expected: baselineHash,
      actual: restoredHash
    });
  }

  for (const id of ['f_size', 'f_orbit', 'f_complex_life']) {
    const h = createHarness();
    h.loadPreset('kepler');
    h.setInputValue(id, '2');
    h.dispatchInput(id);
    assert(Number(h.getValue(id)) <= 1, `${id}: probability clamp handles above 1`, { actual: h.getValue(id) });
    h.setInputValue(id, '-0.1');
    h.dispatchInput(id);
    h.getParamSamplingState(id, h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'customInput' })));
    assert(Number(h.getValue(id)) >= 0, `${id}: probability clamp/warning path handles below 0`, { actual: h.getValue(id) });
  }

  for (const value of ['', '   ', 'abc', '1e-12', '1e99']) {
    const h = createHarness();
    h.loadPreset('kepler');
    h.setInputValue('f_size', value);
    h.dispatchInput('f_size');
    h.runDeterministic();
    const snap = h.getRuntimeSnapshot();
    assert(!h.errors.length, `Invalid numeric input does not crash: "${value}"`, { value, errors: h.errors, snap });
  }
});

await section('MC-only Controls', () => {
  const controls = [
    ['sampling_uncertainty', '75'],
    ['iterations', '1400'],
    ['distribution', 'uniform'],
    ['simulation-engine', 'lhs'],
    ['mc-basis-mode', 'globalEnvelope']
  ];
  for (const [id, value] of controls) {
    const h = createHarness();
    h.loadPreset('kepler');
    h.runDeterministic();
    const detBefore = h.getRuntimeSnapshot().deterministicPlanets;
    const inputsBefore = h.snapshotAllScientificInputs();
    const boundsBefore = h.snapshotAllBounds();
    h.setInputValue(id, value);
    h.dispatchInput(id);
    h.dispatchChange(id);
    const snap = h.getRuntimeSnapshot();
    assertRelApproxEqual(snap.deterministicPlanets, detBefore, 1e-15, `${id}: deterministic result is not cleared`);
    assert(h.snapshotScenarioState().state === 'preset', `${id}: preset badge/scenario remains clean`, h.snapshotScenarioState());
    assertDeepEqual(h.snapshotAllScientificInputs(), inputsBefore, `${id}: scientific central values unchanged`);
    assertDeepEqual(h.snapshotAllBounds(), boundsBefore, `${id}: scientific bounds unchanged`);
    const summary = runSeededMc(h, { samples: 48, seed: 202615 });
    assert(summary === null || summary.n > 0, `${id}: Monte Carlo can recalculate after MC-only control change`, summary && { n: summary.n });
  }
});

await section('Bayesian Toggle', () => {
  for (const presetKey of ['kepler']) {
    const h = createHarness();
    h.loadPreset(presetKey);
    h.runDeterministic();
    const baselineDet = h.getRuntimeSnapshot().deterministicPlanets;
    const baselineInputs = h.snapshotAllScientificInputs();
    assert(h.snapshotScenarioState().state === 'preset', `${presetKey}: starts clean`, h.snapshotScenarioState());
    h.click('bayes-pre');
    assert(h.getValue('f_orbit') === '0.18' && h.getValue('f_composition') === '0.2', `${presetKey}: Bayesian pre changes values`, {
      f_orbit: h.getValue('f_orbit'),
      f_composition: h.getValue('f_composition')
    });
    h.click('bayes-post');
    assertDeepEqual(h.snapshotAllScientificInputs(), baselineInputs, `${presetKey}: Bayesian post restores visible preset defaults`);
    assert(h.snapshotScenarioState().state === 'preset', `${presetKey}: Bayesian post reconciles badge to clean preset`, h.snapshotScenarioState());
    h.runDeterministic();
    assertRelApproxEqual(h.getRuntimeSnapshot().deterministicPlanets, baselineDet, 1e-15, `${presetKey}: Bayesian post restores deterministic baseline`);
  }

  {
    const h = createHarness();
    h.loadPreset('consensus');
    h.runDeterministic();
    const baselineDet = h.getRuntimeSnapshot().deterministicPlanets;
    const baselineInputs = h.snapshotAllScientificInputs();
    assert(h.snapshotScenarioState().state === 'preset', 'consensus: starts clean', h.snapshotScenarioState());
    h.click('bayes-post');
    assert(h.snapshotScenarioState().state !== 'preset', 'consensus: Bayesian post can mark modified');
    h.click('bayes-pre');
    assertDeepEqual(h.snapshotAllScientificInputs(), baselineInputs, 'consensus: Bayesian pre restores visible preset defaults');
    assert(h.snapshotScenarioState().state === 'preset', 'consensus: Bayesian pre reconciles badge to clean preset', h.snapshotScenarioState());
    h.runDeterministic();
    assertRelApproxEqual(h.getRuntimeSnapshot().deterministicPlanets, baselineDet, 1e-15, 'consensus: Bayesian pre restores deterministic baseline');
  }

  const h = createHarness();
  h.loadPreset('kepler');
  for (let i = 0; i < 5; i++) {
    h.click('bayes-pre');
    h.click('bayes-post');
  }
  assert(h.snapshotScenarioState().state === 'preset', 'Repeated pre/post toggling leaves Kepler clean', h.snapshotScenarioState());
});

await section('Galaxy Presets', () => {
  const h = createHarness();
  const map = h.galaxyPresetMap();
  const keys = Object.keys(map).filter(key => key !== 'custom');
  assert(keys.length >= 4, 'Galaxy preset map exposes known presets', { keys });
  for (const key of keys) {
    const hh = createHarness();
    hh.loadPreset('kepler');
    const nGhzBefore = hh.getValue('N_GHZ');
    const preset = hh.applyGalaxyPresetSelection(key);
    assert(!!preset, `${key}: galaxy preset applied`);
    assert(String(hh.getValue('galaxy-diameter')) === String(preset.d), `${key}: diameter updated`, {
      expected: preset.d,
      actual: hh.getValue('galaxy-diameter')
    });
    assert(String(hh.getValue('galaxy-thickness')) === String(preset.t), `${key}: thickness updated`, {
      expected: preset.t,
      actual: hh.getValue('galaxy-thickness')
    });
    assert(String(hh.getValue('galaxy-earth-distance')) === String(preset.earthDist ?? 0), `${key}: earth distance updated`, {
      expected: preset.earthDist,
      actual: hh.getValue('galaxy-earth-distance')
    });
    assert(hh.getValue('N_GHZ') === nGhzBefore, `${key}: N_GHZ not overwritten by total galaxy star count`, {
      before: nGhzBefore,
      after: hh.getValue('N_GHZ'),
      totalStars: preset.n
    });
    if (key === 'mw') assert(hh.getValue('N_GHZ') !== '100000000000', 'Milky Way does not set N_GHZ to 1e11');
    if (key === 'm31') assert(hh.getValue('N_GHZ') !== '55000000000', 'M31 does not set N_GHZ to 5.5e10');
    const central = hh.getNumber('N_GHZ');
    assert(central >= hh.getNumber('N_GHZ_min') && central <= hh.getNumber('N_GHZ_max'), `${key}: N_GHZ remains within its GHZ bounds`);
    hh.runDeterministic();
    const summary = runSeededMc(hh, { samples: 48, seed: 202616 });
    const errors = hh.getMonteCarloBoundsBlockingErrors(hh.getMonteCarloBoundsDescriptor(hh.getMonteCarloOptions({ mcMode: 'auto' })));
    assert(summary && summary.n > 0, `${key}: MC runs after galaxy preset selection`, summary && { n: summary.n, boundsMode: summary.boundsMode });
    assert(!errors.some(error => error.id === 'N_GHZ' && error.kind === 'central-outside'), `${key}: no central-outside-bounds error from galaxy preset`, errors);
    if (preset.n !== undefined && hh.byId('adv_N_total_stars')) {
      assert(String(hh.getValue('adv_N_total_stars')) === String(preset.n), `${key}: total stars stored in advanced total stars field`, {
        expected: preset.n,
        actual: hh.getValue('adv_N_total_stars')
      });
    }
  }
});

await section('Advanced Modules', () => {
  const moduleKeys = [
    'hostChannels',
    'atmRet',
    'volatileSplit',
    'longterm',
    'spinObliquity',
    'radiusValley',
    'radialGHZ',
    'spaceWeather',
    'prebioticUV',
    'binary',
    'radiation',
    'sensitivity',
    'temporal'
  ];
  for (const key of moduleKeys) {
    const h = createHarness();
    h.loadPreset('kepler');
    h.runDeterministic();
    const baselineInputs = h.snapshotAllScientificInputs();
    const baselineBounds = h.snapshotAllBounds();
    const before = h.getRuntimeSnapshot().deterministicPlanets;
    const enabled = h.setAdvancedModule(key, true);
    if (!enabled) {
      assert(true, `${key}: advanced module absent or intentionally unavailable in runtime`);
      continue;
    }
    h.runDeterministic();
    runSeededMc(h, { samples: 32, seed: 202617 });
    h.setAdvancedModule(key, false);
    h.runDeterministic();
    const after = h.getRuntimeSnapshot().deterministicPlanets;
    assertDeepEqual(h.snapshotAllScientificInputs(), baselineInputs, `${key}: disabling module restores central inputs`);
    assertDeepEqual(h.snapshotAllBounds(), baselineBounds, `${key}: disabling module restores bounds`);
    assertRelApproxEqual(after, before, 1e-12, `${key}: no hidden advanced multiplier remains after disable`);
  }
  const h = createHarness();
  assert(!!h.byId('sobol-panel') && !!h.byId('sobol-bars'), 'Sobol panel exists without dead sobol button dependency');
});

await section('Distance Models', () => {
  const h = createHarness();
  h.loadPreset('kepler');
  h.runDeterministic();
  h.calculateDistanceToNearestPlanet();
  const base = h.getActiveDistanceSnapshot();
  assert(base && Object.values(base).some(Number.isFinite), 'Distance snapshot contains finite values', base);
  for (const key of ['distanceRadial', 'distance2D', 'distance3DDisk', 'distance3DSphere']) {
    if (Number.isFinite(base[key])) assert(base[key] >= 0, `${key}: no negative distance`, base);
  }

  const hMore = createHarness();
  hMore.loadPreset('kepler');
  hMore.setInputValue('N_GHZ', String(Number(hMore.getValue('N_GHZ')) * 2));
  hMore.dispatchInput('N_GHZ');
  hMore.runDeterministic();
  hMore.calculateDistanceToNearestPlanet();
  const more = hMore.getActiveDistanceSnapshot();

  const hLess = createHarness();
  hLess.loadPreset('kepler');
  hLess.setInputValue('N_GHZ', String(Number(hLess.getValue('N_GHZ')) / 2));
  hLess.dispatchInput('N_GHZ');
  hLess.runDeterministic();
  hLess.calculateDistanceToNearestPlanet();
  const less = hLess.getActiveDistanceSnapshot();
  if (base && more && less && Number.isFinite(base.displayedDistanceValue)) {
    assert(more.displayedDistanceValue <= base.displayedDistanceValue, 'Nearest distance decreases when candidate count increases', {
      base: base.displayedDistanceValue,
      more: more.displayedDistanceValue
    });
    assert(less.displayedDistanceValue >= base.displayedDistanceValue, 'Nearest distance increases when candidate count decreases', {
      base: base.displayedDistanceValue,
      less: less.displayedDistanceValue
    });
    assert(Math.abs(base.displayedDistanceValue - 47.564) > 1e-3 || Math.abs(more.displayedDistanceValue - base.displayedDistanceValue) > 1e-3, 'Old 47.564 ly collapse artifact is not constant');
  }

  const beforeHtml = h.getHtml('distance');
  h.click('enable-galaxy-settings');
  h.setInputValue('galaxy-diameter', '50000');
  h.dispatchInput('galaxy-diameter');
  h.calculateDistanceToNearestPlanet();
  const changedHtml = h.getHtml('distance');
  assert(beforeHtml !== changedHtml, 'Changing galaxy geometry updates distance output when relevant', {
    beforeHtml,
    changedHtml
  });
});

await section('Universe Scaling', () => {
  const values = {};
  for (const presetKey of Object.keys(SCIENTIFIC_PRESETS)) {
    const h = createHarness();
    h.loadPreset(presetKey);
    h.runDeterministic();
    runSeededMc(h, { samples: 48, seed: 202623, mcMode: 'presetLocal' });
    h.calculateDistanceToNearestPlanet();
    const html = h.buildUniverseScaleHtml('dt');
    const basis = h.getUniverseScaleBasis('dt');
    assert(/observable universe/i.test(html), `${presetKey}: universe scale HTML generated`, { html });
    assert(
      basis &&
        finiteNonNegative(basis.basis && basis.basis.count) &&
        basis.scale &&
        finiteNonNegative(basis.scale.min) &&
        finiteNonNegative(basis.scale.max),
      `${presetKey}: universe scale basis finite/non-negative`,
      basis
    );
    values[presetKey] = basis && basis.scale ? basis.scale.max : null;
    const summary = h.buildShareSummary();
    assert(typeof summary === 'string' && summary.length > 0, `${presetKey}: share text generated from current UI`);
  }
  assert(new Set(Object.values(values).map(v => Number(v).toPrecision(6))).size > 1, 'Universe values change across presets instead of stale constant', values);
});

await section('Export Share History', () => {
  const h = createHarness();
  h.loadPreset('kepler');
  h.runDeterministic();
  const mc = runSeededMc(h, { samples: 64, seed: 202618, mcMode: 'presetLocal' });
  h.calculateDistanceToNearestPlanet();
  const json = h.buildJSONExportSnapshot();
  assert(json && json.version === '2.13', 'JSON export contains version', json);
  assert(json.preset === 'kepler', 'JSON export contains active preset', json);
  assert(json.scenario_state && json.scenario_state.state === 'preset', 'JSON export contains clean scenario state', json.scenario_state);
  assertRelApproxEqual(json.results.deterministic, h.getRuntimeSnapshot().deterministicPlanets, 1e-15, 'JSON deterministic equals current UI state');
  assertRelApproxEqual(json.results.mc_median_q50, mc.p500, 1e-15, 'JSON MC q50 equals latest MC');
  assertRelApproxEqual(json.results.mc_mean, mc.mean, 1e-15, 'JSON MC mean equals latest MC');
  assert(json.results.mc_q025 <= json.results.mc_median_q50 && json.results.mc_median_q50 <= json.results.mc_q975, 'JSON q interval order valid', json.results);
  assert(json.simulation.mcMode === 'presetLocal', 'JSON export contains MC basis mode', json.simulation);
  assert(json.parameters.N_GHZ.mean === h.getNumber('N_GHZ'), 'JSON parameters match visible UI values', json.parameters.N_GHZ);
  assert(json.timestamp && !Number.isNaN(Date.parse(json.timestamp)), 'JSON export timestamp parses', { timestamp: json.timestamp });
  assert(json.basis_labels.mc_median_q50 && json.basis_labels.mc_mean, 'JSON basis labels distinguish median and arithmetic mean', json.basis_labels);

  const share = h.buildShareSummary();
  assert(/Monte Carlo|MONTE CARLO|modelled Earth-like/.test(share), 'Share summary uses current result text', { share });

  h.clearHistoryStore();
  h.saveHistoryEntry();
  const first = h.readHistoryStore().items[0];
  h.loadPreset('pessimist');
  h.runDeterministic();
  runSeededMc(h, { samples: 64, seed: 202619, mcMode: 'presetLocal' });
  h.saveHistoryEntry();
  const history = h.readHistoryStore().items;
  assert(history.length === 2, 'History stores multiple snapshots', history);
  assert(history[0].selectedPreset === first.selectedPreset && history[0].deterministic === first.deterministic, 'History snapshot remains immutable after current UI changes', {
    first,
    currentFirst: history[0]
  });

  const latex = h.buildLatexExportText();
  assert(/MC state: current/.test(latex), 'LaTeX export uses latest MC state', { latex: latex.slice(0, 500) });
});

await section('Charts State Invalidation', () => {
  const h = createHarness();
  h.loadPreset('kepler');
  h.runDeterministic();
  const summary1 = runSeededMc(h, { samples: 64, seed: 202620 });
  const afterMc = h.getRuntimeSnapshot();
  assert(afterMc.chartStale.monteCarloChart === 'false', 'Monte Carlo chart marked current after MC run', afterMc.chartStale);
  assert(afterMc.chartStale.gaussianChart === 'false', 'Gaussian chart marked current after MC run', afterMc.chartStale);
  h.setInputValue('N_GHZ', '9000000000');
  h.dispatchInput('N_GHZ');
  const stale = h.getRuntimeSnapshot();
  assert(stale.monteCarloState === 'stale' || stale.simulationCompleted === false, 'Scientific edit invalidates stale MC state', stale);
  assert(stale.chartStale.monteCarloChart === 'true' || stale.monteCarloState === 'stale', 'Scientific edit marks MC chart stale', stale.chartStale);
  const detBefore = stale.deterministicPlanets;
  h.setInputValue('sampling_uncertainty', '60');
  h.dispatchInput('sampling_uncertainty');
  assertRelApproxEqual(h.getRuntimeSnapshot().deterministicPlanets, detBefore, 1e-15, 'MC-only control does not erase deterministic state unnecessarily');
  const summary2 = runSeededMc(h, { samples: 64, seed: 202621 });
  assert(summary1 && summary2 && summary1.seed !== summary2.seed, 'New MC run replaces previous run metadata', {
    firstSeed: summary1 && summary1.seed,
    secondSeed: summary2 && summary2.seed
  });
});

await section('Source Docs Wording', () => {
  const banned = [
    /definitive prediction/i,
    /proves life exists/i,
    /actual number of Earths/i
  ];
  for (const [rel, text] of productionFiles.map(rel => [rel, fs.readFileSync(path.join(root, rel), 'utf8')])) {
    for (const pattern of banned) assert(!pattern.test(text), `No misleading overclaim ${pattern} in ${rel}`, { file: rel, pattern: String(pattern) });
  }

  const preferredTerms = [
    /modelled Earth-like candidates/i,
    /scenario output|scenario-based/i,
    /sampled model interval/i,
    /not a prediction/i
  ];
  const siteText = productionFiles.map(rel => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  for (const pattern of preferredTerms) assert(pattern.test(siteText), `Preferred public wording present: ${pattern}`);

  for (const rel of [
    'docs/MODEL_SCOPE.md',
    'docs/MONTE_CARLO_METHOD.md',
    'docs/PARAMETER_REGISTRY.md',
    'docs/DISTANCE_MODEL_METHOD.md',
    'docs/REUSE_AND_ATTRIBUTION.md'
  ]) {
    assert(fs.existsSync(path.join(root, rel)), `Documentation link target exists: ${rel}`);
  }

  const readme = fs.existsSync(path.join(root, 'README.md')) ? fs.readFileSync(path.join(root, 'README.md'), 'utf8') : '';
  for (const match of readme.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/g)) {
    const ref = match[1].split('#')[0];
    if (/^https?:\/\//i.test(ref)) continue;
    assert(fs.existsSync(path.join(root, ref)), `README local markdown link exists: ${match[1]}`, { ref });
  }
});

await section('Registry Consistency', () => {
  const h = createHarness();
  const uiIds = new Set([...h.document.elementsById.keys()]);
  for (const id of SCIENTIFIC_PARAMETER_ORDER) {
    const param = SCIENTIFIC_PARAMETER_REGISTRY.parameters[id];
    assert(!!param, `${id}: registry parameter exists`);
    assert(uiIds.has(id), `${id}: registry parameter central input exists in UI`);
    assert(param.label && typeof param.label === 'string', `${id}: label exists`);
    assert(Number.isFinite(param.central), `${id}: central finite`, param);
    assert(Number.isFinite(param.min), `${id}: min finite`, param);
    assert(Number.isFinite(param.max), `${id}: max finite`, param);
    assert(param.min <= param.max, `${id}: min <= max`, param);
    assert(param.central >= param.min && param.central <= param.max, `${id}: central within min/max`, param);
    if (/^f_/.test(id)) {
      assert(param.min >= 0 && param.max <= 1, `${id}: probability parameter range within [0,1]`, param);
    }
    if (/^N_/.test(id)) {
      assert(param.min >= 0 && param.central >= 0, `${id}: count parameter non-negative`, param);
    }
    assert(param.unit && typeof param.unit === 'string', `${id}: units exist`, param);
    if (param.isLiteratureBacked) assert(param.citationShort && param.doiOrUrl, `${id}: literature-backed parameter has source/citation`, param);
  }
  const orphanUi = SCIENTIFIC_PARAMETER_ORDER.filter(id => !SCIENTIFIC_PARAMETER_REGISTRY.parameters[id]);
  assert(orphanUi.length === 0, 'No scientific UI parameter orphaned from registry', { orphanUi });
});

await section('Cache Invalidation', () => {
  const sequences = [
    ['central value', h => { h.setInputValue('N_GHZ', '9000000000'); h.dispatchInput('N_GHZ'); }],
    ['min', h => { h.setInputValue('N_GHZ_min', '4000000000'); h.dispatchInput('N_GHZ_min'); }],
    ['max', h => { h.setInputValue('N_GHZ_max', '30000000000'); h.dispatchInput('N_GHZ_max'); }],
    ['Bayesian toggle', h => { h.click('bayes-pre'); }],
    ['galaxy preset', h => { h.applyGalaxyPresetSelection('m31'); h.invalidateDisplayOrDistanceOnly(false); }],
    ['advanced module', h => { h.setAdvancedModule('atmRet', true); h.invalidateScenarioResults(false); }],
    ['MC basis mode', h => { h.setInputValue('mc-basis-mode', 'globalEnvelope'); h.dispatchChange('mc-basis-mode'); }],
    ['sampling_uncertainty', h => { h.setInputValue('sampling_uncertainty', '40'); h.dispatchInput('sampling_uncertainty'); }]
  ];
  for (const [label, mutate] of sequences) {
    const h = createHarness();
    h.loadPreset('kepler');
    h.runDeterministic();
    const baselineDescriptor = h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'auto' }));
    runSeededMc(h, { samples: 48, seed: 202622 });
    mutate(h);
    const after = h.getRuntimeSnapshot();
    if (label === 'sampling_uncertainty' || label === 'MC basis mode' || label === 'galaxy preset') {
      assert(after.hasDeterministicCalculation === true, `${label}: deterministic state preserved when expected`, after);
    } else {
      assert(after.monteCarloState !== 'current' || after.chartStale.monteCarloChart === 'true', `${label}: MC result is stale or cleared after state change`, after);
    }
    h.loadPreset('kepler');
    const restored = h.getMonteCarloBoundsDescriptor(h.getMonteCarloOptions({ mcMode: 'auto' }));
    assertDeepEqual(restored, baselineDescriptor, `${label}: preset reload restores baseline MC descriptor`);
    h.runDeterministic();
    const json = h.buildJSONExportSnapshot();
    assert(json.results.deterministic === h.getRuntimeSnapshot().deterministicPlanets, `${label}: export uses latest deterministic state`);
  }
});

await section('Performance', () => {
  assert(Date.now() - auditStartTime < GLOBAL_TIMEOUT_MS, 'Audit remains under global timeout target', {
    elapsedMs: Date.now() - auditStartTime,
    globalTimeoutMs: GLOBAL_TIMEOUT_MS
  });
  const slowSections = audit.sections.filter(s => s.elapsedMs > SECTION_TIMEOUT_MS);
  assert(slowSections.length === 0, 'No completed section exceeded per-section timeout target', { slowSections });
  assert(packageJson.scripts && packageJson.scripts['test:absolute'], 'package.json exposes test:absolute script');
});

await section('Existing Test Orchestration', () => {
  const expectedScripts = [
    'test:all',
    'test:montecarlo',
    'test:preset-state-reset',
    'test:scenario-coherence',
    'test:universe-scale',
    'test:source-links',
    'verify',
    'check:syntax',
    'test:state-transition:core',
    'test:calibration'
  ];
  for (const script of expectedScripts) assert(packageJson.scripts && packageJson.scripts[script], `package.json script exists: ${script}`);
  assert(!String(packageJson.scripts['test:absolute'] || '').includes('test:all'), 'test:absolute does not call test:all recursively');

  const quickScripts = [
    ['tools/check-syntax.mjs', []],
    ['tools/verify-static-site.mjs', []],
    ['tools/test-visible-source-links.mjs', []],
    ['tools/test-universe-scale-coherence.mjs', []],
    ['tools/test-state-transition-coherence.mjs', ['--core']]
  ];
  for (const [scriptPath, args] of quickScripts) {
    const result = runNodeScript(scriptPath, args, 30000);
    assert(result.status === 0, `Existing test intent passes: ${scriptPath} ${args.join(' ')}`.trim(), {
      scriptPath,
      args,
      status: result.status,
      signal: result.signal,
      stdoutTail: result.stdout.slice(-1000),
      stderrTail: result.stderr.slice(-1000),
      error: result.error
    });
  }
});

function printReport() {
  const sectionFailures = new Map();
  for (const failure of audit.failures) {
    if (!sectionFailures.has(failure.section)) sectionFailures.set(failure.section, []);
    sectionFailures.get(failure.section).push(failure);
  }

  process.stdout.write('\nABSOLUTE DEEP AUDIT REPORT\n');
  for (const s of audit.sections) {
    process.stdout.write(`${s.status}: ${s.name} | assertions=${s.assertions} failures=${s.failures} elapsedMs=${s.elapsedMs}\n`);
    const failures = sectionFailures.get(s.name) || [];
    failures.slice(0, 12).forEach((failure, index) => {
      process.stdout.write(`  ${index + 1}. ${failure.message}\n`);
      const context = stringifyContext(failure.context);
      if (context) process.stdout.write(`     context: ${context.slice(0, 1500)}\n`);
    });
    if (failures.length > 12) process.stdout.write(`  ... ${failures.length - 12} more failure(s) omitted from section detail.\n`);
  }

  const failingSectionNames = [...new Set(audit.failures.map(f => f.section))];
  process.stdout.write(`\nTotal assertions: ${audit.assertions}\n`);
  process.stdout.write(`Total failures: ${audit.failures.length}\n`);
  process.stdout.write(`Failing sections: ${failingSectionNames.length ? failingSectionNames.join(', ') : 'none'}\n`);

  if (audit.failures.length) {
    process.stdout.write('\nExact failing IDs/parameters involved:\n');
    audit.failures.forEach((failure, index) => {
      const context = failure.context || {};
      const ids = [];
      if (context.id) ids.push(context.id);
      if (context.field) ids.push(context.field);
      if (context.ref) ids.push(context.ref);
      if (context.file) ids.push(context.file);
      if (context.scriptPath) ids.push(context.scriptPath);
      process.stdout.write(`${index + 1}. [${failure.section}] ${failure.message}${ids.length ? ` | ids=${ids.join(',')}` : ''}\n`);
    });
  }
}

printReport();
clearTimeout(watchdog);
process.exit(audit.failures.length ? 1 : 0);
