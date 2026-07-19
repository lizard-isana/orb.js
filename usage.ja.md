# orb.js v3 — 使い方

天文計算のための JavaScript ライブラリです。太陽・月・惑星の位置、ケプラー軌道、
人工衛星(SGP4)、観測地点から見た地平座標(方位・仰角)への変換を、実行時依存
ライブラリなしで計算します。

## インストール / 読み込み

```
npm install lizard-isana/orb.js
```

```js
// CommonJS / バンドラ(UMD ビルド)
const Orb = require('orb.js');

// ブラウザ
<script src="dist/orb.js"></script>  // window.Orb が定義されます

// ES モジュール(ソース)
import * as Orb from './src/orb.es6.js';
```

各メソッドは JavaScript の `Date` オブジェクトを受け取ります。**`Date` は UTC の
時刻として解釈されます**(絶対時刻が使われるため、実行環境のタイムゾーンは結果に
影響しません)。天体暦理論に必要な地球時(TT)への変換は内部で自動的に行われます
(後述「時刻系と精度」参照)。

## クイックスタート

```js
const date = new Date(); // 現在時刻

// 太陽・月
const sun  = new Orb.Sun().radec(date);   // { ra(時), dec(度), distance(au) }
const moon = new Orb.Luna().radec(date);  // { ra(時), dec(度), distance(km) }

// 惑星(VSOP87A): Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune
const mars = new Orb.Mars();
mars.radec(date);  // 視赤経・視赤緯(当日分点)
mars.xyz(date);    // 太陽中心・黄道直交座標(J2000 分点)、au

// ケプラー軌道(彗星・小惑星)
const comet = new Orb.Kepler({
  eccentricity: 0.85,
  periapsis_distance: 0.9,         // au(または semi_major_axis)
  inclination: 30,                 // 度
  argument_of_periapsis: 120,      // 度
  longitude_of_ascending_node: 45, // 度
  time_of_periapsis: 2460700.5     // TT ユリウス日(または mean_anomaly + epoch)
});
comet.radec(date);
comet.xyz(date);   // { x,y,z (au), xdot,ydot,zdot (au/日) }

// TLE から人工衛星
const iss = new Orb.SGP4({
  first_line:  '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});
iss.xyz(date);     // TEME 直交座標、km・km/s
iss.latlng(date);  // { latitude, longitude (度), altitude (km), velocity (km/s) }

// 観測地点から見た方位・仰角
const observation = new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0 }, // 度, 度, km
  target: 天体インスタンスまたは座標オブジェクト
});
observation.azel(date);
// { azimuth(度, 北=0 東=90), elevation(度), distance(km), atmospheric_refraction(度) }
```

## クラス

### `Orb.Time(date)`

| メソッド | 返り値 |
|---|---|
| `jd()` | ユリウス日(UTC 基準) |
| `jd_tt()` | 地球時のユリウス日(`jd() + tt_minus_utc()/86400`) |
| `tt_minus_utc()` | TT−UTC(秒)。1972年以降はうるう秒テーブルで厳密(2017年以降は 69.184 秒)、それ以前は NASA の ΔT 多項式 |
| `delta_t()` | NASA 多項式による ΔT(TT−UT1)の推定値(秒) |
| `gast()` | グリニッジ視恒星時(時) |
| `gmst()` | `gast()` の非推奨エイリアス — この関数は従来から*視*恒星時を返していました |
| `doy()` | 年初からの通日(小数含む、UTC)、数値 |

### `Orb.Sun`, `Orb.Luna`(別名 `Orb.Moon`)

- `radec(date)` — 地心の視赤経・視赤緯(当日分点)。赤経は時、赤緯は度。
  距離は太陽が **au**、月が **km**。
- `Luna.latlng(date)` — 当日分点の視黄経・黄緯(度)と距離(km)。
- `Luna.xyz(date)` — 地心・当日分点の黄道直交座標(km)。
- `Luna.parallax(date)` — 赤道地平視差(度)。
- `Luna.phase(date)` — 直近の計算上の新月からの経過日数。

### 惑星: `Orb.Mercury` 〜 `Orb.Neptune`, `Orb.Earth`(VSOP87A)

- `xyz(date)` — 太陽中心・黄道直交座標、**J2000 分点**、au
  (`coordinate_keywords: "ecliptic rectangular j2000"`)。
