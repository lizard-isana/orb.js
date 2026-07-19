#!/usr/bin/env node
// snippets.js — keeps the guide documents in sync with the real source.
//
// Source files mark teachable regions:
//
//     //#region edu:some-name
//     ... code ...
//     //#endregion
//
// Guide documents embed them:
//
//     <!-- snippet:some-name -->
//     ```js
//     (injected code)
//     ```
//     <!-- /snippet -->
//
// Usage:
//     node tools/snippets.js          # rewrite guides with fresh snippets
//     node tools/snippets.js --check  # exit 1 if any guide is stale/broken
//
// The --check mode runs in CI, so a guide can never quietly drift away
// from the code it claims to explain.

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const GUIDE_DIR = path.join(__dirname, '..', 'docs', 'guide');

const walk = (dir, ext) => {
  let out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out = out.concat(walk(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};

// Collect all edu snippets from src/.
const collectSnippets = () => {
  const snippets = {};
  for (const file of walk(SRC_DIR, '.js')) {
    const text = fs.readFileSync(file, 'utf8');
    const re = /\/\/#region edu:([\w-]+)\n([\s\S]*?)\/\/#endregion/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (snippets[name]) {
        throw new Error(`duplicate snippet name '${name}' in ${file} and ${snippets[name].file}`);
      }
      // Strip one trailing newline; keep indentation as-is.
      const code = m[2].replace(/\n$/, '');
      snippets[name] = { code, file: path.relative(path.join(__dirname, '..'), file) };
    }
  }
  return snippets;
};

const renderBlock = (name, snip) =>
  `<!-- snippet:${name} -->\n` +
  '```js\n' +
  `// ${snip.file}\n` +
  snip.code + '\n' +
  '```\n' +
  `<!-- /snippet -->`;

const processGuide = (file, snippets, check) => {
  const text = fs.readFileSync(file, 'utf8');
  let missing = [];
  const updated = text.replace(
    /<!-- snippet:([\w-]+) -->[\s\S]*?<!-- \/snippet -->/g,
    (whole, name) => {
      if (!snippets[name]) {
        missing.push(name);
        return whole;
      }
      return renderBlock(name, snippets[name]);
    }
  );
  if (missing.length) {
    throw new Error(`${file}: unknown snippet(s): ${missing.join(', ')}`);
  }
  if (updated !== text) {
    if (check) {
      throw new Error(`${file}: stale snippets — run: node tools/snippets.js`);
    }
    fs.writeFileSync(file, updated);
    return true;
  }
  return false;
};

const main = () => {
  const check = process.argv.includes('--check');
  const snippets = collectSnippets();
  if (!fs.existsSync(GUIDE_DIR)) {
    console.log('no guide directory, nothing to do');
    return;
  }
  let changed = 0;
  for (const file of walk(GUIDE_DIR, '.md')) {
    if (processGuide(file, snippets, check)) changed++;
  }
  console.log(`snippets: ${Object.keys(snippets).length} defined, ` +
    (check ? 'all guides in sync' : `${changed} guide file(s) updated`));
};

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
