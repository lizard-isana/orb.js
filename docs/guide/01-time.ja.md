# 第1章 時刻系 — なぜ「今」を69秒ずらすのか

天文計算の最初のつまずきは、位置の計算ではなく**時刻**です。この章では、
orb.js が内部で使っている時刻の考え方を、実際のソースコードを引用しながら
説明します。

## 1.1 時計はひとつではない

「2026年7月18日12時0分0秒」と言ったとき、それはどの時計の12時でしょうか。
天文計算では少なくとも3つの時計を区別する必要があります。

- **UTC(協定世界時)** — あなたのコンピュータの時計。原子時計の秒を刻み
  ますが、地球の自転とずれすぎないよう、ときどき「うるう秒」が挿入されます。
- **TT(地球時)** — 一様に流れる理論上の時刻。惑星や月の運動理論
  (VSOP87、ELP)は、この TT を引数に取るように作られています。
- **UT1(世界時)** — 地球の自転そのもの。恒星時(天体の日周運動の角度)は
  UT1 の関数です。地球の自転はわずかに不規則なので、UT1 は一様に流れません。

3つの関係を(誇張して)図にすると:

```
一様な時間 →→→→→→→→→→→→→→→→→→→→→→→  TT(理論の時刻)
                ↑ 32.184s + うるう秒累計(現在 69.184s)
 UTC ─┐_┐_┐___┐_┐──  ← うるう秒で階段状に調整
 UT1 ~~~~~~~~~~~~~~~  ← 自転の揺らぎでゆらゆら(UTC±0.9s 以内)
```

ソースコードの該当箇所(`src/time/scales.js`)には、この関係がそのまま
コメントとして書かれています:

<!-- snippet:timescales -->
```js
// src/time/scales.js
// Why more than one timescale exists:
//
//   TT  (Terrestrial Time)   — uniform, based on atomic clocks (SI second).
//                              Planetary and lunar theories (VSOP87, ELP)
//                              take TT as their time argument.
//   TAI (atomic time)        — TT = TAI + 32.184 s, by definition.
//   UTC (civil time)         — atomic seconds, but kept within 0.9 s of the
//                              Earth-rotation angle UT1 by inserting leap
//                              seconds. What your computer clock shows.
//   UT1 (Earth rotation)     — the actual, slightly irregular rotation of
//                              the Earth. Sidereal time is a function of
//                              UT1 (we approximate UT1 by UTC; the error
//                              is under 0.9 s ~ 0.003 deg of rotation).
//
// So converting UTC -> TT needs the leap-second count:
//
//   TT - UTC = 32.184 s + (TAI - UTC)
//
// which is EXACT for any date since 1972. Since the 2017 leap second the
// value has been frozen at 69.184 s, and the CGPM has resolved to stop
// inserting leap seconds by 2035, so carrying the last table entry
// forward is the best available prediction. Before 1972 UTC in its
// modern form did not exist, and we fall back to the NASA polynomial
// fit of Delta T = TT - UT1.
//
// Skipping this correction shifts every computed position by the motion
// of the body over ~69 s: about 38 arcseconds for the Moon. (v3 shipped
// for years with the correction commented out — hence this long comment.)
```
<!-- /snippet -->

## 1.2 ずらし忘れると何が起きるか

現在 TT−UTC ≈ 69秒。この69秒の間に月は約38″(視直径の約2%)動きます。
つまり UTC のまま月の理論式に代入すると、**月の位置が常に38″ずれます**。
orb.js v3 には長い間この補正が(コメントアウトされたまま)抜けており、
v4 では `Instant` 型が入口で必ず変換する設計にしました。

逆方向の間違いもあります。恒星時(地球の自転角)は UT1 の関数なので、
こちらに TT を入れると方位角が約17″ずれます。「**天体暦には TT、自転には
UT**」— この使い分けが時刻系のすべてです。

## 1.3 ユリウス日と2重 double

天文計算では日付を「ユリウス日(JD)」— 紀元前4713年1月1日からの通日 —
で表します。J2000.0(2000年1月1日12時 TT)= JD 2451545.0 が現代の理論の
基準点です。

ここに JavaScript 特有の罠があります。JD は 246万日のオーダーなので、
64bit 浮動小数の1つの数値で持つと分解能が約20マイクロ秒になります。さらに
`Date.UTC()` は**秒引数の小数部を黙って捨てます**(v3 ではこれが原因で
ISS の位置が1.4 km ずれていました)。orb.js v4 の `Instant` は JD を
「大きい部分+小さい部分」の2つの double に分けて持つことで、この問題を
構造的に回避しています(`src/time/instant.js`):

<!-- snippet:two-part-jd -->
```js
// src/time/instant.js
// Internal representation: a Julian date in TT, split into two doubles
// (jd1 + jd2). A single double holding ~2.46 million days has a machine
// epsilon of about 20 microseconds; splitting the value into a large
// integer-ish part and a small fractional part keeps the resolution far
// below a microsecond. The same trick is used by SOFA/ERFA and
// python-sgp4.
```
<!-- /snippet -->

## 1.4 恒星時 — 地球の自転角

1恒星日は約23時間56分。太陽日(24時間)より約4分短いのは、地球が自転
しながら公転もしているからです。`src/time/sidereal.js` の冒頭コメントが
2種類の恒星時の使い分けをまとめています:

<!-- snippet:sidereal-time -->
```js
// src/time/sidereal.js
// Sidereal time is the rotation angle of the Earth measured against the
// stars rather than the Sun. A solar day (24h) is slightly longer than a
// rotation because the Earth also moves along its orbit; the ratio is the
// 1.0027379... factor buried in the polynomial below.
//
// Sidereal time is a function of UT1 — the timescale that follows the
// actual rotation of the Earth — NOT of TT. Feeding TT into a sidereal
// time formula is a classic mistake that shifts every azimuth by ~17
// arcseconds (the library approximates UT1 by UTC, good to 0.9 s).
//
// Two flavours matter here:
//   GMST (mean)     — smooth angle, IAU 1982 model. Also the rotation
//                     angle that pairs with the TEME frame used by SGP4
//                     (Vallado, "Revisiting Spacetrack Report #3").
//   GAST (apparent) — GMST plus the "equation of the equinoxes", the
//                     nutation of the equinox projected onto the equator.
//                     This is the angle to use for hour angles of
//                     apparent places. Defined in frames/, because it
//                     needs the nutation model.
```
<!-- /snippet -->

## 1.5 使ってみる

```js
import { Instant } from 'orb/time/instant.js';
import { gmst82 } from 'orb/time/sidereal.js';

const t = Instant.fromISO('2026-07-18T12:00:00Z');
t.jd('utc');           // 2461240.0
t.jd('tt');            // 2461240.0008007... (+69.184s/86400)
t.ttMinusUtc();        // 69.184
gmst82(t);             // 地球の自転角(ラジアン)
```

**確かめ問題**: `t.jd('tt') - t.jd('utc')` に 86400 を掛けると何になるか、
予想してから実行してみてください。

---

次章: [第2章 座標系 — 24分角ずれた実話](02-frames.ja.md)
