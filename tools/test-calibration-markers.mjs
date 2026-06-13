#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function attr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`\\b${escaped}=["']([^"']*)["']`, 'i').exec(tag);
  return match ? match[1] : '';
}

function textContent(markup) {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsSourceLink(label) {
  return sourceLinks.some(link => textContent(link).includes(label));
}

if (!html.includes('class="calibration-legend"')) {
  fail('Calibration legend is missing.');
}

if (html.includes('calibration-marker') || css.includes('calibration-marker')) {
  fail('Legacy calibration-marker class remains in index.html or src/styles.css.');
}

const badgePattern = /<span\b(?=[^>]*\bclass=["'][^"']*\bcalibration-badge\b[^"']*["'])[^>]*>[\s\S]*?<\/span>/gi;
const badges = [...html.matchAll(badgePattern)].map(match => match[0]);
const badgeTexts = badges.map(textContent);

if (!badgeTexts.includes('LC')) fail('No LC calibration badge found.');
if (!badgeTexts.includes('LI')) fail('No LI calibration badge found.');
if (!badgeTexts.includes('MS')) fail('No MS calibration badge found.');
if (!badgeTexts.includes('MP')) fail('No MP calibration badge found.');
if (badgeTexts.some(text => text === '*' || text === '**')) {
  fail('Visible star marker remains as a calibration label.');
}

for (const badge of badges) {
  const tooltip = attr(badge, 'data-tooltip');
  const text = textContent(badge);
  if (!tooltip) fail(`Calibration badge ${text} missing data-tooltip.`);
  if (attr(badge, 'tabindex') !== '0') fail(`Calibration badge ${text} missing tabindex="0".`);
  if (!attr(badge, 'aria-label')) fail(`Calibration badge ${text} missing aria-label.`);
  if (attr(badge, 'role') === 'button') {
    fail('Calibration badge should not use role="button" because it is a focusable tooltip trigger, not an action button.');
  }
  if (text === 'LC' && !/direct literature\/reference|anchored|reference default|astronomical reference/i.test(tooltip)) {
    fail(`LC tooltip does not explain direct/reference calibration: ${tooltip}`);
  }
  if (text === 'LI' && !/literature-informed numerical prior|approximate numerical context|directly quoted/i.test(tooltip)) {
    fail(`LI tooltip does not explain literature-informed numerical-prior status: ${tooltip}`);
  }
  if (text === 'MS' && !/mechanism-supported model prior|does not provide this exact numerical value or range|cited literature supports the mechanism/i.test(tooltip)) {
    fail(`MS tooltip does not explain mechanism-supported status: ${tooltip}`);
  }
  if (text === 'MP' && !/(speculative\/user model prior|scenario|user-defined|user-supplied|not empirically calibrated)/i.test(tooltip)) {
    fail(`MP tooltip does not explain speculative/user-prior status: ${tooltip}`);
  }
  if (/^(Needs calibration|Uncertain value|Model estimate)$/i.test(tooltip.trim())) {
    fail(`Calibration badge ${text} uses vague tooltip wording: ${tooltip}`);
  }
}

const labelBadgePattern =
  /<label>\s*([^<]+?)\s*<span\b(?=[^>]*\bclass=["'][^"']*\bcalibration-badge\b[^"']*["'])([^>]*)>(LC|LI|MS|MP)<\/span>\s*<\/label>/gi;
const labelBadges = new Map();
const labelBadgeAttrs = new Map();
for (const match of html.matchAll(labelBadgePattern)) {
  const label = match[1].replace(/\s+/g, ' ').trim();
  labelBadges.set(label, match[3]);
  labelBadgeAttrs.set(label, match[2]);
}

const expectedBadgeByLabel = new Map([
  ['G-type fraction', 'LI'],
  ['K-type fraction', 'LI'],
  ['M-type fraction', 'LI'],
  ['G-type HZ weight', 'MS'],
  ['K-type HZ weight', 'MS'],
  ['M-type HZ weight', 'MS'],
  ['G-type activity penalty', 'MS'],
  ['K-type activity penalty', 'MS'],
  ['M-type activity penalty', 'MS'],
  ['M-type tidal-lock penalty', 'MS'],
  ['f_atm_ret', 'MS'],
  ['f_volatile_delivery', 'MS'],
  ['f_water_retention', 'MS'],
  ['f_tectonics', 'MS'],
  ['f_radiogenic', 'MS'],
  ['f_climate_feedback', 'MS'],
  ['f_spin_climate (G-host)', 'MS'],
  ['f_spin_climate (K-host)', 'MS'],
  ['f_spin_climate (M-host)', 'MS'],
  ['Moon boost factor', 'MS'],
  ['P_rocky_true', 'LI'],
  ['Total stars in galaxy', 'LI'],
  ['Scale length (kpc)', 'LI'],
  ['Inner GHZ boundary (kpc)', 'LI'],
  ['Outer GHZ boundary (kpc)', 'LI'],
  ['Metallicity threshold [Fe/H]', 'MS'],
  ['f_XUV_quiet', 'MS'],
  ['f_uv', 'MS'],
  ['f_binary', 'LI'],
  ['f_rad', 'LI'],
  ['Stellar mass (M☉)', 'LC'],
  ['System age (Gyr)', 'LC'],
  ['Galactocentric R (kpc)', 'LC']
]);

for (const [label, expected] of expectedBadgeByLabel) {
  const actual = labelBadges.get(label);
  if (actual !== expected) {
    fail(`Calibration badge mismatch for "${label}": expected ${expected}, got ${actual || 'missing'}.`);
  }
}

const expectedMainBadgeByLabel = new Map([
  ['Stars in GHZ', 'LI'],
  ['Sun-like Stars (f_⊙)', 'LI'],
  ['Old Enough Stars (f_age)', 'LC'],
  ['Planets per Star (N_p)', 'LI'],
  ['Rocky Planets (f_rocky)', 'LI'],
  ['Habitable Zone (f_HZ)', 'LI'],
  ['Orbital Stability (f_stab)', 'MS'],
  ['Magnetic Field (f_B)', 'MS'],
  ['Lunar Stabilizer (f_moon)', 'MS'],
  ['Suitable Size (f_size)', 'LI'],
  ['Suitable Rotation (f_ω)', 'MS'],
  ['Favorable Tilt (f_ε)', 'MS'],
  ['Surface Water (f_H₂O)', 'MS'],
  ['CHNOPS Elements (f_CHNOPS)', 'MS'],
  ['Complex Life (f_life)', 'MP'],
  ['Wildcard Factor (f_x)', 'MP'],
  ['Uncertainty (%)', 'MP'],
]);

function mainCardBadge(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const labelMatch = new RegExp(`<label>\\s*${escaped}\\s*<\\/label>`, 'i').exec(html);
  if (!labelMatch) return '';

  const cardStart = html.lastIndexOf('<div class="input-card', labelMatch.index);
  if (cardStart === -1) return '';

  const nextCard = html.indexOf('<div class="input-card', cardStart + 1);
  const card = html.slice(cardStart, nextCard === -1 ? html.length : nextCard);
  const badgeMatch = /<span\b(?=[^>]*\bclass=["'][^"']*\bcalibration-badge\b[^"']*["'])[^>]*>(LC|LI|MS|MP)<\/span>/i.exec(card);
  return badgeMatch ? badgeMatch[1] : '';
}

const mainLabelBadges = new Map(
  [...expectedMainBadgeByLabel.keys()].map(label => [label, mainCardBadge(label)])
);

for (const [label, expected] of expectedMainBadgeByLabel) {
  const actual = mainLabelBadges.get(label);
  if (actual !== expected) {
    fail(`Main parameter badge mismatch for "${label}": expected ${expected}, got ${actual || 'missing'}.`);
  }
}

const expectedModuleBadgeCounts = new Map([
  ['LC', 3],
  ['LI', 10],
  ['MS', 20]
]);

for (const [badge, expectedCount] of expectedModuleBadgeCounts) {
  const actualCount = [...expectedBadgeByLabel.keys()].filter(label => labelBadges.get(label) === badge).length;
  if (actualCount !== expectedCount) {
    fail(`Module ${badge} badge count changed: expected ${expectedCount}, got ${actualCount}.`);
  }
}

const requiredLcTooltips = new Map([
  [
    'Stellar mass (M☉)',
    'Solar-reference default. This value is used as a standard astronomical reference point, not as an uncertain biological prior.'
  ],
  [
    'System age (Gyr)',
    'Solar-age reference default. This value is used as a standard astronomical reference point for the current Sun-Earth context.'
  ],
  [
    'Galactocentric R (kpc)',
    'Solar-neighborhood reference default. The value is used as a standard galactocentric reference point for the model.'
  ]
]);

for (const [label, tooltip] of requiredLcTooltips) {
  const attrs = labelBadgeAttrs.get(label);
  if (!attrs) {
    fail(`Required LC badge is missing for "${label}".`);
    continue;
  }
  if (labelBadges.get(label) !== 'LC') {
    fail(`Required LC field "${label}" has ${labelBadges.get(label) || 'no'} badge instead of LC.`);
  }
  if (attr(attrs, 'data-tooltip') !== tooltip) {
    fail(`Required LC tooltip mismatch for "${label}".`);
  }
  if (attr(attrs, 'tabindex') !== '0') {
    fail(`Required LC badge "${label}" missing tabindex="0".`);
  }
  if (!attr(attrs, 'aria-label')) {
    fail(`Required LC badge "${label}" missing aria-label.`);
  }
}

function inputTagById(id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<input\\b(?=[^>]*\\bid=["']${escaped}["'])[^>]*>`, 'i').exec(html);
  return match ? match[0] : '';
}

const expectedMainInputValues = new Map([
  ['N_GHZ', '10000000000'],
  ['f_sun_type', '0.08'],
  ['f_sun_age', '0.75'],
  ['N_p_star', '1.5'],
  ['f_composition', '0.25'],
  ['f_orbit', '0.21'],
  ['f_stability', '0.50'],
  ['f_magnetosphere', '0.50'],
  ['f_lunar_stability', '0.70'],
  ['f_size', '0.50'],
  ['f_rotation', '0.27'],
  ['f_tilt', '0.60'],
  ['f_H2O', '0.30'],
  ['f_CHNOPS', '0.10'],
  ['f_complex_life', '0.01'],
  ['f_x', '1'],
  ['iterations', '2000'],
  ['sampling_uncertainty', '50']
]);

for (const [id, expectedValue] of expectedMainInputValues) {
  const tag = inputTagById(id);
  const actualValue = tag ? attr(tag, 'value') : '';
  if (actualValue !== expectedValue) {
    fail(`Main input value changed for ${id}: expected ${expectedValue}, got ${actualValue || 'missing'}.`);
  }
}

for (const text of ['LC = direct literature/reference value', 'LI = literature-informed numerical prior', 'MS = mechanism-supported model prior', 'MP = speculative/user model prior']) {
  const pattern = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ = /, '[\\s\\S]{0,80}'), 'i');
  if (!pattern.test(html)) fail(`Calibration legend missing ${text}.`);
}

for (const [label, expected] of [...expectedMainBadgeByLabel, ...expectedBadgeByLabel]) {
  if (expected === 'MS') continue;
  const actual = expectedMainBadgeByLabel.has(label)
    ? mainLabelBadges.get(label)
    : labelBadges.get(label);
  if (actual === 'MP' && /Mechanism|mechanism|Orbital|Magnetic|Lunar|Rotation|Tilt|Water|CHNOPS|activity|retention|tectonics|feedback|XUV|uv|Metallicity/.test(label)) {
    fail(`Mechanism-supported value "${label}" still uses MP instead of MS.`);
  }
}

if (/all values are literature-calibrated/i.test(html + css)) {
  fail('Text incorrectly claims all values are literature-calibrated.');
}

const sourceLinkPattern = /<a\b(?=[^>]*\bclass=["'][^"']*\bsource-link\b[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi;
const sourceLinks = [...html.matchAll(sourceLinkPattern)].map(match => match[0]);

for (const link of sourceLinks) {
  const href = attr(link, 'href');
  if (!href) fail(`Source link missing href: ${textContent(link)}`);
  if (href.trim() === '') fail(`Source link has empty href: ${textContent(link)}`);

  if (/^https?:\/\//i.test(href)) {
    if (attr(link, 'target') !== '_blank') fail(`External source link missing target="_blank": ${textContent(link)}`);
    const rel = attr(link, 'rel');
    if (!/\bnoopener\b/i.test(rel) || !/\bnoreferrer\b/i.test(rel)) {
      fail(`External source link missing noopener noreferrer rel: ${textContent(link)}`);
    }
  }

  if (href === '#') {
    fail(`Placeholder source link must be replaced before release: ${textContent(link)}`);
  }

  if (!attr(link, 'aria-label')) fail(`Source link missing aria-label: ${textContent(link)}`);
}

for (const label of ['Fulton et al. 2017', 'Rogers 2015', 'Berger et al. 2020']) {
  if (!containsSourceLink(label)) fail(`Radius-Valley source label is not clickable: ${label}`);
}

for (const label of ['Rimmer et al. 2018', 'Ranjan et al. 2017', 'Ranjan et al. 2022']) {
  if (!containsSourceLink(label)) fail(`Prebiotic UV source label is not clickable: ${label}`);
}

if (failures) {
  process.stderr.write(`Calibration badge/source-link test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass(`Calibration badge accessibility checks passed for ${badges.length} badges.`);
pass(`Main parameter badge checks passed for ${expectedMainBadgeByLabel.size} controls.`);
pass(`Calibration badge classification checks passed for ${expectedBadgeByLabel.size} module values.`);
pass(`Main parameter value preservation checks passed for ${expectedMainInputValues.size} inputs.`);
pass(`Source link checks passed for ${sourceLinks.length} links.`);
pass('Required Radius-Valley and Prebiotic UV source labels are clickable.');
