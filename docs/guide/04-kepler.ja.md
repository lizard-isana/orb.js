# 第4章 ケプラー問題 — ひとつの式で楕円も放物線も双曲線も

第3章の惑星理論は「あらかじめ解かれた答えの表」でした。この章では運動そのものを
解きます。**位置と速度が分かっている天体は、dt 秒後どこにいるか** — これが
ケプラー問題です。彗星や小惑星を軌道要素から追いかけるとき、人工衛星を
二体近似で飛ばすとき、軌道を設計するとき、必ずこの問題に帰着します。

## 4.1 二体問題 — 答えは円錐曲線

中心天体の重力だけを受ける質点の軌道は、必ず円錐曲線(楕円・放物線・双曲線)に
なります。どれになるかは力学的エネルギー ξ = v²/2 − μ/r の符号だけで決まります:

| ξ | 軌道 | 離心率 | 例 |
|---|---|---|---|
| ξ < 0 | 楕円 | e < 1 | 惑星、人工衛星 |
| ξ = 0 | 放物線 | e = 1 | ちょうど脱出速度の物体 |
| ξ > 0 | 双曲線 | e > 1 | 恒星間天体、スイングバイ |

ここで μ = GM は中心天体の重力定数です。G と M を別々に知る必要はありません —
実際、探査機の追跡で直接測れるのは積 GM で、G 単独よりはるかに高精度に
分かっています(`src/math/kepler.js` の `GM` 定数)。

## 4.2 3分岐の罠 — e = 1 は実在する

古典的な解法は軌道形状ごとに別物です。楕円にはケプラー方程式
M = E − e sin E、放物線にはバーカー方程式、双曲線には双曲線版ケプラー方程式 —
変数も式も3通り。コードをこの形で書くと分岐が3本でき、**ちょうど e = 1 の
境界で数値的に破綻**します。そして e ≈ 1 は教科書の中だけの存在ではありません:
サングレーザー彗星や、かろうじて束縛されたデブリは、まさにそこに住んでいます。

orb.js が使うユニバーサル変数法は、この分岐そのものを消します
(`src/math/kepler.js`):

<!-- snippet:kepler-universal -->
```js
// src/math/kepler.js
// Given a position and velocity around a single attracting mass, where
// is the body after time dt? That is the Kepler problem, and one pair
// of functions below solves it for EVERY orbit shape.
//
// The classical solution splits into three cases — ellipse (Kepler's
// equation), parabola (Barker's equation), hyperbola — each with its
// own anomaly variable and its own transcendental equation. Code
// written that way inherits the split: three branches, and numerical
// trouble exactly at e = 1, where real objects (sungrazing comets,
// barely captured debris) actually live.
//
// The universal-variable formulation (Battin 1987; Vallado ch. 2;
// Curtis ch. 3) removes the split. One new variable chi and the two
// Stumpff functions C(z), S(z) turn the time-of-flight equation into a
// single form,
//
//   sqrt(mu) dt = (r0.v0)/sqrt(mu) chi^2 C(z)
//               + (1 - alpha r0) chi^3 S(z) + r0 chi,
//
//   z = alpha chi^2,   alpha = 1/a = 2/r0 - v0^2/mu,
//
// valid for every conic: alpha > 0 is an ellipse, alpha = 0 a parabola,
// alpha < 0 a hyperbola — the same code, continuous through e = 1.
// dt grows monotonically with chi, so Newton's method solves for chi
// without drama, and the f and g functions turn chi back into a state
// vector. (For an ellipse chi reduces to sqrt(a) * (change in eccentric
// anomaly) — the familiar theory is inside, just reparameterized.)
```
<!-- /snippet -->

## 4.3 スタンプ関数 — 分岐を吸収する2つの関数

3つの円錐曲線をひとつの式に押し込む鍵が、スタンプ関数 C(z) と S(z) です:

<!-- snippet:stumpff -->
```js
// src/math/kepler.js
// The Stumpff functions make one formula serve all three conics. They
// are the analytic continuation of
//
//   C(z) = (1 - cos(sqrt(z))) / z
//   S(z) = (sqrt(z) - sin(sqrt(z))) / sqrt(z)^3
//
// across z = 0: for z > 0 (ellipse) they are the cos/sin forms above,
// for z < 0 (hyperbola) the identical expressions in cosh/sinh, and at
// z = 0 (parabola) the finite values 1/2 and 1/6. Near zero the closed
// forms subtract nearly equal numbers and lose precision, so a few
// series terms are used instead — the series also makes the continuity
// visible: nothing special happens at z = 0.
export const stumpffC = (z) => {
  if (z > 1e-2) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -1e-2) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  return 1 / 2 - z / 24 + z * z / 720 - z * z * z / 40320;
};

export const stumpffS = (z) => {
  if (z > 1e-2) {
    const s = Math.sqrt(z);
    return (s - Math.sin(s)) / (s * s * s);
  }
  if (z < -1e-2) {
    const s = Math.sqrt(-z);
    return (Math.sinh(s) - s) / (s * s * s);
  }
  return 1 / 6 - z / 120 + z * z / 5040 - z * z * z / 362880;
};
```
<!-- /snippet -->

