// 今夜の星空 — orb.js 教材例 / AI 向けインターフェイスのデモ
//
// 観測地と時刻を渡すと、その瞬間に空にある天体(月・惑星・明るい恒星)を
// 一つの「シーン」として返します。生成AIがそのまま星空解説に語り下ろせる
// よう、値には単位が付き、適用した/しなかった補正が明示されます。
// 実行: node examples/tonight-sky.mjs   (現在時刻・東京)
//       node examples/tonight-sky.mjs 2026-12-24T12:00:00Z

import { Instant } from '../src/time/instant.js';
import { observer } from '../src/observer/observer.js';
import { visibleSky } from '../src/sky/visible.js';

const t = process.argv[2] ? Instant.fromISO(process.argv[2]) : Instant.fromDate(new Date());
const site = observer({ latitude: 35.681, longitude: 139.767, height: 40 }); // 東京

const scene = visibleSky(site, t, { minElevation: 10, maxMagnitude: 3 });
const jst = new Date(t.utcMs + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 16);

console.log(`東京の空 ${jst} JST — ${scene.conditions.phase} (太陽高度 ${scene.conditions.sun_elevation_deg}°)`);
const m = scene.visible.moon;
console.log(`月: ${m.up ? `${m.direction} 高度 ${m.elevation_deg}°` : '地平線下'}` +
  ` / ${m.phase} (${Math.round(m.illumination * 100)}%)`);
console.log(`惑星(高度10°以上): ` +
  (scene.visible.planets.map((p) => `${p.name} ${p.direction}${p.elevation_deg}°`).join(', ') || 'なし'));
console.log(`明るい恒星 ${scene.visible.counts.stars} 個(${scene.visible.counts.star_magnitude_limit}等まで)。見どころ:`);
for (const h of scene.highlights) console.log('  - ' + h);

// 完全なシーン(このJSONがAIツールの出力そのもの)
console.log('\n--- scene envelope (JSON) ---');
console.log(JSON.stringify(scene, null, 2));
