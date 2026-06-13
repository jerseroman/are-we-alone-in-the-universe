#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'src', 'scientific-parameters.js'), 'utf8');

let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function getCardHtml(cardId) {
  const startRe = new RegExp(`<div\\b[^>]*\\bid="${cardId}"[^>]*>`, 'i');
  const startMatch = startRe.exec(html);
  if (!startMatch) {
    fail(`Bio/geophysical card not found in index.html: ${cardId}`);
    return '';
  }
  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = i;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    if (m[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(startMatch.index, m.index + m[0].length);
      }
    } else {
      depth += 1;
    }
  }
  fail(`Unbalanced <div> for card ${cardId}.`);
  return '';
}

function attr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`\\b${escaped}=["']([^"']*)["']`, 'i').exec(tag);
  return m ? m[1] : '';
}

function getSourceLinks(cardHtml) {
  const re = /<a\b(?=[^>]*\bclass=["'][^"']*\bsource-link\b[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi;
  return [...cardHtml.matchAll(re)].map(m => m[0]);
}

function textOf(markup) {
  return markup.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

const cards = [
  {
    id: 'card-f_magnetosphere',
    label: 'Magnetic Field',
    expectLabels: ['Zuluaga et al. 2013', 'Driscoll & Bercovici 2014'],
    expectHrefs: ['10.1088/0004-637X/770/1/23', '10.1016/j.pepi.2014.08.004'],
    expectRangeWording: /Mechanism-supported model range/i,
    forbidWording: [/^Lit\. range/m]
  },
  {
    id: 'card-f_lunar_stability',
    label: 'Lunar Stabilizer',
    expectLabels: ['Lissauer et al. 2012', 'Laskar et al. 1993'],
    expectHrefs: ['10.1016/j.icarus.2011.10.013', '10.1038/361615a0'],
    expectRangeWording: /Mechanism-supported model range/i,
    forbidWording: [/^Lit\. range/m]
  },
  {
    id: 'card-f_size',
    label: 'Suitable Size',
    expectLabels: ['Rogers 2015', 'Fulton et al. 2017'],
    expectHrefs: ['10.1088/0004-637X/801/1/41', '10.3847/1538-3881/aa80eb'],
    expectRangeWording: /Literature-informed range/i,
    forbidWording: [/^Lit\. range/m]
  },
  {
    id: 'card-f_rotation',
    label: 'Suitable Rotation',
    expectLabels: ['Edson et al. 2011', 'Way & Del Genio 2020'],
    expectHrefs: ['10.1016/j.icarus.2010.11.023', '10.1029/2019JE006276'],
    expectRangeWording: /Mechanism-supported model range/i,
    forbidWording: [/^Lit\. range/m, /Dobos/i, /aa40791/i]
  },
  {
    id: 'card-f_tilt',
    label: 'Favorable Tilt',
    expectLabels: ['Lissauer et al. 2012', 'Linsenmeier et al. 2015'],
    expectHrefs: ['10.1016/j.icarus.2011.10.013', '10.1016/j.pss.2014.11.003'],
    expectRangeWording: /Mechanism-supported model range/i,
    forbidWording: [/^Lit\. range/m, /S0012821X15003510/, /Williams & Pollard 2002/]
  },
  {
    id: 'card-f_H2O',
    label: 'Surface Water',
    expectLabels: ['Tian & Ida 2015', 'Mulders et al. 2015'],
    expectHrefs: ['10.1038/ngeo2372', '1505.03516'],
    expectRangeWording: /Mechanism-supported model range/i,
    forbidWording: [/^Lit\. range/m, /Morbidelli et al\. 2012/]
  },
  {
    id: 'card-f_CHNOPS',
    label: 'CHNOPS',
    expectLabels: ['Krijt et al. 2022', 'Hinkel et al. 2020'],
    expectHrefs: ['2203.10056', '10.3847/2041-8213/abb3cb'],
    expectRangeWording: /Model range/i,
    forbidWording: [/^Lit\. range/m, /Asplund et al\. 2009/]
  }
];

for (const card of cards) {
  const cardHtml = getCardHtml(card.id);
  if (!cardHtml) continue;

  const links = getSourceLinks(cardHtml);
  const linkTexts = links.map(textOf);
  const hrefs = links.map(l => attr(l, 'href'));

  for (const expected of card.expectLabels) {
    const found = linkTexts.some(t => t.includes(expected));
    if (!found) {
      fail(`${card.label}: expected clickable source label not found: "${expected}"`);
    }
  }

  for (const expectedHref of card.expectHrefs) {
    const found = hrefs.some(h => h.includes(expectedHref));
    if (!found) {
      fail(`${card.label}: expected DOI fragment not found in any source link href: "${expectedHref}"`);
    }
  }

  for (const link of links) {
    const href = attr(link, 'href');
    if (href && /^https?:\/\//i.test(href)) {
      if (attr(link, 'target') !== '_blank') {
        fail(`${card.label}: source link missing target="_blank": ${textOf(link)}`);
      }
      const rel = attr(link, 'rel');
      if (!/\bnoopener\b/i.test(rel) || !/\bnoreferrer\b/i.test(rel)) {
        fail(`${card.label}: source link missing rel noopener noreferrer: ${textOf(link)}`);
      }
      if (!attr(link, 'aria-label')) {
        fail(`${card.label}: source link missing aria-label: ${textOf(link)}`);
      }
    }
  }

  const litRangeMatch = /<div class="lit-range[^"]*">([\s\S]*?)<\/div>/i.exec(cardHtml);
  const litRangeText = litRangeMatch ? textOf(litRangeMatch[1]) : '';
  if (!card.expectRangeWording.test(litRangeText)) {
    fail(`${card.label}: lit-range wording does not match ${card.expectRangeWording} (got: "${litRangeText}")`);
  }
  for (const forbid of card.forbidWording) {
    if (forbid.test(litRangeText)) {
      fail(`${card.label}: lit-range contains forbidden pattern ${forbid} (got: "${litRangeText}")`);
    }
  }

  for (const forbid of card.forbidWording) {
    if (forbid.test(cardHtml) && !forbid.test(litRangeText)) {
      fail(`${card.label}: forbidden pattern ${forbid} present elsewhere in card.`);
    }
  }
}

if (!/Tian & Ida 2015/.test(registry) || !/Mulders et al\. 2015/.test(registry)) {
  fail('Registry missing Tian & Ida 2015 or Mulders et al. 2015 entries.');
}
const f_H2OBlock = /f_H2O:\s*\{[\s\S]*?\},/m.exec(registry);
if (f_H2OBlock && !/doiOrUrl:\s*'https:\/\/doi\.org\/10\.1038\/ngeo2372'/.test(f_H2OBlock[0])) {
  fail('f_H2O registry entry missing Tian & Ida DOI.');
}

const f_rotationBlock = /f_rotation:\s*\{[\s\S]*?\},/m.exec(registry);
if (f_rotationBlock && /Dobos/i.test(f_rotationBlock[0])) {
  fail('f_rotation registry entry still references Dobos.');
}
if (f_rotationBlock && /aa40791/i.test(f_rotationBlock[0])) {
  fail('f_rotation registry entry still references the broken aa40791 URL.');
}

const f_tiltBlock = /f_tilt:\s*\{[\s\S]*?\},/m.exec(registry);
if (f_tiltBlock && !/10\.1016\/j\.icarus\.2011\.10\.013/.test(f_tiltBlock[0])) {
  fail('f_tilt registry entry missing Lissauer 2012 DOI.');
}
if (f_tiltBlock && /S0012821X15003510/.test(f_tiltBlock[0])) {
  fail('f_tilt registry entry still references the wrong EPSL article ID.');
}
if (f_tiltBlock && /Williams & Pollard 2002/.test(f_tiltBlock[0])) {
  fail('f_tilt registry entry still references Williams & Pollard 2002 as the active source.');
}

const f_CHNOPSBlock = /f_CHNOPS:\s*\{[\s\S]*?\},/m.exec(registry);
if (f_CHNOPSBlock && !/2203\.10056/.test(f_CHNOPSBlock[0])) {
  fail('f_CHNOPS registry entry missing Krijt et al. 2022 arXiv source.');
}
if (f_CHNOPSBlock && /Asplund 2009/.test(f_CHNOPSBlock[0])) {
  fail('f_CHNOPS registry entry still uses Asplund 2009 as the active source.');
}

if (failures) {
  process.stderr.write(`Bio/Geophysical sources test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass(`Bio/Geophysical source links and tooltip framing verified for ${cards.length} cards.`);
pass('Registry doiOrUrl entries consistent for f_H2O, f_rotation, f_tilt, and f_CHNOPS.');
