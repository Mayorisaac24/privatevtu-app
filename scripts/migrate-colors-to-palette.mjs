#!/usr/bin/env node
/**
 * One-off migration: replace hardcoded hex literals with Palette/FormColors tokens.
 * Skips theme color definition files.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', 'scripts']);
const SKIP_FILES = new Set([
  'src/theme/colors/app-colors.ts',
  'app.json',
]);

const REPLACEMENTS = [
  ["'#FAF5FF'", 'Palette.headerTint'],
  ['"#FAF5FF"', 'Palette.headerTint'],
  ["'#FAFBFC'", 'FormColors.bg'],
  ['"#FAFBFC"', 'FormColors.bg'],
  ["'#FAFAFE'", 'FormColors.bgAlt'],
  ['"#FAFAFE"', 'FormColors.bgAlt'],
  ["'#FAFAFA'", 'FormColors.bgNeutral'],
  ['"#FAFAFA"', 'FormColors.bgNeutral'],
  ["'#F5F3FF'", 'Palette.violet50'],
  ['"#F5F3FF"', 'Palette.violet50'],
  ["'#EDE9FE'", 'Palette.violet100'],
  ['"#EDE9FE"', 'Palette.violet100'],
  ["'#F1F5F9'", 'Palette.slate100'],
  ['"#F1F5F9"', 'Palette.slate100'],
  ["'#F8FAFC'", 'Palette.slate50'],
  ['"#F8FAFC"', 'Palette.slate50'],
  ["'#E2E8F0'", 'Palette.slate200'],
  ['"#E2E8F0"', 'Palette.slate200'],
  ["'#FFFFFF'", 'Palette.white'],
  ['"#FFFFFF"', 'Palette.white'],
  ["'#fff'", 'Palette.white'],
  ['"#fff"', 'Palette.white'],
  ["'#0F172A'", 'Palette.slate900'],
  ['"#0F172A"', 'Palette.slate900'],
  ["'#64748B'", 'Palette.slate500'],
  ['"#64748B"', 'Palette.slate500'],
  ["'#059669'", 'Palette.emerald600'],
  ['"#059669"', 'Palette.emerald600'],
  ["'#D97706'", 'Palette.amber600'],
  ['"#D97706"', 'Palette.amber600'],
  ["'#92400E'", 'Palette.amber700'],
  ['"#92400E"', 'Palette.amber700'],
  ["'#5B21B6'", 'Palette.violet800'],
  ['"#5B21B6"', 'Palette.violet800'],
  ["'#2E1065'", 'Palette.indigoDeep'],
  ['"#2E1065"', 'Palette.indigoDeep'],
  ["'#4C1D95'", 'BRAND.primaryDeep'],
  ['"#4C1D95"', 'BRAND.primaryDeep'],
  ["'#7C3AED'", 'BRAND.primary'],
  ['"#7C3AED"', 'BRAND.primary'],
  ["'#2563EB'", 'Palette.blue500'],
  ['"#2563EB"', 'Palette.blue500'],
  ["'#DC2626'", 'Palette.red600'],
  ['"#DC2626"', 'Palette.red600'],
  ["'#EF4444'", 'Palette.red500'],
  ['"#EF4444"', 'Palette.red500'],
  ["'#FFFBEB'", 'Palette.amber50'],
  ['"#FFFBEB"', 'Palette.amber50'],
  ["'#FEF2F2'", 'Palette.red50'],
  ['"#FEF2F2"', 'Palette.red50'],
  ["'#FEE2E2'", 'Palette.emerald200'],
  ['"#FEE2E2"', 'Palette.emerald200'],
  ["'#DCFCE7'", 'Palette.green100'],
  ['"#DCFCE7"', 'Palette.green100'],
  ["'#E9D5FF'", 'Palette.heroTextMuted'],
  ['"#E9D5FF"', 'Palette.heroTextMuted'],
  ["'#FCA5A5'", 'Palette.red300'],
  ['"#FCA5A5"', 'Palette.red300'],
  ["'#FECACA'", 'Palette.red300'],
  ['"#FECACA"', 'Palette.red300'],
  ["'#000'", 'Palette.black'],
  ['"#000"', 'Palette.black'],
  ["'#000000'", 'Palette.black'],
  ['"#000000"', 'Palette.black'],
  ["'#EEF2FF'", 'Palette.pendingBg'],
  ['"#EEF2FF"', 'Palette.pendingBg'],
  ["'#4338CA'", 'Palette.pendingText'],
  ['"#4338CA"', 'Palette.pendingText'],
  ["'#6366F1'", 'Palette.pendingDot'],
  ['"#6366F1"', 'Palette.pendingDot'],
  ["'#7C6A9E'", 'Palette.methodTabSub'],
  ['"#7C6A9E"', 'Palette.methodTabSub'],
  ["'#A7F3D0'", 'Palette.successSoft'],
  ['"#A7F3D0"', 'Palette.successSoft'],
  ["'rgba(15, 23, 42, 0.08)'", 'Overlays.borderSubtle'],
  ["'rgba(15, 23, 42, 0.07)'", 'Overlays.borderFaint'],
  ["'rgba(124, 58, 237, 0.1)'", 'Overlays.violet10'],
  ["'rgba(5, 150, 105, 0.1)'", 'Overlays.emerald14'],
  ["'rgba(148, 163, 184, 0.12)'", 'Overlays.slateMuted12'],
  ["'rgba(255,255,255,0.16)'", 'Overlays.white16'],
  ["'rgba(255, 255, 255, 0.16)'", 'Overlays.white16'],
];

const IMPORT_LINE = "import { Palette, Overlays, FormColors, BRAND } from '../theme/colors/app-colors';\n";
const IMPORT_LINE_SRC = "import { Palette, Overlays, FormColors, BRAND } from './theme/colors/app-colors';\n";
const IMPORT_LINE_APP = (depth) => `import { Palette, Overlays, FormColors, BRAND } from '${'../'.repeat(depth)}src/theme/colors/app-colors';\n`;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function needsImport(content) {
  return /\b(Palette|FormColors|BRAND|Overlays)\./.test(content)
    && !/from ['"].*app-colors['"]/.test(content)
    && !/from ['"]@\/src\/theme['"]/.test(content);
}

function resolveImport(content, filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (rel.startsWith('src/')) return IMPORT_LINE_SRC;
  if (rel.startsWith('app/')) {
    const depth = rel.split('/').length - 1;
    return IMPORT_LINE_APP(depth);
  }
  return IMPORT_LINE;
}

function hasThemeImport(content) {
  return /from ['"].*\/theme['"]/.test(content) || /from ['"]@\/src\/theme['"]/.test(content);
}

function patchThemeImport(content) {
  return content.replace(
    /import \{([^}]+)\} from (['"])([^'"]*\/theme)\2;/g,
    (match, imports, quote, mod) => {
      const names = imports.split(',').map((s) => s.trim()).filter(Boolean);
      const extras = ['Palette', 'FormColors', 'BRAND', 'Overlays'].filter((n) => !names.includes(n));
      if (!extras.length) return match;
      return `import {${imports}, ${extras.join(', ')} } from ${quote}${mod}${quote};`;
    },
  );
}

let changed = 0;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP_FILES.has(rel)) continue;
  if (rel.startsWith('src/theme/colors/')) continue;

  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    if (hasThemeImport(content)) {
      content = patchThemeImport(content);
    } else if (needsImport(content)) {
      const importLine = resolveImport(content, file);
      const idx = content.indexOf('\n');
      content = content.slice(0, idx + 1) + importLine + content.slice(idx + 1);
    }
    fs.writeFileSync(file, content);
    changed += 1;
    console.log('updated', rel);
  }
}

console.log(`Done. ${changed} files updated.`);
