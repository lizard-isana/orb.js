# orb.js v3.1 — 使い方

orb.js は実行時依存ライブラリなしで天文計算を提供します。v3.1 には、既存アプリ
ケーション向けの互換パッケージルート API と、座標系・中心・単位・時刻系・補正・
出典を明示するための追加の構造化 ES module サブパスがあります。

## インストールと読み込み

```sh
npm install @lizard-isana/orb
```

```js
// 互換 CommonJS API
const Orb = require('@lizard-isana/orb');

// 互換 ES module API
import * as Orb from '@lizard-isana/orb';

// 構造化 ES module サブパス
import { AstroInstant } from '@lizard-isana/orb/time';
import { createObserver } from '@lizard-isana/orb/observer';
```

ブラウザでは `dist/orb.js` を読み込みます。完全版 UMD ビルドは `window.Orb` を
定義します。CDN を使う場合は正確なパッケージバージョンを固定してください。

```html
<script src="https://unpkg.com/@lizard-isana/orb@3.1.1/dist/orb.js"></script>
```

本体を読む前に未対応環境を通知したい場合は、クラシックスクリプトの事前チェックを
先に読み、成功した場合だけ orb.js を追加します。

```html
<div id="orb-status"></div>
<script src="https://unpkg.com/@lizard-isana/orb@3.1.1/dist/orb-compat.min.js"></script>
<script>
  var report = OrbCompatibility.checkCompatibility();
  if (!report.supported) {
    document.getElementById('orb-status').textContent = report.message;
  } else {
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/@lizard-isana/orb@3.1.1/dist/orb.js';
    document.head.appendChild(script);
  }
</script>
```

パッケージルートと専用サブパスからも同じチェックを利用できます。

```js
import { checkCompatibility } from '@lizard-isana/orb/compatibility';

const report = checkCompatibility();
// { supported, baseline, scope, syntaxChecked, checked, missing, failed, message }
```

チェッカーは `Map`、`Set`、型付き配列ファクトリ、数値判定、数学関数、
`Object.entries`、`Object.values`、`Array.prototype.flatMap`、
`Array.prototype.at`、文字列パディング、ISO 日付書式など、orb.js が使う境界的な
組み込みAPIを検査します。ユーザーエージェント判定、グローバルの変更、自動ログ出力、
ポリフィル追加は行いません。構文判定のための動的コード生成は Content Security
Policy と衝突し得るため、`syntaxChecked` は意図的に `false` です。構文互換性は宣言した
ブラウザ基準と実ブラウザテストで確認します。

Node.js 18 以降が必要です。構造化サブパスは ES module です。

対応ブラウザは Chrome / Edge 92 以降、Firefox 90 以降、Safari / iOS Safari
15.4 以降、Chrome for Android 92 以降、Firefox for Android 90 以降です。
ポリフィルは同梱しません。IE 11、EdgeHTML、Opera Mini、KaiOS 2.5 とそれ以前の
ブラウザは対象外で、組み込み WebView は個別には保証しません。

UMD ビルドが公開するのは互換 `Orb.*` API と互換性診断です。ブラウザで構造化計算サブパスを
使う場合はパッケージを解決できるバンドラーを使用してください。ブラウザの bare
import には import map または URL マッピングが必要で、CDN から構造化 ESM
サブパスを直接読む経路は現時点では対応対象に含めません。

## 互換 API と構造化 API の選択

互換 API は従来の `Orb.*` コンストラクタ、同期メソッド、JavaScript の `Date`
入力、角度の度または時、各結果で定義された au または km を維持します。v2 や
v3.0 からの最短のアップグレード経路です。

構造化 API は次の規約を使います。

- 計算境界では `Date` の代わりに `AstroInstant`
- 角度はラジアン
- 状態ベクトル計算は km、km/s、秒
- 明示的な `frame` と `center` タグ
- 明示的な補正スイッチと任意のメタデータ

