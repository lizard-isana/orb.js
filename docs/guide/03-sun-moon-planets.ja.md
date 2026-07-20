# 第3章 太陽・月・惑星の位置 — 級数展開の考え方

惑星の位置を求めるのに、orb.js は微分方程式を解いていません。代わりに
「**あらかじめ解かれた答えの表**」を足し合わせています。この章では、その
「級数」という考え方と、太陽・月・惑星それぞれの実装を読みます。

## 3.1 まず50行で太陽を計算してみる

いきなり数千項の表を読む前に、同じ構造を最小サイズで体験しましょう。
[`examples/sun-in-50-lines.mjs`](../../examples/sun-in-50-lines.mjs) は
ライブラリなしで太陽の視赤経・赤緯を約0.01°で計算します:

```
$ node examples/sun-in-50-lines.mjs
太陽の位置 2026-07-19T08:45:11.485Z
  赤経: 7.9168 時
  赤緯: 20.8107 度
```

50行の中身は「時刻を直す → 平均運動 → 周期項を足す → 座標を回す」の
4手順で、これは本体の数千項版とまったく同じ骨格です。周期項が3つなら
0.01°、数千あれば0.1″になる — 精度は項数で買う、というのが級数の世界です。

## 3.2 VSOP87 — 惑星の級数

惑星理論 VSOP87A は、各座標を次の形の和で表します
(`src/bodies/vsop.js`):

<!-- snippet:vsop -->
```js
// src/bodies/vsop.js
// The VSOP87 theory (Bretagnon & Francou 1988) writes each rectangular
// coordinate of a planet as a sum of a few thousand periodic terms:
//
//     x(t) = sum over powers p of  t^p * sum_i  A_i cos(B_i + C_i t)
//
// with t in thousands of Julian years (TT) from J2000. Every A cos(B+Ct)
// is one periodic wobble of the orbit; the t^p factors let slow secular
// drifts ride on top. This is the same "table of amplitudes and angles"
// pattern as the nutation series in frames/nutation.js — just bigger.
//
// Differentiating term by term also gives the velocity analytically:
//
//     dx/dt = p t^(p-1) A cos(B + C t)  -  t^p A C sin(B + C t)
//
// which the observer pipeline later needs for aberration. VSOP87A
// coordinates are heliocentric, ecliptic and equinox of J2000.
```
<!-- /snippet -->

orb.js の係数データは手で書き写したものではなく、`tools/vsop-compile.js`
が **CDS(VI/81)の公式配布ファイルそのもの**(`tools/data/vsop87/` に同梱)
から機械生成します。生成時に「地球から見た角度誤差 0.1″ 以内」の条件で
小さい項を間引き、その打ち切りが公称精度を守っていることをコンパイラ自身が
全期間サンプルで自己検証してから書き出します(フル版は `--full` で生成)。月齢カレンダーに海王星の1500項は要らない — ブラウザ第一という
このライブラリの方針が、データの形にも現れています。

数値微分ではなく**項ごとの解析微分**で速度も出せることに注目してください。
速度は第5章の光行差補正で必要になります。

## 3.3 地球 — いちばん良いデータを使う天体

地球だけは特別扱いです。すべての天体の地心位置は「− 地球」を含むので、
地球の誤差は全天に伝染します。実際に v4 の開発中、JPL Horizons との照合で
「v3 から継承した VSOP 係数ファイルが実は無言の打ち切り版で、地球に約
8000 km(11″)の誤差があった」ことが発覚しました(`src/bodies/earth.js`):

<!-- snippet:earth-epv00 -->
```js
// src/bodies/earth.js
// The Earth deserves better data than the other planets: every
// geocentric position of every body contains "minus the Earth", so an
// Earth error contaminates the whole sky — and for the Sun (computed as
// exactly minus the Earth) it shows up 1:1. This lesson was learned the
// hard way: v4 originally reused the VSOP87A coefficient file inherited
// from v3, and comparison against JPL Horizons revealed that file to be
// a silent ~1500-term-per-planet truncation with an ~8000 km
// (~11 arcsec) Earth error that had been masquerading as "theory
// difference" for years.
//
// This module therefore uses the Earth ephemeris of ERFA's epv00
// (SOFA-derived, BSD): a Simon et al. harmonic series fitted to JPL
// DE405, good to milliarcseconds over 1900-2100 — three orders of
// magnitude better than the truncated file, at ~1300 terms. The series
// shape is the familiar one (amplitude, phase, frequency triples), with
// an empirical rotation matrix aligning the model to the DE405/ICRS
// equatorial frame, which is why this body natively reports the frame
// 'equatorial-j2000' rather than the ecliptic.
```
<!-- /snippet -->

