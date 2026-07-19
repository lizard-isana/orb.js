#!/usr/bin/env node
// annotate.js — generate an annotated-source site from src/.
//
// Produces docs/annotated/<module>.html for every source file: comments in
// a left column, code in a right column (the underscore.js "annotated
// source" style). Zero dependencies; comments are rendered as plain text,
// code with minimal HTML escaping. Because the input is the shipped
// source itself, the pages can never disagree with the library.
//
// Usage: node tools/annotate.js

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'annotated');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const walk = (dir) => {
  let out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
};

// Split a JS file into alternating comment/code sections. A "section"
// starts at each block of full-line comments; the edu region markers are
// hidden from the rendering (they are tooling directives, not prose).
const sectionize = (text) => {
  const lines = text.split('\n');
  const sections = [];
  let cur = { comment: [], code: [] };
  let inCode = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^\/\/#(region|endregion)/.test(t)) continue; // tooling markers
    const isComment = t.startsWith('//');
    if (isComment && inCode) {
      sections.push(cur);
      cur = { comment: [], code: [] };
      inCode = false;
    }
    if (isComment) {
      cur.comment.push(t.replace(/^\/\/ ?/, ''));
    } else {
      cur.code.push(line);
      if (t !== '') inCode = true;
    }
  }
  sections.push(cur);
  return sections;
};

const PAGE_CSS = `
  body { margin: 0; font-family: system-ui, sans-serif; color: #1a2733; }
  .row { display: flex; border-bottom: 1px solid #edf1f4; }
  .doc { width: 38%; padding: 10px 18px; font-size: 14px; line-height: 1.55;
         color: #45525e; white-space: pre-wrap; }
  .code { width: 62%; padding: 10px 18px; background: #f7f9fa; overflow-x: auto; }
  pre { margin: 0; font: 13px/1.5 ui-monospace, monospace; }
  h1 { font-size: 18px; padding: 14px 18px; margin: 0; background: #10314f; color: #fff; }
  h1 a { color: #9fc3e8; text-decoration: none; }
  @media (max-width: 720px) { .row { flex-direction: column; } .doc, .code { width: auto; } }
`;

const renderFile = (file) => {
  const rel = path.relative(SRC_DIR, file);
  const sections = sectionize(fs.readFileSync(file, 'utf8'));
  const rows = sections
    .filter((s) => s.comment.length || s.code.join('').trim() !== '')
    .map((s) =>
      `<div class="row"><div class="doc">${esc(s.comment.join('\n'))}</div>` +
      `<div class="code"><pre>${esc(s.code.join('\n').replace(/\n+$/, ''))}</pre></div></div>`
    ).join('\n');
  return `<!doctype html><meta charset="utf-8">
<title>orb.js — ${esc(rel)}</title>
<style>${PAGE_CSS}</style>
<h1><a href="index.html">orb.js annotated source</a> / ${esc(rel)}</h1>
${rows}`;
};

const main = () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = walk(SRC_DIR).filter((f) => !f.includes(path.sep + 'data' + path.sep));
  const index = [];
  for (const file of files) {
    const rel = path.relative(SRC_DIR, file);
    const out = rel.replace(/[\\/]/g, '-').replace(/\.js$/, '.html');
    fs.writeFileSync(path.join(OUT_DIR, out), renderFile(file));
    index.push(`<li><a href="${out}">${esc(rel)}</a></li>`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>orb.js annotated source</title>
<style>${PAGE_CSS} li { margin: 4px 0; } ul { padding: 10px 30px; }</style>
<h1>orb.js annotated source</h1><ul>${index.join('\n')}</ul>`);
  console.log(`annotated: ${files.length} file(s) -> docs/annotated/`);
};

main();