`/frames` が公開するアダプタを使って両者を組み合わせられます。構造化 API が互換
クラスの既定値を暗黙に変更することはありません。

## 互換パッケージルート API

### 太陽・月・惑星

```js
const date = new Date('2026-07-18T12:00:00Z');

const sun = new Orb.Sun().radec(date);
// ra: 時、dec: 度、distance: au

const moon = new Orb.Luna().radec(date); // Orb.Moon は別名
// ra: 時、dec: 度、distance: km

const mars = new Orb.Mars();
mars.radec(date); // 地心の赤経赤緯、当日分点
mars.xyz(date);   // 太陽中心・黄道 J2000、au
```

惑星コンストラクタは `Mercury`、`Venus`、`Earth`、`Mars`、`Jupiter`、
`Saturn`、`Uranus`、`Neptune` です。既定の惑星データはルートバンドルに含まれる
短縮版 VSOP87A テーブルです。別途読み込む完全版係数は「任意の完全版 VSOP87A
データ」を参照してください。

`Luna.latlng(date)` は当日分点の黄経・黄緯を度で、距離を km で返します。
`Luna.xyz(date)` は当日分点の地心黄道直交座標を km で返します。
`Luna.parallax(date)` は地平視差を度で、`Luna.phase(date)` は指定時刻以前で
直近となる計算上の新月からの経過日数を返します。

### 互換 Kepler 軌道

```js
const comet = new Orb.Kepler({
  eccentricity: 0.85,
  periapsis_distance: 0.9,
  inclination: 30,
  argument_of_periapsis: 120,
  longitude_of_ascending_node: 45,
  time_of_periapsis: 2460700.5
});

comet.xyz(date);   // au、au/日
comet.radec(date); // 時、度、au
```

互換軌道要素は度、au、TT のユリウス日を使います。`semi_major_axis` または
`periapsis_distance` の一方と、`time_of_periapsis` または `mean_anomaly` と
`epoch` の組を指定します。`Orb.CartesianToKeplerian` は互換形式の状態を軌道
要素へ逆変換します。

### 互換 SGP4

```js
const iss = new Orb.SGP4({
  first_line: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});

iss.xyz(date);    // TEME の位置・速度、km・km/s
iss.latlng(date); // WGS-84 の緯度・経度（度）、高度（km）
```

`Orb.Satellite` は別名です。TLE オブジェクトと CCSDS OMM オブジェクトを受け
付けます。近地球・深宇宙の伝播には Vallado の SGP4/SDP4 実装を使います。伝播は
WGS-72 重力定数、測地出力は WGS-84 を使います。モデルの契約と制約は「構造化
SGP4 の意味」を参照してください。

### 互換観測

```js
const observation = new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
  target: new Orb.Luna()
});

const result = observation.azel(date);
// azimuth/elevation/atmospheric_refraction: 度
// distance: 距離既知の場合は km
```

方位角は北 = 0 度、東 = 90 度です。観測地点の緯度・経度は度、高度は WGS-84
上の km です。対象には対応済みの orb.js 天体、その天体が返した座標オブジェクト、
または恒星方向を表す単純な `{ ra, dec }`（時・度）を指定できます。距離既知の対象は
測心化され、赤経赤緯だけの方向は無限遠として扱われます。

互換結果は `atmospheric_refraction` を返しますが、`elevation` には加算しません。
未対応または曖昧な座標・単位の組み合わせは、推測せず説明的なエラーになります。

### 互換時刻・座標ヘルパー

`new Orb.Time(date)` は次を提供します。

| メソッド | 意味 |
|---|---|
| `jd()` | UTC 基準のユリウス日 |
| `jd_tt()` | TT のユリウス日 |
| `tt_minus_utc()` | TT−UTC（秒） |
| `delta_t()` | TT−UT1 の推定値（秒） |
| `gast()` | グリニッジ視恒星時（時） |
| `gmst82()` | IAU 1982 グリニッジ平均恒星時（時） |
| `gmst()` | `gast()` の非推奨エイリアス |
| `doy()` | UTC の小数付き年初通日（数値） |

