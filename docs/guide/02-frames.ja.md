# 第2章 座標系 — 「いつの春分点か」で24分角変わる

この章の主役は「座標系の取り違え」です。天文計算ソフトウェアで最も多い
誤りのひとつが、**J2000 分点の座標と当日分点の座標を変換せずに混ぜる**
ことです。両者の差は2026年時点で約24′(0.4°)— 満月の直径に近く、
「だいたい合っているが何かおかしい」という厄介な症状になります。原因を
理解すると、天文計算の座標系がなぜこれほど細かく区別されるのかが見えて
きます。

## 2.1 座標系を決める3つの要素

天体の直交座標 (x, y, z) には、必ず次の3つが付いて回ります。

1. **基準面** — 赤道面か、黄道面(地球の公転面)か
2. **原点方向(分点)** — x軸をどの方向に取るか。春分点が使われるが、
   春分点自体が動く(歳差)ので「**いつの**春分点か」を言う必要がある
3. **中心** — 太陽中心か、地心か、観測者中心か

「J2000.0 の黄道・分点」「当日の真分点の赤道」のような長い名前は、この
3要素の組み合わせを指定しています。VSOP87(惑星理論)は J2000 分点で、
太陽・月の古典理論は当日分点で結果を出す — **理論によって出てくる座標系が
違う**のです。

## 2.2 歳差 — 座標系が滑っていく

地球の自転軸は約25,800年周期で首振り運動(歳差)をしており、春分点は
年に約50″ずつ移動します。冒頭の24′は、まさにこの「溜まった歳差」です。
惑星理論(J2000 出力)の座標を当日分点へ変換し忘れると、太陽・月
(当日分点出力)とちょうどこの分だけ食い違った空ができあがります。

歳差の実装は `src/frames/precession.js` にあります。冒頭コメントに
要点がまとまっています:

<!-- snippet:precession -->
```js
// src/frames/precession.js
// The Earth's rotation axis traces a cone against the stars once every
// ~25,800 years, so the coordinate frame "equator and equinox of date"
// slides against the fixed frame "equator and equinox of J2000.0" by
// about 50 arcseconds per year. Any position quoted "of date" (as the
// Sun and Moon theories produce) and any position quoted "J2000" (as
// VSOP87 produces) therefore differ by the accumulated precession —
// about 0.4 degrees in 2026 and growing. Mixing the two frames without
// converting is one of the most common errors in astronomical software;
// here the frame is part of the state-vector type and this file
// supplies the conversion.
//
// The IAU 2006 parameterization used here (Fukushima-Williams angles
// gamma_bar, phi_bar, psi_bar plus the mean obliquity) composes four
// axis rotations into one matrix:
//
//     P = R1(-eps_A) R3(-psi_bar) R1(phi_bar) R3(gamma_bar)
//
// which takes GCRS/J2000 equatorial coordinates to the mean equator and
// equinox of date. (The tiny 23-mas frame bias between GCRS and J2000 is
// far below this library's accuracy class and is deliberately ignored.)
//
// Angle polynomials from Hilton et al. (2006) / IERS Conventions, as
// distributed in the ERFA (SOFA-derived, BSD) library, pfw06.c.
```
<!-- /snippet -->

## 2.3 章動 — 首振りの上の小さな揺れ

歳差の上に、月の軌道面の運動(18.6年周期)による小さな揺れ「章動」が
乗ります。主要項は黄経方向に±17″。「平均分点」(歳差のみ)と「真分点」
(歳差+章動)の区別はここから来ます。orb.js は IAU 2000B モデル
(77項の級数)を使います(`src/frames/nutation.js`):

<!-- snippet:nutation -->
```js
// src/frames/nutation.js
// Precession is the slow (26,000-year) conical motion of the Earth's
// rotation axis; nutation is the small wobble superimposed on it, caused
// mainly by the Moon's orbit plane regressing with an 18.6-year period.
// The main term is only ~17 arcseconds in longitude, but any computation
// of an "apparent" place needs it.
//
// The IAU 2000B model expresses the wobble as a sum of 77 sine/cosine
// terms whose arguments are integer combinations of five "Delaunay
// arguments" — the fundamental angles of the Sun-Earth-Moon system
// (mean anomalies of Moon and Sun, the Moon's argument of latitude, its
// elongation from the Sun, and the node of its orbit). This structure —
// "a handful of fundamental angles, a table of integer multipliers and
// amplitudes" — is the same pattern used by the lunar and planetary
// theories, so this file is a good first example of reading such series.
//
// Model reference: McCarthy & Luzum (2003); coefficient table generated
// from the ERFA (SOFA-derived, BSD) source. Accuracy ~1 mas 1995-2050 —
// three orders of magnitude below this library's arcsecond ambitions.
```
<!-- /snippet -->