外部の独立したリファレンスと突き合わせて初めて見つかる誤差がある —
これが第3.5節の検証方針が「複数の独立実装との照合」を要求する理由です。

## 3.4 太陽 — 理論を持たない天体

太陽の理論はありません。地球の位置の符号を反転するだけです
(`src/bodies/sun.js`):

<!-- snippet:sun-from-earth -->
```js
// src/bodies/sun.js
// There is no separate "theory of the Sun": seen from the Earth, the Sun
// sits exactly opposite the Earth's heliocentric position, so
//
//     r_sun(geocentric) = - r_earth(heliocentric)
//
// and the same for velocity. v3 carried an independent low-precision
// solar theory alongside VSOP, and the two disagreed by ~17 arcseconds;
// deriving the Sun from the one Earth series removes that second source
// of truth entirely.
```
<!-- /snippet -->

v3 には独立の簡易太陽理論があり、VSOP 系の座標と約17″食い違っていました。
「真実の源をひとつにする」はソフトウェア設計の原則ですが、天文計算でも
そのまま通用します。

## 3.5 月 — いちばん難しい天体

月は太陽の摂動が強く、ケプラー楕円では歯が立ちません。orb.js は Meeus の
60項×2系列の級数を使います(`src/bodies/moon.js`):

<!-- snippet:moon -->
```js
// src/bodies/moon.js
// The Moon is the hardest body in the sky to compute: the Sun perturbs
// its orbit so strongly that a useful series needs dozens of terms where
// a planet's Kepler ellipse would need one. This implementation is the
// truncated ELP-based series of Meeus, Astronomical Algorithms ch. 47:
// 60 terms each for longitude/distance and latitude, good to a few
// arcseconds against the full theory.
//
// The recipe, shared with every classical series in this library:
//   1. evaluate a handful of fundamental angles (mean longitude L',
//      elongation D, solar anomaly M, lunar anomaly M', latitude
//      argument F) as polynomials in time,
//   2. sum  amplitude * sin/cos(integer combination of those angles),
//   3. terms involving the solar anomaly M shrink slowly with time as
//      the Earth's orbit circularizes — the E, E^2 factors below.
//
// The series yields APPARENT ecliptic longitude of date once the
// nutation in longitude is added, which is exactly the library's
// 'ecliptic-of-date' frame (true equinox); latitude and distance need
// no such correction.
```
<!-- /snippet -->

第2章の章動(77項)と見比べてください。基本角の数も表の形もそっくりです。
**「基本角 → 整数結合 → 振幅×sin/cos の和」というパターンさえ読めれば、
この分野の実装はぜんぶ同じ形**をしています。

## 3.6 検証という設計

`test/v4/bodies.mjs` の検証は3層構造です:

1. **コンパイラ検査** — フル版データは v3 と同じ係数なので、位置は
   10⁻¹¹ au で一致しなければならない(一致しなければ生成ツールのバグ)
2. **打ち切り検査** — 縮約版とフル版の差が公称 0.1″ 以内に収まっている
3. **独立実装との照合** — Meeus 実例 47.a(月)、v3 の独立太陽理論との
   突き合わせ。差が出る場合は「どのモデル差によるものか」を数字で説明
   できること(例: 月の視黄経の 2.07″ 差 = 章動モデル 2000B と4項近似の差)

「答えが合う」だけでなく「**差が説明できる**」ことを合格条件にするのが、
このライブラリの検証方針です。

## 3.7 使ってみる

```js
import { Instant } from 'orb/time/instant.js';
import { transform } from 'orb/frames/frames.js';
import { mars } from 'orb/bodies/mars.js';
import { sun } from 'orb/bodies/sun.js';
import { moon } from 'orb/bodies/moon.js';
import { hms, dms } from 'orb/math/angles.js';

const t = Instant.fromISO('2026-07-18T00:00:00Z');

mars.state(t);   // 太陽中心・J2000黄道・km と km/s
sun.state(t);    // 地心・J2000黄道(地球の符号反転)
moon.state(t);   // 地心・当日分点の黄道・km

// 太陽の視赤経・赤緯(第2章のグラフで回すだけ)
const eq = transform(sun.state(t), { frame: 'equatorial-of-date' });
const ra = Math.atan2(eq.r[1], eq.r[0]);
const dec = Math.asin(eq.r[2] / Math.hypot(...eq.r));
console.log(hms(ra), dms(dec));
```

**確かめ問題**: `moon.latlng(t).distance` を1時間おきに24時間分計算して
プロットすると、距離はどのくらい変化するでしょうか。月の軌道の離心率
(約0.055)から予想して確かめてください。

---

前章: [第2章 座標系](02-frames.ja.md)
