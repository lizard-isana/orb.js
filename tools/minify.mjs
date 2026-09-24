import fs from 'fs/promises';
import { minify } from 'terser';

const bundles = [
  ['../dist/orb.js', '../dist/orb.min.js'],
  ['../dist/orb-compat.js', '../dist/orb-compat.min.js']
];

for (const [sourceName, outputName] of bundles) {
  const sourcePath = new URL(sourceName, import.meta.url);
  const outputPath = new URL(outputName, import.meta.url);
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = await minify(source, {
    compress: true,
    mangle: true,
    format: { comments: /^!/ }
  });

  if (typeof result.code !== 'string' || result.code.length === 0) {
    throw new Error(`terser did not produce ${outputName}`);
  }
  await fs.writeFile(outputPath, `${result.code}\n`);
}
