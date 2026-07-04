#!/usr/bin/env node
/**
 * Migrate hardcoded rgba() literals to Overlays.* tokens in app-colors.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP_COLORS = path.join(ROOT, 'src/theme/colors/app-colors.ts');
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', 'scripts']);
const SKIP_FILES = new Set(['src/theme/colors/app-colors.ts', 'src/theme/colors/ui-semantics.ts']);

const rgbaRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/g;

function normalize(r, g, b, a = '1') {
  const alpha = Number(a);
  const aStr = Number.isInteger(alpha) ? String(alpha) : String(alpha);
  return `rgba(${r}, ${g}, ${b}, ${aStr})`;
}

function parseRgba(str) {
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  return normalize(m[1], m[2], m[3], m[4] ?? '1');
}

function autoKey(r, g, b, a) {
  const aKey = String(a).replace('.', '');
  return `rgba${r}_${g}_${b}_${aKey}`;
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.(tsx?)$/.test(e.name)) files.push(p);
  }
  return files;
}

function loadOverlayMap() {
  const text = fs.readFileSync(APP_COLORS, 'utf8');
  const map = new Map();
  const block = text.match(/export const Overlays = \{([\s\S]*?)\} as const;/);
  if (!block) throw new Error('Overlays block not found');
  const pairRe = /(\w+):\s*'(rgba?\([^']+\))'/g;
  let m;
  while ((m = pairRe.exec(block[1]))) {
    const norm = parseRgba(m[2]);
    if (norm) map.set(norm, m[1]);
  }
  return { text, map };
}

function patchThemeImport(content) {
  return content.replace(
    /import \{([^}]+)\} from (['"])([^'"]*\/theme)\2;/g,
    (match, imports, quote, mod) => {
      const names = imports.split(',').map((s) => s.trim()).filter(Boolean);
      if (names.includes('Overlays')) return match;
      return `import {${imports}, Overlays } from ${quote}${mod}${quote};`;
    },
  );
}

function resolveImport(content, filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (rel.startsWith('src/')) {
    return "import { Overlays } from './theme/colors/app-colors';\n";
  }
  if (rel.startsWith('app/')) {
    const depth = rel.split('/').length - 1;
    return `import { Overlays } from '${'../'.repeat(depth)}src/theme/colors/app-colors';\n`;
  }
  return "import { Overlays } from '../theme/colors/app-colors';\n";
}

const { text: appColorsText, map: valueToKey } = loadOverlayMap();
const usedKeys = new Set(valueToKey.values());

// Collect all rgba in codebase
const allValues = new Map();
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP_FILES.has(rel) || rel.startsWith('src/theme/colors/')) continue;
  const content = fs.readFileSync(file, 'utf8');
  let m;
  rgbaRe.lastIndex = 0;
  while ((m = rgbaRe.exec(content))) {
    const raw = m[0];
    if (raw.includes('${')) continue;
    const norm = normalize(m[1], m[2], m[3], m[4] ?? '1');
    allValues.set(norm, raw);
  }
}

// Add missing keys
const additions = [];
for (const norm of [...allValues.keys()].sort()) {
  if (valueToKey.has(norm)) continue;
  let key = autoKey(...norm.replace(/rgba\(|\)/g, '').split(', '));
  while (usedKeys.has(key)) key = `${key}_x`;
  usedKeys.add(key);
  valueToKey.set(norm, key);
  additions.push({ key, norm });
}

if (additions.length) {
  const insert = additions.map(({ key, norm }) => `  ${key}: '${norm}',`).join('\n');
  const updated = appColorsText.replace(
    /(\n  walletOutIconBg: 'rgba\(220, 38, 38, 0\.12\)',\n\} as const;)/,
    `\n  walletOutIconBg: 'rgba(220, 38, 38, 0.12)',\n${insert}\n} as const;`,
  );
  fs.writeFileSync(APP_COLORS, updated);
  console.log(`Added ${additions.length} overlay tokens to app-colors.ts`);
}

// Build replacement map: exact raw string -> Overlays.key (both spaced and unspaced)
const replacements = new Map();
for (const [norm, raw] of allValues.entries()) {
  const key = valueToKey.get(norm);
  if (!key) continue;
  replacements.set(raw, `Overlays.${key}`);
  // also map normalized form variants
  replacements.set(norm, `Overlays.${key}`);
  const compact = norm.replace(/,\s+/g, ',');
  replacements.set(compact, `Overlays.${key}`);
  const spaced = norm.replace(/,/g, ', ');
  replacements.set(spaced, `Overlays.${key}`);
}

let changedFiles = 0;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP_FILES.has(rel) || rel.startsWith('src/theme/colors/')) continue;

  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Sort by length desc to avoid partial replacements
  const keys = [...replacements.keys()].sort((a, b) => b.length - a.length);
  for (const from of keys) {
    const to = replacements.get(from);
    content = content.split(`'${from}'`).join(to);
    content = content.split(`"${from}"`).join(to);
  }

  if (content !== original) {
    const needsOverlay = /Overlays\.\w+/.test(content) && !/from ['"].*app-colors['"]/.test(content);
    const hasTheme = /from ['"].*\/theme['"]/.test(content);
    if (hasTheme) content = patchThemeImport(content);
    else if (needsOverlay) {
      const idx = content.indexOf('\n');
      content = content.slice(0, idx + 1) + resolveImport(content, file) + content.slice(idx + 1);
    }
    fs.writeFileSync(file, content);
    changedFiles += 1;
    console.log('updated', rel);
  }
}

// Fix semantic.ts glassOverlay
let semantic = fs.readFileSync(path.join(ROOT, 'src/theme/colors/semantic.ts'), 'utf8');
semantic = semantic.replace("glassOverlay: 'rgba(255, 255, 255, 0.94)'", 'glassOverlay: Overlays.white94');
if (!semantic.includes("import { BRAND, FamilyAccents }")) {
  semantic = semantic.replace(
    "import { BRAND, FamilyAccents } from './app-colors';",
    "import { BRAND, FamilyAccents, Overlays } from './app-colors';",
  );
} else if (!semantic.includes('Overlays')) {
  semantic = semantic.replace(
    "from './app-colors';",
    "from './app-colors';\nimport { Overlays } from './app-colors';",
  );
}
// ensure single Overlays import
semantic = semantic.replace(
  /import \{ BRAND, FamilyAccents(?:, Overlays)? \} from '\.\/app-colors';\nimport \{ Overlays \} from '\.\/app-colors';\n/,
  "import { BRAND, FamilyAccents, Overlays } from './app-colors';\n",
);
fs.writeFileSync(path.join(ROOT, 'src/theme/colors/semantic.ts'), semantic);

console.log(`Done. ${changedFiles} files updated.`);
