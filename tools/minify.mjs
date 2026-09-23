import fs from 'fs/promises';
import { minify } from 'terser';

const sourcePath = new URL('../dist/orb.js', import.meta.url);
const outputPath = new URL('../dist/orb.min.js', import.meta.url);
const source = await fs.readFile(sourcePath, 'utf8');
const result = await minify(source, {
  compress: true,
  mangle: true,
  format: { comments: /^!/ }
});

if (typeof result.code !== 'string' || result.code.length === 0) {
  throw new Error('terser did not produce a minified bundle');
}
await fs.writeFile(outputPath, `${result.code}\n`);