座標ヘルパーには `RadecToXYZ`、`XYZtoRadec`、
`EclipticToEquatorial`、`EquatorialToEcliptic`、`EclipticJ2000ToDate`、
`Nutation`、`Obliquity`、`MeanObliquity` があります。互換結果は従来の
`coordinate_keywords` と `unit_keywords` を維持します。ルート API の全結果を
同じ単位だと仮定せず、これらを確認してください。

`Luna.xyz()` は地球中心ベクトルであり、`center_keywords: 'earth'` も返します。
黄道→赤道変換ヘルパーは、入力に `center: 'earth'`、
`center_keywords: 'earth'`、または `origin: 'geocentric'` が明記されていれば、
地球の太陽中心位置を減算せず座標面だけを回転します。座標面の回転ではこれらの中心情報を
維持するため、続く逆変換でも同じ原点が使われます。中心が明記されない従来形式の黄道入力は、
互換性のため太陽中心入力として扱い、地心化してから回転します。

## 構造化された時刻・座標系・測地系

### `@lizard-isana/orb/time`

```js
import { AstroInstant, deltaT, ttMinusUtc } from '@lizard-isana/orb/time';

const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z', { dut1: 0.05 });
const other = instant.addSeconds(30);
instant.jd('utc');
instant.jd('ut1');
instant.jd('tt');
instant.addSeconds(30);
other.differenceSeconds(instant);
other.differenceTtSeconds(instant);
```

`AstroInstant.from` は `AstroInstant`、`Date`、ISO 文字列、Unix ミリ秒を受け付けます。
`fromJD` と `fromJD2` は明示的な `utc`、`ut1`、`tt` 時刻系を受け付けます。
内部では2分割した TT ユリウス日を保持し、オブジェクトは不変です。`dut1` の既定値は
0 で、指定する場合は -0.9〜+0.9 秒の範囲でなければなりません。
`AstroInstant` は orb.js 独自の天文時刻クラスであり、`Temporal.Instant` では
ありません。ブラウザの Temporal API にも依存しません。

`addSeconds()` と `differenceSeconds()` は同じ Unix／JavaScript `Date` の時間軸を
使うため、UTC のうるう秒境界でも互いに逆の継続時間演算になります。JavaScript
`Date` は ISO の `23:59:60` を独立した時刻として表現できず、orb.js もこのラベルを
別の瞬間として公開しません。TT 座標値の差（うるう秒オフセットの段差を含む）が必要な
場合は `differenceTtSeconds()` を使います。`addDays()` の1日は、この Unix 的な秒の
正確な86,400秒です。

### `@lizard-isana/orb/frames`

```js
import { makeState, transform } from '@lizard-isana/orb/frames';
import { AstroInstant } from '@lizard-isana/orb/time';

const state = makeState({
  t: AstroInstant.fromISO('2026-07-18T12:00:00Z'),
  frame: 'equatorial-j2000',
  center: 'earth',
  r: [7000, 0, 0],
  v: [0, 7.5, 1]
});
const ofDate = transform(state, { frame: 'equatorial-of-date' });
```

状態の位置と速度は km と km/s です。座標系語彙には赤道・黄道 J2000、当日の平均・
真赤道、当日黄道、TEME、ECEF、ENU、地平、WGS-84 測地コンテキストが含まれます。
IAU 2006 歳差、IAU 2000B 章動、必要箇所の IAU 1982 恒星時回転、角度定数、
ベクトル・行列ヘルパー、従来天体アダプタも公開します。未知の座標系や未対応の変換経路は
エラーになります。

### `@lizard-isana/orb/geodesy`

このサブパスには純粋な WGS-84 測地/ECEF/ENU 変換があります。地点は緯度・経度を
ラジアン、`height` を km で指定します。ECEF と ENU ベクトルは km、地平方位角と
仰角はラジアンです。

