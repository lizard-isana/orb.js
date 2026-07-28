// 50行で太陽位置 — orb.js 教材例
//
// ライブラリを一切使わずに、太陽の視赤経・視赤緯を約0.01°の精度で計算する
// 最小実装です(Meeus, Astronomical Algorithms 25章の簡易理論)。
// orb.js 本体が数千項の級数でやっていることの「骨格」がこの50行です。
// 実行: node examples/sun-in-50-lines.mjs
const RAD = Math.PI / 180;

export const sunPosition = (date) => {
  // 1. 時刻: UTC → ユリウス日 → TT のユリウス世紀(ガイド第1章)
  const jd = date.getTime() / 86400000 + 2440587.5; // UTC のユリウス日
  const T = (jd + 69.184 / 86400 - 2451545.0) / 36525; // TT に直して J2000 から

  // 2. 地球の軌道運動を3つの数で表す
  const L0 = (280.46646 + 36000.76983 * T) % 360;    // 幾何学的平均黄経
  const M = (357.52911 + 35999.05029 * T) % 360;     // 平均近点角
  const e = 0.016708634 - 0.000042037 * T;           // 軌道離心率

  // 3. 「中心差」: 楕円軌道のせいで平均運動からずれる分(最大約1.9°)。
  //    ケプラー方程式を解く代わりに、級数展開の先頭3項で近似する
  const C = (1.914602 - 0.004817 * T) * Math.sin(M * RAD)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
    + 0.000289 * Math.sin(3 * M * RAD);

  // 4. 真黄経 → 視黄経: 章動の主要項と光行差を足す。
  //    どちらも小さい(±17″と−20″)が、「視位置」を名乗るには必須
  const omega = (125.04 - 1934.136 * T) * RAD;       // 月の昇交点黄経
  const lambda = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;

  // 5. 黄道座標 → 赤道座標: 黄道傾斜角で回転(ガイド第2章)
  const eps = (23.439291 - 0.0130042 * T + 0.00256 * Math.cos(omega)) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));

  // 6. 距離(au): 楕円軌道の動径。真近点角 ≈ M + C
  const nu = (M + C) * RAD;
  const distance = 1.000001018 * (1 - e * e) / (1 + e * Math.cos(nu));

  return {
    ra: (ra / RAD / 15 + 24) % 24, // 時
    dec: dec / RAD,                // 度
    distance                       // au
  };
};

// コマンドラインから直接実行されたときだけ表示する
if (import.meta.url === `file://${process.argv[1]}`) {
  const now = new Date();
  const s = sunPosition(now);
  console.log(`太陽の位置 ${now.toISOString()}`);
  console.log(`  赤経: ${s.ra.toFixed(4)} 時`);
  console.log(`  赤緯: ${s.dec.toFixed(4)} 度`);
  console.log(`  距離: ${s.distance.toFixed(6)} au`);
}