級数の作りは「少数の基本角+整数係数と振幅の表」で、これは後の章で扱う
月や惑星の理論とまったく同じパターンです。ここで読み方に慣れておくと、
月理論(数十項)も VSOP87(数千項)も同じ目で読めるようになります。

## 2.4 型付き状態ベクトルと変換グラフ

座標の取り違えが起きる根本原因は、(x, y, z) という**裸の数値**に「どの
座標系か・原点はどこか」という情報が付いていないことです。メタデータを
数値と別に(引数や慣習として)持ち運ぶと、途中の関数がそれを落としたり
勝手に仮定したりできてしまいます。orb.js ではすべての位置が座標系・中心の
情報と一体の「状態ベクトル」として流れます(`src/frames/frames.js`):

<!-- snippet:state-vector -->
```js
// src/frames/frames.js
// Every position travels as one structured value:
//
//   {
//     t:      Instant,           // when
//     frame:  'ecliptic-j2000',  // orientation of the axes
//     center: 'sun',             // origin of the axes
//     r:      Float64Array[3],   // km, always
//     v:      Float64Array[3]|null // km/s, always
//   }
//
// The frame and center ride WITH the numbers, and every conversion
// goes through the single transform() below. Detached metadata gets
// dropped and guessed-at; attached metadata makes an undefined
// conversion an exception instead of a silently wrong number.
```
<!-- /snippet -->

そして座標系の変換は、変換の定義を1箇所に集めた「グラフ」を通ります:

<!-- snippet:frame-graph -->
```js
// src/frames/frames.js
// The transformation graph. Each edge knows how to produce its rotation
// matrix at a given Instant, plus whether crossing it enters/leaves the
// rotating Earth-fixed frame (which adds the omega x r term for
// velocities). transform() finds a path between any two frames by
// breadth-first search and composes the matrices, so every route
// between two frames gives the same answer by construction.
```
<!-- /snippet -->

グラフ構造の利点は「**どの経路を通っても同じ答えになる**」ことが構造的に
保証される点です。変換を入力の形ごとに別々のコードパスで書くと、パスごとに
別のバグが宿り、同じ質問に経路によって違う答えが返るようになります。
経路独立性は「A→B→C と A→C が一致する」という恒等式としてテストできる
ので、回転行列の符号ミスのような誤りを機械的に検出できます。

## 2.5 地球に降りる — 測地座標と地平座標

最後の2ステップは地球固定系です。慣性系から地球固定系(ECEF)へは自転角
(恒星時)で回転します。地表の観測者は WGS-84 楕円体上の測地座標で表され
(`src/frames/geodetic.js`):

<!-- snippet:geodetic -->
```js
// src/frames/geodetic.js
// The Earth is not a sphere but (to a very good approximation) an
// ellipsoid flattened by rotation: the WGS-84 reference ellipsoid, the
// datum GPS coordinates are expressed in. Two subtleties follow:
//
// 1. Geodetic latitude — the angle your GPS reports — is measured
//    against the local vertical of the ellipsoid, not against the line
//    to the geocenter. The difference (up to ~11 arcminutes at mid
//    latitudes) is why the formulas below carry the eccentricity terms.
//
// 2. Converting Earth-fixed XYZ back to latitude/height has no closed
//    form; the standard approach iterates the latitude equation, which
//    converges in a few rounds.
//
// Note the propagation constants of SGP4 stay on WGS-72 (TLEs are
// fitted with them); WGS-84 here describes the Earth's SURFACE.
```
<!-- /snippet -->

観測者から見た方位・仰角は、地平面に張り付いた ENU(東・北・天頂)座標系で
求めます:

<!-- snippet:enu -->
```js
// src/frames/geodetic.js
// The local horizontal frame ENU (East, North, Up) at an observer:
// rotate the Earth-fixed axes so that z points along the local vertical
// and y toward north. Azimuth measured from north through east and
// elevation above the horizon then fall out of simple trigonometry on
// the ENU components.
```
<!-- /snippet -->

## 2.6 使ってみる

```js
import { Instant } from 'orb/time/instant.js';
import { makeState, transform } from 'orb/frames/frames.js';

const t = Instant.fromISO('2026-07-18T12:00:00Z');

// J2000 黄道座標のベクトルを、当日の真分点の赤道座標へ
const s = makeState({ t, frame: 'ecliptic-j2000', center: 'earth', r: [1, 0, 0] });
const eq = transform(s, { frame: 'equatorial-of-date' });

// 存在しない変換は黙って間違えずに例外を投げる
transform(s, { frame: 'no-such-frame' }); // -> RangeError
```

**確かめ問題**: 上の `eq.r` と、`frame: 'equatorial-j2000'` に変換した結果
の差を角度に直すと約何分角になるか。歳差の蓄積(50″/年 × 26.5年)から予想
して、実行して確かめてください。

---

前章: [第1章 時刻系](01-time.ja.md) /
次章: [第3章 太陽・月・惑星の位置](03-sun-moon-planets.ja.md)
