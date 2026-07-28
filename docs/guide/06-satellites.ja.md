# 第6章 人工衛星 — TLE と SGP4、そしてパス予測

「今夜 ISS はいつ、どの方角に見えるか」。この章では TLE の解読から
上空通過(パス)の予測まで、ライブラリの全層を1本につないで読みます。
完成形は [`examples/iss-passes.mjs`](../../examples/iss-passes.mjs) —
実行すると通過予報の表が出ます。

## 6.1 TLE — 69桁×2行に詰まった軌道

人工衛星の軌道は TLE(Two-Line Elements)という2行の固定長フォーマットで
配布されます。1960年代のパンチカードの遺産で、**列の位置がすべて**です
(`src/sgp4/tle.js`):

<!-- snippet:tle -->
```js
// src/sgp4/tle.js
// A TLE packs a satellite's mean orbital elements into two 69-character
// lines with FIXED column positions — values may not even carry their
// decimal points ("0004871" means eccentricity 0.0004871, " 10270-3"
// means 0.10270e-3). Two classic pitfalls live here:
//
//  1. The epoch is a two-digit year plus a fractional day-of-year with
//     ~millisecond precision; rounding it to whole seconds moves a LEO
//     satellite by kilometers along-track.
//  2. These are MEAN elements fitted to the SGP4 model with WGS-72
//     constants. They only make sense fed to SGP4 — treating them as
//     osculating Kepler elements gives errors of tens of kilometers.
```
<!-- /snippet -->

実物を見てみましょう(2020年1月の ISS):

```
1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015
2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038
```

2行目の `0004871` が離心率 0.0004871(小数点は書かれない)、
`15.49556564` が1日あたりの周回数 — 割り算すれば周期約92.9分が出ます。
1行目の `20014.52632156` がエポック(2020年14.526日目)で、小数第8位は
**約1ミリ秒**に相当します。ISS は毎秒 7.7 km 進むので、この精度を
落とさず読むことが位置精度に直結します。

## 6.2 なぜケプラーでは足りないか

第4章の二体伝播に TLE の要素を入れても、正しい位置は出ません。理由は2つ:

1. **地球は球ではない**。赤道の膨らみ(J2 項)が軌道面を回転させます。
   ISS では昇交点が**1日に約5°**も西へ動く — 二体問題には存在しない運動です。
   さらに大気抵抗が軌道を縮め続けます。
2. **TLE の要素は「平均要素」**。SGP4 という特定の摂動理論でフィットされた
   値で、瞬間のケプラー要素とは別物です。SGP4 に入れて初めて意味を持ちます。

SGP4 は J2〜J4 の永年項・周期項、大気抵抗、(周期225分以上の軌道では)
月と太陽の摂動・共鳴項まで含む解析理論です。orb.js の実装は Vallado の
リファレンス実装の移植で、`src/sgp4/propagation.js` にあります。精度は
エポック近傍で 1 km 程度、1日あたり 1〜3 km ずつ劣化します —
TLE が「数日で鮮度が落ちる生もの」と呼ばれる理由です。

## 6.3 TEME — SGP4 専用の座標系

SGP4 の出力は TEME という座標系に出てきます。歴史的経緯で定義された、
他のどの標準系とも微妙に一致しない系です(`src/sgp4/satellite.js`):

<!-- snippet:satellite -->
```js
// src/sgp4/satellite.js
// SGP4 outputs positions in TEME ("true equator, mean equinox") — a
// frame that exists for historical reasons and matches nothing else in
// astronomy exactly. The state vector returned here is TAGGED with that
// frame, and the graph in frames/frames.js pairs TEME with its defined
// rotation angle, mean sidereal time (GMST 1982; Vallado, "Revisiting
// Spacetrack Report #3"). Typing the frame keeps that easily-mistaken
// convention in exactly one place, next to the rotation that uses it.
```
<!-- /snippet -->

TEME と対になる自転角は**平均恒星時 GMST(1982年版)**である、というのが
規約の肝です(Vallado, "Revisiting Spacetrack Report #3")。ここを
真恒星時 GAST や新しい地球回転角と組み合わせると、赤道上で最大数百 m
ずれます。orb.js では状態ベクトルが `frame: 'teme'` と名乗り、第2章の
変換グラフの TEME エッジだけがこの規約を知っています — 取り違えようが
ない構造です。

## 6.4 イベント探索 — すべての「いつ?」はひとつの求根問題