`@lizard-isana/orb/vocab` は量、単位、座標系、中心、補正、効果、出典の統制名と
検証ヘルパーを公開します。構造化メタデータの保存や交換にはこのトークンを使って
ください。

## 構造化 Kepler 伝播

`@lizard-isana/orb/kepler` は `propagateKepler`、`elementsToState`、
`stateToElements`、`stumpffC`、`stumpffS`、一般的な `GM` 値を公開します。

```js
import { GM, propagateKepler } from '@lizard-isana/orb/kepler';

const next = propagateKepler(
  [7000, 0, 0],
  [0, 7.5, 1],
  600,
  GM.earth
);
```

構造化ソルバーは km、km/s、秒、ラジアン、km³/s² を使います。楕円・放物線・双曲線
運動を、上限付きの一つの universal variable 経路で扱います。物理的に不正な入力や
非収束はエラーになります。これは摂動なしの二体伝播であり、地球衛星の力学モデルでは
ありません。

状態と軌道要素の往復には、構造化 `stateToElements()` を推奨します。円軌道・赤道軌道
の特異点では `raan` や `argumentOfPeriapsis` を0とし、残る角に物理的な経度を持たせる
規約を定義しています。互換 `Orb.Cartesian` はこの規約より前のAPIであり、完全な円軌道
または赤道軌道では角度欄が `NaN` になり得るため、その特異ケースには使用しないでください。

## 構造化 Earth/Sun と observer

`@lizard-isana/orb/models/earth-epv00` は `earthEpv00` と `sunEpv00` を公開
します。このモデルは JPL DE405 に適合した ERFA EPV00 調和級数に基づき、
1900〜2100 年の有効範囲と約1秒角の出典精度を保持します。任意のモデルであり、ルート
API の従来 Earth/Sun モデルを置き換えません。

```js
import { AstroInstant } from '@lizard-isana/orb/time';
import { createObserver } from '@lizard-isana/orb/observer';
import { sunEpv00 } from '@lizard-isana/orb/models/earth-epv00';

const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
const site = createObserver({
  latitude: 35.658 * Math.PI / 180,
  longitude: 139.741 * Math.PI / 180,
  height: 0.025
});

const geometric = site.observe(sunEpv00, instant);
const corrected = site.observe(sunEpv00, instant, {
  lightTime: true,
  aberration: true,
  refraction: { pressure: 1010, temperature: 10 },
  meta: true
});
```

`observe` の第3引数は省略できます。省略時は正確に次と同じです。

```js
{
  frameModel: 'iau2006-2000b',
  lightTime: false,
  aberration: false,
  refraction: false,
  meta: false
}
```

したがって既定値は現代的な座標変換と測心ベクトル差を使いますが、幾何学的かつ
大気差なしです。光行時間、年周光行差、大気差はそれぞれ明示的に有効化します。大気差
の気圧は hPa、気温は摂氏です。

観測角はラジアン、距離は km です。`range` は観測者から対象まで、
`geocentricDistance` は地心から対象までの距離です。`meta: true` では量、単位、
座標系、中心、適用した補正、モデル出典、モデルが提供する精度、無視した効果を記述
します。このパイプラインは日周光行差、重力による光の偏向、極運動を実装しません。

## 構造化イベント

`@lizard-isana/orb/events` は上限付き探索、出・没・南中、月の離角・主要位相・月齢、
衛星パスを提供します。すべての時刻入力とイベント時刻は `AstroInstant`、公開角度は
ラジアンです。

```js
import { HORIZON_CONSTANTS, riseSetTransit } from '@lizard-isana/orb/events';

const events = riseSetTransit(
  site,
  sunEpv00,
  AstroInstant.fromISO('2026-07-17T15:00:00Z'),
  AstroInstant.fromISO('2026-07-18T15:00:00Z'),
  { semidiameter: HORIZON_CONSTANTS.meanSolarSemidiameter }
);
```