- `radec(date)` — 地心の視赤経・視赤緯、**当日分点**(変換パイプラインで歳差・
  章動が適用されます)。

### `Orb.Kepler(elements)`

軌道要素: `eccentricity`(e ≥ 0、ちょうど 1 も可)、`semi_major_axis` または
`periapsis_distance`(au)、各角度は **J2000 黄道**基準の度、時刻は
`time_of_periapsis` または `mean_anomaly` + `epoch`(TT ユリウス日)。
`gm` は省略時に太陽の GM(au³/日²)。`xyz(date)` は位置(au)と速度(au/日)、
`radec(date)` は当日分点の視位置を返します。状態ベクトルから軌道要素への逆変換は
`Orb.CartesianToKeplerian`。

### `Orb.SGP4(tle_or_omm)`(別名 `Orb.Satellite`)

`{first_line, second_line[, name]}` の TLE 文字列、または CCSDS OMM オブジェクト
を受け付けます。`xyz(date)` は TEME 直交座標(km, km/s)、`latlng(date)` は
直下点(WGS-72)。プロパティ: `orbital_period`(分)、`apogee` / `perigee`(km)、
`orbital_elements`、`omm`。

### `Orb.Observation({observer, target})`

`observer`: `latitude`/`longitude` は度、`altitude` は **km**。
`target` に指定できるもの:

1. `radec()`/`xyz()` を持つインスタンス(Sun, Luna, 惑星, Kepler, SGP4)
2. それらのメソッドが返した座標オブジェクト
3. 恒星などの `{ra, dec}`(時・度)

`azel(date)` は方位(度、北=0・東=90)、仰角(度)、距離(距離が分かる場合は
常に **km**)、`atmospheric_refraction`(度)を返します。距離が分かる対象は
**測心(トポセントリック)**の値になります(日周視差を適用。月で最大約1°)。
`{ra, dec}` のみの対象は無限遠として扱われます。

**大気差は返すだけで加算されません。**大気差込みの仰角が必要な場合は
`elevation + atmospheric_refraction` を計算してください(地平線付近でのみ意味を
持ちます)。

### 座標変換関数

`RadecToXYZ`, `XYZtoRadec`, `EclipticToEquatorial`, `EquatorialToEcliptic`,
`EclipticJ2000ToDate`, `Obliquity` / `MeanObliquity` / `Nutation`,
`Constant`(au、各惑星の GM [km³/s²]、半径など)。なお
`EclipticToEquatorial` は地球の太陽中心位置の減算(地心化)も行うため、
**太陽中心の入力を前提**としています。`coordinate_keywords` に `j2000` を含む
ベクトルは自動的に当日分点へ歳差変換されます。

## 時刻系と精度

- 入力の `Date` は UTC。天体暦の級数は内部で TT で評価され、恒星時は UT を
  使います。TT−UTC は1972年以降うるう秒テーブルで厳密、それ以前は NASA 多項式に
  よる推定です。
- 太陽: 簡易理論(Meeus)で約 0.01°。年周光行差(約20″)は未適用。
- 月: ELP 系の打ち切り級数(Meeus 第47章)で完全理論に対し数秒角。章動は
  4項近似(約2″)。
- 惑星: VSOP87A(ほぼ全項)+ IAU 1976 歳差。光行時間差と光行差は未適用のため、
  視位置としての精度は数十秒角程度。
- 人工衛星: SGP4(Spacetrack Report #3)、TEME 座標系。SGP4 の一般的な制約
  (km オーダー、TLE の経過日数とともに劣化)に従います。
- `azel` は日周視差を適用しますが、大気差(別途返却)と極運動は適用しません。

## このブランチでの挙動変更(移行メモ)

- npm のエントリポイントが `dist/orb.js` になりました(従来の `main` は存在
  しないファイルを指していました)。
- 級数を TT で評価するようになったため、全天体の位置が ΔT ≈ 69秒分
  (月で約38″)移動しました。
- 惑星・ケプラー軌道の radec が当日分点になり、歳差の蓄積分(2026年時点で
  約0.4°)移動して太陽・月と整合するようになりました。
- 月の方位・仰角が最大約1°移動しました(日周視差の適用)。月の出入りの時刻が
  4〜5分正確になります。
- `azel` の距離は常に km になり、`unit_keywords` に明記されます。
- `gmst()` は非推奨となり `gast()` を推奨します(値は同一)。

## ライセンス

MIT — MIT-LICENSE を参照してください。
