#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const {
  SCIENTIFIC_PARAMETERS,
  SCIENTIFIC_PARAMETER_ORDER,
  SOURCE_LINKS
} = require(path.join(root, 'src', 'scientific-parameters.js'));

let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function getCardHtml(cardId) {
  const startRe = new RegExp(`<div\\b[^>]*\\bid=["']${cardId}["'][^>]*>`, 'i');
  const startMatch = startRe.exec(html);
  if (!startMatch) return '';

  let depth = 1;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = startMatch.index + startMatch[0].length;
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return html.slice(startMatch.index, match.index + match[0].length);
    } else {
      depth += 1;
    }
  }

  return '';
}

function attr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`\\b${escaped}=["']([^"']*)["']`, 'i').exec(tag);
  return match ? match[1] : '';
}

function textOf(markup) {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLitRange(cardHtml) {
  const match = /<div\b([^>]*\bclass=["'][^"']*\blit-range\b[^"']*["'][^>]*)>([\s\S]*?)<\/div>/i.exec(cardHtml);
  if (!match) return null;
  return {
    attrs: match[1],
    html: match[0],
    inner: match[2],
    text: textOf(match[2])
  };
}

function getSourceLinks(markup) {
  return [...markup.matchAll(/<a\b(?=[^>]*\bclass=["'][^"']*\bsource-link\b[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi)]
    .map(match => match[0]);
}

const requiredCardSources = new Map([
  ['N_GHZ', ['Lineweaver et al. 2004']],
  ['f_sun_type', ['Henry 2006', 'Gaia DR3 2022/2023']],
  ['f_sun_age', ['Lineweaver et al. 2004']],
  ['f_stability', ['Lissauer et al. 2011', 'Steffen et al. 2012', 'Tamayo et al. 2020']],
  ['f_complex_life', ['Sandberg et al. 2018', 'Kipping 2020']]
]);

if (/methodological placeholder/i.test(html)) {
  fail('Public UI still contains "methodological placeholder".');
}

const literatureBackedKeys = SCIENTIFIC_PARAMETER_ORDER.filter(key => SCIENTIFIC_PARAMETERS[key]?.isLiteratureBacked);

for (const key of literatureBackedKeys) {
  const param = SCIENTIFIC_PARAMETERS[key];
  const cardId = `card-${key}`;
  const cardHtml = getCardHtml(cardId);
  if (!cardHtml) {
    fail(`${key}: missing scientific parameter card ${cardId}.`);
    continue;
  }

  const litRange = getLitRange(cardHtml);
  if (!litRange) {
    fail(`${key}: missing lower lit-range/source row.`);
    continue;
  }

  if (!/\bsource-links\b/.test(attr(litRange.html, 'class'))) {
    fail(`${key}: lower lit-range/source row is not using the source-links structure.`);
  }

  const links = getSourceLinks(litRange.html);
  if (!links.length) {
    fail(`${key}: literature-backed lower source row has no visible clickable source links.`);
  }

  const linkedTexts = links.map(textOf);

  for (const link of links) {
    const linkText = textOf(link);
    const href = attr(link, 'href');
    if (!href || href === '#' || /^(undefined|null)$/i.test(href)) {
      fail(`${key}: invalid source href for "${linkText}": ${href || '(empty)'}.`);
    }
    if (/^https?:\/\//i.test(href)) {
      if (attr(link, 'target') !== '_blank') fail(`${key}: external source link missing target="_blank": ${linkText}.`);
      const rel = attr(link, 'rel');
      if (!/\bnoopener\b/i.test(rel) || !/\bnoreferrer\b/i.test(rel)) {
        fail(`${key}: external source link missing rel="noopener noreferrer": ${linkText}.`);
      }
    }
    if (!attr(link, 'aria-label')) {
      fail(`${key}: source link missing aria-label: ${linkText}.`);
    }
  }

  for (const [label, source] of Object.entries(SOURCE_LINKS)) {
    if (!source?.url) continue;
    if (litRange.text.includes(label) && !linkedTexts.some(text => text.includes(label))) {
      fail(`${key}: lower source row contains known source label "${label}" as plain text instead of a link.`);
    }
  }

  for (const label of requiredCardSources.get(key) || []) {
    const source = SOURCE_LINKS[label];
    if (!source?.url) {
      fail(`${key}: required source label "${label}" is missing from SOURCE_LINKS.`);
      continue;
    }
    const matchingLink = links.find(link => textOf(link).includes(label));
    if (!matchingLink) {
      fail(`${key}: required visible source link not found for "${label}".`);
      continue;
    }
    const href = attr(matchingLink, 'href');
    if (href !== source.url) {
      fail(`${key}: source link URL mismatch for "${label}": expected ${source.url}, got ${href}.`);
    }
  }
}

const fxCard = getCardHtml('card-f_x');
const fxLitRange = fxCard ? getLitRange(fxCard) : null;
if (!fxLitRange || fxLitRange.text !== 'User-defined model factor; no fixed literature source.') {
  fail('f_x lower source row must read: User-defined model factor; no fixed literature source.');
}
if (fxLitRange && getSourceLinks(fxLitRange.html).length) {
  fail('f_x must not render a source link.');
}

if (failures) {
  process.stderr.write(`Visible source-link test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass(`Visible lower-row source links verified for ${literatureBackedKeys.length} literature-backed scientific parameter cards.`);
pass('Required N_GHZ, f_sun_type, f_sun_age, f_stability, f_complex_life source mappings are linked.');
pass('Wildcard factor source wording is source-free and public placeholder wording is absent.');