z > 0 では sin/cos(楕円)、z < 0 では同じ式が sinh/cosh(双曲線)になり、
z = 0(放物線)では有限値 1/2 と 1/6 を取ります。「楕円の三角関数と双曲線の
双曲線関数は、実は同じ関数の別の顔」— この事実が、分岐のない実装を可能に
しています。

## 4.4 ニュートン反復と f・g 関数

時刻方程式は χ について単調増加なので、ニュートン法が安定して解けます
(導関数 dt/dχ = r/√μ は現在の動径そのもので、常に正)。解けた χ から
新しい状態ベクトルへ戻すのが f・g 関数です:

<!-- snippet:f-and-g -->
```js
// src/math/kepler.js
  // The f and g functions turn the solved chi back into a state. Both
  // r0 and v0 lie in the orbit plane, so they span it, and the new
  // position and velocity are LINEAR combinations:
  //
  //   r = f r0 + g v0        v = fdot r0 + gdot v0
  //
  // No angles, no per-conic cases — chi and the Stumpff values carry
  // all the geometry. (f gdot - fdot g = 1 always; a useful check.)
  z = alpha * chi * chi;
  C = stumpffC(z);
  S = stumpffS(z);
  const f = 1 - (chi * chi / r0n) * C;
  const g = dtSeconds - (chi * chi * chi / sqrtMu) * S;
  const r = add(scale(r0, f), scale(v0, g));
  const rn = norm(r);
  const fdot = (sqrtMu / (rn * r0n)) * chi * (z * S - 1);
  const gdot = 1 - (chi * chi / rn) * C;
  return { r, v: add(scale(r0, fdot), scale(v0, gdot)) };
  
```
<!-- /snippet -->

新しい位置も速度も **r₀ と v₀ の線形結合**で書ける — 軌道面は最初の2つの
ベクトルが張る平面から出ないので、これで十分なのです。角度を1つも
経由せずに答えに着くことに注目してください。

## 4.5 軌道要素 — 状態ベクトルの別表現

同じ軌道は「6つの古典軌道要素」でも表せます。彗星の暦や TLE(第6章)は
この形で配布されるので、両方向の変換が必要です(`src/math/kepler.js`):

<!-- snippet:orbital-elements -->
```js
// src/math/kepler.js
// A state vector fixes an orbit completely, and so do six classical
// elements: shape (semi-major axis a, eccentricity e), orbit plane
// (inclination i, right ascension of the ascending node), orientation
// in the plane (argument of perigee), and position along it (true
// anomaly). The conversion rests on three constructed vectors:
//
//   h = r x v          normal to the orbit plane   -> i, node
//   n = z_hat x h      points at the ascending node -> RAAN
//   e = (v x h)/mu - r/|r|   points at perigee, |e| = eccentricity
//
// and every angle is the angle between two of them. Degenerate
// geometries leave some elements undefined — a circular orbit has no
// perigee, an equatorial orbit no node — and the conventions used here
// are: undefined angles are 0, and the "next" angle absorbs the
// reference (true anomaly from the node for circular orbits, argument
// of perigee from the x-axis for equatorial ones).
```
<!-- /snippet -->

円軌道には近点がなく、赤道面軌道には昇交点がない — 退化した幾何で一部の
要素が定義できなくなるのは、要素表現そのものの性質です(状態ベクトルには
この問題がありません)。`stateToElements` は未定義の角度を 0 とし、次の
角度が基準を引き継ぐ規約で連続的に扱います。

## 4.6 使ってみる

```js
import { propagateKepler, stateToElements, elementsToState, GM }
  from 'orb/math/kepler.js';

// ある低軌道の状態ベクトル (km, km/s)
const r0 = [1131.340, -2282.343, 6672.423];
const v0 = [-5.64305, 4.30333, 2.42879];

// 40分後の状態
const { r, v } = propagateKepler(r0, v0, 40 * 60, GM.earth);

// 軌道要素に直す(a: km、角度: ラジアン、period: 秒)
const el = stateToElements({ r: r0, v: v0 }, GM.earth);
// { semiMajorAxis: 7200.47, eccentricity: 0.0081, inclination: 1.7209, ... }

// 1周期後は元の位置に戻る(二体問題の検算)
propagateKepler(r0, v0, el.period, GM.earth); // ≈ r0, v0
```

**確かめ問題**: 地心距離 7000 km で速度をちょうど脱出速度 √(2μ/r) の
0.999999倍と1.000001倍にした2つの軌道を2時間伝播させ、位置の差を測って
ください。e = 1 の両側で結果が滑らかにつながっている(差が 1 km 未満)
ことを確認できます。3分岐実装ではこの実験自体ができません。

---

前章: [第3章 太陽・月・惑星の位置](03-sun-moon-planets.ja.md) /
次章: [第5章 観測](05-observation.ja.md)