出没も、月相も、衛星パスも、数学的には同じ問題です
(`src/events/search.js`):

<!-- snippet:event-search -->
```js
// src/events/search.js
// Every "event" in this library — rise, set, culmination, moon phase,
// satellite pass — is the same mathematical problem: find where some
// smooth function of time crosses zero (elevation minus horizon,
// elongation minus 90 degrees, ...). So there is one searcher:
//
//   1. sample the function on a coarse grid and look for sign changes,
//   2. shrink each bracket by bisection until the time is pinned to
//      well under a second.
//
// Bisection is deliberately chosen over faster methods: it cannot
// diverge, needs no derivative, and 25 halvings of a 10-minute bracket
// already reach ~1 ms. The step size is the only knob that matters —
// it must be shorter than half the shortest feature you want to catch
// (a satellite pass can be 4 minutes wide; a moonrise is hours from
// the next event).
```
<!-- /snippet -->

「仰角 − 閾値」がゼロを横切る時刻を探せばパスになり、「離角 − 90°」なら
上弦になる。探索対象の関数を差し替えるだけで、イベントの種類が増えても
求根器は1つのままです。

## 6.5 パス予測 — 全層の総合演習

パス予測は、この章までの全部品の合成です(`src/events/passes.js`):

<!-- snippet:passes -->
```js
// src/events/passes.js
// A "pass" is the few minutes a satellite spends above an observer's
// horizon. Structurally it is rise/set again — elevation crossing a
// minimum angle — but the timescale is two orders of magnitude shorter:
// a whole ISS pass lasts ~10 minutes, so the search grid must be tens
// of seconds where the Moon's could be tens of minutes. The culmination
// (maximum elevation) decides whether a pass is worth watching:
// 10 degrees grazes the rooftops, 80 degrees crosses overhead.
//
// Whether the satellite is actually VISIBLE (sunlit spacecraft, dark
// observer) is a separate question involving the Earth's shadow, left
// for a later milestone.
```
<!-- /snippet -->

1回の `site.observe(sat, t)` の中で何が起きているか、層を数えてみると:

1. TLE エポックからの経過分で **SGP4** が TEME 位置を出し(第6章)
2. **変換グラフ**が TEME → ECEF を GMST82 で回し(第2章)
3. **観測パイプライン**が観測地を引き算して方位・仰角にする(第5章)
4. その仰角関数のゼロ交差を**求根器**が探す(この章)

デモ `examples/iss-passes.mjs` の出力はこうなります:

```
ISS (ZARYA) のパス予測(東京、仰角10°以上)
軌道周期 92.9 分 / 高度 415-422 km

2020-01-14  12:50:52 西北西から出現 → 12:53:21 最大仰角 19° (北北西) → 12:55:50 北北東へ (5.0分)
2020-01-15  18:33:09 北西から出現 → 18:36:30 最大仰角 87° (南西) → 18:39:49 南東へ (6.7分)
...
```

最大仰角 87° のパスはほぼ天頂通過 — 見応えのある通過です。実際の予報には
CelesTrak などから**最新の TLE** を取得して差し替えてください(衛星が
実際に「見える」ためには観測者が薄明・夜で衛星が日照中という条件も必要です。
地球の影の計算は今後の課題として残しています)。

## 6.6 使ってみる

```js
import { Instant } from 'orb/time/instant.js';
import { observer } from 'orb/observer/observer.js';
import { satellite } from 'orb/sgp4/satellite.js';
import { passes } from 'orb/events/passes.js';

const iss = satellite({ name: 'ISS', line1: '...', line2: '...' });
const site = observer({ latitude: 35.658, longitude: 139.741, height: 25 });

iss.orbitalPeriod;                 // 分
iss.state(Instant.fromISO('...')); // TEME の状態ベクトル
site.observe(iss, t);              // 方位・仰角・距離

passes(site, iss, from, to, { minElevation: 10 });
// [{ rise: { t, azimuth }, culmination: { t, elevation, azimuth }, set }]
```

**確かめ問題**: TLE エポック直後の ISS の状態ベクトルを `iss.state()` で
取り出し、第4章の `propagateKepler` で24時間先まで二体伝播した結果と
SGP4 の結果を比べてください。差は 1000 km 前後になるはずです。その主因が
6.2節のどの効果か、昇交点経度の差から推理できます。

---

前章: [第5章 観測](05-observation.ja.md)