出没の既定値は、0 ラジアンの地平線を天体中心が幾何学的に通過する時刻です。衛星
パスも最小仰角 0 が既定値です。標準大気差、太陽・月の平均視半径、慣用地平線は
`HORIZON_CONSTANTS` で公開しますが、いずれも暗黙には選びません。合成済みの慣用
地平線と、同じ大気差または視半径補正を重ねて指定しないでください。

`transit` は測心時角が0になる上方の子午線通過です。移動天体では時刻がずれることの
ある仰角最大を「南中」とは定義しません。衛星パスの `culmination` は引き続き、その
パス区間内の最大仰角です。

探索関数は `stepSeconds`、`toleranceSeconds`、`maxIterations`、
`maxEvaluations` を受け付けます。step は粗い区間分割、tolerance は絞り込み後に許す
時間幅です。評価回数の上限超過や、反復上限までに許容幅へ収束しない場合は、未収束値を
正常結果にせず例外を投げます。交差探索の端点規則は `(from, to]`、最大値探索は両端を
含みます。粗い最大サンプルが端点でも隣接区間を細かく探索します。区間内の標本が閾値と
ちょうど等しい場合は、その両側にある最も近い非ゼロ標本の符号が異なるときだけ交差です。
閾値に接するだけならイベント区間を分割しません。衛星パスは探索許容幅より長い正の
継続時間を必要とするため、`to` ちょうどの出現は長さ0のパスとして返しません。
`from` ですでに閾値より上なら、出現側をクリップしたパスとして返します。

パス結果は仰角を `geometric` または `refracted` と表示します。
`opticalVisibility` と `sunlight` は `not-computed` です。幾何学的なパスは衛星が
照明されている、または目視できるという意味ではありません。

## 構造化 SGP4 の意味

`@lizard-isana/orb/sgp4` は純粋な TLE/OMM パーサーと `createSatellite` を公開
します。

```js
import { createSatellite } from '@lizard-isana/orb/sgp4';

const satellite = createSatellite({
  line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});
const state = satellite.state(AstroInstant.fromISO('2020-01-14T12:37:54Z'));
const subpoint = satellite.geodetic(AstroInstant.fromISO('2020-01-14T12:37:54Z'));
```

`state()` は地球中心 TEME の状態を km と km/s で返します。`geodetic()` は SGP4
で必要な TEME→ECEF 経路を使い、WGS-84 の緯度・経度・高さをラジアン・ラジアン・
km で返します。

TLE の値は SGP4 平均軌道要素であり、瞬時の接触軌道要素ではありません。伝播には、
要素がそのモデルに適合されているため WGS-72 重力定数を使い、WGS-84 は測地変換に
だけ使います。`B*` は SGP4 の抗力項であり、物理的な弾道係数ではありません。TLE は
固定幅の数字形式と Alpha-5 形式、OMM は最大9桁の整数カタログ番号に対応します。
`createSatellite()` と `parseOmm()` は、OMM の要素名を使いつつ
`CCSDS_OMM_VERS`、`CENTER_NAME`、`REF_FRAME`、`TIME_SYSTEM`、
`MEAN_ELEMENT_THEORY` を省略することのある CelesTrak GP JSON も受け付け、
Earth／TEME／UTC／SGP4 の規約を補います。それ以外の不完全な OMM 風入力は検証で
拒否します。TLE 2行は同一物体を示す必要があり、不正な欄は説明的なエラーになります。
チェックサムは既定では任意です。`{ validateChecksum: true }`
で有効化するか、チェックサム関数を直接呼び出してください。

SGP4 の経過分は参照実装の UTC 的なユリウス日規約に従い、TT 座標差ではなく
`AstroInstant.differenceSeconds()` と同じ Unix 的な経過秒を使います。移植元
python-sgp4 の MIT 通知は `src/sgp4/LICENSE-python-sgp4` に同梱し、単独配布可能な
ビルド済みバンドルにも表示します。

