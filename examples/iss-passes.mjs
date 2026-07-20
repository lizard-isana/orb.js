// ISS パス予測 — orb.js 教材例
//
// TLE(2行軌道要素)から、観測地の上空を ISS が通過する時刻・方角・
// 最大仰角を計算します。ライブラリの4層 — SGP4 伝播、TEME 座標系の
// 変換グラフ、観測パイプライン、イベント探索 — が1本につながる例です
// (ガイド第6章)。実行: node examples/iss-passes.mjs
//
// 注意: TLE は数日で鮮度が落ちる「生もの」です。下の TLE はテストと
// 同じ 2020-01-14 エポックの固定値なので、探索もエポック直後の48時間に
// しています。実際の予報には CelesTrak (https://celestrak.org) などで
// 取得した最新の TLE を貼り付け、探索期間を現在時刻にしてください。

import { Instant } from '../src/time/instant.js';
import { observer } from '../src/observer/observer.js';
import { satellite } from '../src/sgp4/satellite.js';
import { passes } from '../src/events/passes.js';

const iss = satellite({
  name: 'ISS (ZARYA)',
  line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});

const site = observer({ latitude: 35.658, longitude: 139.741, height: 25 }); // 東京

const from = iss.elements.epoch;        // TLE エポックから
const to = from.addDays(2);             // 48時間ぶんを探索
const list = passes(site, iss, from, to, { minElevation: 10 });

// 方位角(北=0°、東回り)を16方位の名前にする
const DIRS = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東',
  '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
const dir = (az) => DIRS[Math.round(az / 22.5) % 16];
const hhmm = (t) => t.toDate().toISOString().slice(11, 19);

console.log(`${iss.name} のパス予測(東京、仰角10°以上)`);
console.log(`軌道周期 ${iss.orbitalPeriod.toFixed(1)} 分 / ` +
  `高度 ${iss.perigee.toFixed(0)}-${iss.apogee.toFixed(0)} km`);
console.log(`${from.toDate().toISOString().slice(0, 10)} から48時間 (時刻は UTC)\n`);

for (const p of list) {
  const min = ((p.set.t.utcMs - p.rise.t.utcMs) / 60000).toFixed(1);
  console.log(
    `${p.rise.t.toDate().toISOString().slice(0, 10)}  ` +
    `${hhmm(p.rise.t)} ${dir(p.rise.azimuth)}から出現 → ` +
    `${hhmm(p.culmination.t)} 最大仰角 ${p.culmination.elevation.toFixed(0)}° ` +
    `(${dir(p.culmination.azimuth)}) → ` +
    `${hhmm(p.set.t)} ${dir(p.set.azimuth)}へ (${min}分)`);
}
