#!/usr/bin/env node
/**
 * Migrates static StyleSheet.create({ ... Colors.* }) to reactive useThemedStyles.
 * Run: node scripts/migrate-themed-styles.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SKIP = new Set([
  'src/theme/ThemeProvider.tsx',
  'src/components/ui/ThemedScreen.tsx',
  'src/components/purchase/PurchaseConfirmCard.tsx',
]);

const STYLE_REPLACEMENTS = [
  [/Colors\./g, 'colors.'],
  [/Palette\.white/g, 'colors.card'],
  [/Palette\.slate50/g, 'colors.surface'],
  [/Palette\.slate900/g, 'colors.dark'],
  [/Palette\.slate500/g, 'colors.muted'],
  [/FormColors\.bgAlt/g, 'colors.formBgAlt'],
  [/FormColors\.bgNeutral/g, 'colors.formBgNeutral'],
  [/FormColors\.bg\b/g, 'colors.formBg'],
  [/FormColors\.otpFilled/g, 'colors.inputFilled'],
  [/FormColors\.pinFilled/g, 'colors.pinFilled'],
  [/Overlays\.borderSubtle/g, 'colors.borderSubtle'],
  [/Overlays\.glassBorder/g, 'colors.glassBorder'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'ios', 'android', '.expo'].includes(entry.name)) continue;
      walk(full, files);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function transformStyleBlock(block) {
  let out = block;
  for (const [re, rep] of STYLE_REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out;
}

function findMatchingBrace(content, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function migrateFile(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, '/');
  if (SKIP.has(rel)) return false;

  let content = fs.readFileSync(absPath, 'utf8');
  if (!content.includes('StyleSheet.create')) return false;
  if (!/\bColors\.|\bPalette\.(white|slate50|slate900|slate500)\b|\bFormColors\./.test(content)) return false;
  if (content.includes('useThemedStyles(')) return false;

  const styleDeclRe = /const\s+(styles\w*)\s*=\s*StyleSheet\.create\(\{/g;
  const renames = [];
  let match;
  while ((match = styleDeclRe.exec(content)) !== null) {
    renames.push({ name: match[1], start: match.index, openBrace: match.index + match[0].length - 1 });
  }
  if (renames.length === 0) return false;

  // Process from end to start to preserve indices
  for (let i = renames.length - 1; i >= 0; i--) {
    const { name, start, openBrace } = renames[i];
    const closeBrace = findMatchingBrace(content, openBrace);
    if (closeBrace === -1) continue;
    const end = closeBrace + 3; // `});`
    const block = content.slice(start, end);
    const factoryName = name === 'styles' ? 'createStyles' : `create${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    const depth = rel.split('/').length - 1;
    const typeImport = `${'../'.repeat(depth)}theme/types`;
    let newBlock = block.replace(
      `const ${name} = StyleSheet.create(`,
      `const ${factoryName} = (colors: import('${typeImport}').ThemeColors) => StyleSheet.create(`,
    );
    newBlock = transformStyleBlock(newBlock);
    content = content.slice(0, start) + newBlock + content.slice(end);
    renames[i].factoryName = factoryName;
  }

  // Inject useThemedStyles into first exported component function
  const componentRe = /export\s+(?:default\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/;
  const compMatch = content.match(componentRe);
  if (!compMatch) return false;

  const factoryName = renames[0].factoryName || 'createStyles';
  const hookLine = `  const styles = useThemedStyles(${factoryName});\n`;
  const insertAt = compMatch.index + compMatch[0].length;
  if (!content.slice(insertAt, insertAt + 80).includes('useThemedStyles(')) {
    content = content.slice(0, insertAt) + '\n' + hookLine + content.slice(insertAt);
  }

  // Ensure imports
  if (!content.includes('useThemedStyles')) {
    const depth = rel.split('/').length - 1;
    const hookImport = `${'../'.repeat(depth)}theme/hooks`;
    const themeImportMatch = content.match(/from ['"]([^'"]*theme(?:\/hooks)?)['"]/);
    if (content.includes("from '../../src/theme'") || content.includes("from '../theme'")) {
      if (content.includes("from '../../src/theme'")) {
        content = content.replace(
          /import \{([^}]+)\} from ['"]\.\.\/\.\.\/src\/theme['"];/,
          (m, imports) => {
            if (imports.includes('useThemedStyles')) return m;
            return `import {${imports.trim()}, useThemedStyles } from '../../src/theme';`;
          },
        );
      } else {
        content = content.replace(
          /import \{([^}]+)\} from ['"]\.\.\/theme['"];/,
          (m, imports) => {
            if (imports.includes('useThemedStyles')) return m;
            return `import {${imports.trim()}, useThemedStyles } from '../theme';`;
          },
        );
      }
    } else {
      const importLine = `import { useThemedStyles } from '${hookImport}';\n`;
      const firstImport = content.search(/^import /m);
      content = content.slice(0, firstImport) + importLine + content.slice(firstImport);
    }
  }

  fs.writeFileSync(absPath, content);
  return true;
}

const files = walk(path.join(ROOT, 'app')).concat(walk(path.join(ROOT, 'src')));
let count = 0;
for (const file of files) {
  if (migrateFile(file)) {
    count++;
    console.log('migrated:', path.relative(ROOT, file));
  }
}
console.log(`Done. Migrated ${count} files.`);