SGP4 の誤差は要素の経過時間と軌道条件により増大します。新しい要素を使い、その元期を
保持し、運用状況に合わせて予測を検証してください。orb.js はすべてに共通する
「N日間有効」という期間を定めません。

## 任意の完全版 VSOP87A データ

既定 UMD バンドルを小さく保つため、完全版の惑星係数モジュールは別に公開します。
必要な天体だけを import して登録します。

```js
import * as Orb from '@lizard-isana/orb';
import { MARS_FULL_COEF } from '@lizard-isana/orb/vsop87a/mars';

Orb.registerVSOP87A('Mars', MARS_FULL_COEF);
const mars = new Orb.Mars({ vsop87a: 'full' });
```

Mercury、Venus、Earth、Mars、Jupiter、Saturn、Uranus、Neptune のモジュールが
あります。係数の一次データはリポジトリ内に保持し、生成の再現性を検証しています。
完全版データは級数の打ち切りを改善しますが、互換メソッドで省略されている光行時間・
光行差などの補正を追加するものではありません。

## モデル・精度・省略する効果

精度は係数表だけでなく、計算パイプライン全体で決まります。次の記述はモデルの範囲を
示すもので、すべての年代・配置に一つの誤差上限を保証するものではありません。

- 互換 Sun と Moon は従来の orb.js/Meeus 系モデルを使います。Moon の級数は
  打ち切り版で、互換章動は短い近似です。
- 互換惑星は既定で短縮版 VSOP87A を使い、完全版テーブルは任意です。互換の赤経赤緯
  は従来の視位置規約を使い、現代的な補正をすべて含むわけではありません。
- 構造化 observer は IAU 2006 歳差、IAU 2000B 章動、必要箇所の IAU 1982
  地球回転、WGS-84 観測地点形状を使います。光行時間、年周光行差、大気差は明示的な
  スイッチです。
- EPV00 は出典、有効範囲、出典上のおよその精度を保持します。有効範囲外への外挿は
  新たな精度保証にはなりません。
- SGP4/SDP4 は参照ベクトルで検証していますが、実際の予測誤差は要素セットと元期からの
  経過時間に強く依存します。

結果に明記されない限り、orb.js は極運動、日周光行差、重力による光の偏向、大気減光、
光害、地形の地平線、衛星の可視性をモデル化しません。

## v3.0 から v3.1 への移行

v3.1 はパッケージルート API を維持し、`/time`、`/frames`、`/geodesy`、
`/vocab`、`/kepler`、`/models/earth-epv00`、`/observer`、`/events`、
`/sgp4` サブパスを追加します。任意の完全版 VSOP モジュールと、堅牢化した TLE/OMM
パーサーも追加します。

互換経路の意図的な修正には、WGS-84 観測地点高度の扱いと、未対応または曖昧な観測入力
に対する明示的なエラーがあります。正当な従来入力形式はテストで維持しています。非常に
大きい観測地点高度を使うアプリケーションでは観測結果を見直してください。通常の地表
付近では修正量は小さいものです。

互換呼び出しに構造化補正オプションが暗黙に有効化されることはありません。v2 からの
移行では、配布、時刻処理、歳差、距離単位、測心観測の意味も異なるため、独立した
[v2.4.1→v3.1 移行ガイド](migration-v2-to-v3.1.ja.md) を参照してください。

## エラーと再現性

構造化 API は有限値、統制語彙、物理範囲、未知のオプション、変換経路、探索上限を
検証します。投げられたエラーを、推測値へ置き換えず、不正入力または未対応モデルの通知
として扱ってください。

再現可能な作業では、パッケージバージョン、UTC 時刻と関連する時刻系入力、座標系、
中心、単位、モデルオプション、観測地点、補正、TLE/OMM 元期を記録してください。
現在時刻に依存するテストは避けてください。

## ライセンス

MIT — [MIT-LICENSE](MIT-LICENSE) を参照してください。
