# 第5章 観測 — 「計算上の位置」と「望遠鏡が向く方向」の間

第3章までで天体の位置は計算できました。しかしその座標に望遠鏡を向けても、
天体は視野の中心にいません。この章では、理論値と観測値の間にある4つの補正
— 光行時間差・光行差・日周視差・大気差 — を、orb.js の観測パイプライン
`observer().observe(body, t)` に沿って読みます。

## 5.1 光行時間差と光行差 — ひとつの仕掛けで両方

光は瞬時に届きません。木星なら約40分前の姿を見ています(光行時間差)。
さらに観測者自身が動いています。地球の公転速度 30 km/s は光速の1万分の1で、
雨の中を走る車の窓に雨滴が斜めに当たるように、星の見かけの方向を最大 20.5″
傾けます(光行差)。

orb.js はこの2つを1つの仕掛けで処理します(`src/observer/apparent.js`):

<!-- snippet:light-time-aberration -->
```js
// src/observer/apparent.js
// Two corrections separate the position a theory computes from the
// direction a telescope must point:
//
// 1. LIGHT TIME: we see a body where it WAS, one light-travel-time ago
//    (Jupiter: ~40 minutes, the Moon: 1.3 seconds).
// 2. ABERRATION: the observer moves (Earth's orbit: ~30 km/s), which
//    tilts incoming light like rain on a car window — up to 20.5".
//
// For heliocentric bodies the two are applied separately and exactly:
//
//   astrometric:  rho = r_target(t - tau) - r_earth(t),  tau = |rho|/c
//                 (iterated: the target is antedated, the observer is not)
//   apparent:     tilt the DIRECTION of rho by v_earth/c, keeping |rho| —
//                 so the reported distance stays the true light-path length
//                 (what JPL Horizons calls "delta").
//
// For bodies expressed directly in the geocentric frame (Moon, Sun as
// minus-Earth, satellites) the frame itself rides with the observer, so
// evaluating the geocentric position function at t - tau captures both
// effects at once: the Sun lands 20.5" behind its geometric place, the
// Moon only 0.7" — the textbook values — with no per-body special
// cases. (Antedating BOTH bodies is a well-known shortcut that also
// gives the apparent direction of a planet to first order, but the
// vector's LENGTH then differs from the light-path distance by
// ~v_earth*tau — tens of thousands of km — so it is not used here.)
//
// Diurnal aberration (observer's rotation speed, up to 0.3") is below
// this library's accuracy class and is ignored.
```
<!-- /snippet -->

このコメントの主張はテストで数値として確認されています: 太陽はちょうど
20.5″、月は 0.7″ — どちらも教科書どおりの値が、天体ごとの特別扱いなしに
出てきます。

`{ lightTime: false }` オプションで補正を切れるので、自分で差を測って
みてください:

```js
import { apparentGeocentric } from 'orb/observer/apparent.js';
const a = apparentGeocentric(sun, t);                       // 視位置
const g = apparentGeocentric(sun, t, { lightTime: false }); // 幾何学的位置
// a と g のなす角 ≈ 20.5" になるはず
```

## 5.2 日周視差 — 引き算だけで正確に

暦の理論は「地球の中心から見た」位置を返します。実際の観測者は中心から
最大 6378 km ずれた地表にいます。月は近いので、このずれが最大約1°の視差に
なります(`src/observer/observer.js`):

<!-- snippet:topocentric -->
```js
// src/observer/observer.js
// Ephemeris theories deliver GEOCENTRIC positions — as seen from the
// Earth's center. A real observer stands up to 6378 km away from that
// point, and for nearby bodies the difference (diurnal parallax) is not
// small: up to ~1 degree for the Moon, the reason moonrise times computed
// geocentrically come out 4-5 minutes wrong. There is no need for a
// parallax "formula": place both the target and the observer in the same
// Earth-fixed frame and subtract — the parallax is simply in the
// geometry. The same subtraction gives the true range for free.
```
<!-- /snippet -->

視差を「角度に足す補正式」として後付けする実装は、入力経路によって
適用されたりされなかったりする余地(適用漏れ・二重適用)を残します。
**引き算そのもの**として書けば、適用漏れという概念が存在しません。
テストは「地心仰角 − 測心仰角 = 視差 × cos(仰角)」という恒等式で
幾何学の正しさを確認しています。

## 5.3 大気差 — いちばん不確かな補正

大気は光を下向きに曲げ、天体を持ち上げて見せます。地平線でその量は約0.5°
— 太陽の直径より大きく、**「昇った」と見えている太陽は幾何学的にはまだ
地平線の下**です(`src/observer/refraction.js`):

<!-- snippet:refraction -->
```js
// src/observer/refraction.js
// The atmosphere bends light downward, lifting every object above its
// geometric place: ~0.1 degrees at 45 deg elevation, ~0.57 degrees at
// the horizon (more than the Sun's diameter — the "risen" Sun you watch
// is geometrically still below the horizon).
//
// This is the Saemundsson formula (the inverse companion of Bennett's),
// which takes the TRUE elevation and returns the angle to ADD to it.
// Refraction depends on the actual air: the standard value assumes
// 1010 hPa and 10 degC, and scales linearly with pressure and inversely
// with absolute temperature. It is also the least certain correction in
// this library — near the horizon real refraction varies by several
// arcminutes with weather, which is why the pipeline only applies it
// when the caller explicitly asks.
```
<!-- /snippet -->

大気差は天気で数分角も変わる、このライブラリで最も不確かな補正です。
だからパイプラインは黙って適用せず、`{ refraction: { pressure, temperature } }`
と明示されたときだけ足します(結果の `refraction` フィールドで量も返します)。

## 5.4 まとめて使う

```js
import { Instant } from 'orb/time/instant.js';
import { observer } from 'orb/observer/observer.js';
import { moon } from 'orb/bodies/moon.js';

const tokyo = observer({ latitude: 35.658, longitude: 139.741, height: 25 }); // 度, 度, m
const t = Instant.fromISO('2026-07-18T12:00:00Z');

tokyo.observe(moon, t);
// { azimuth, elevation, ra, dec (度), range, distance (km), refraction }
// 既定: 光行時間差+光行差+視差を適用、大気差はオフ

tokyo.observe(moon, t, { refraction: { pressure: 1013, temperature: 25 } });
// 大気差込みの仰角が欲しいときだけ明示する
```

**確かめ問題**: `range`(測心距離)と `distance`(地心距離)の差は何 km まで
ありえるでしょうか。観測者が月直下にいる場合と、月が地平線にある場合で
考えてから、時刻を変えて確かめてください。

---

前章: [第3章 太陽・月・惑星の位置](03-sun-moon-planets.ja.md)
