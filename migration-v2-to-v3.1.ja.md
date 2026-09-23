# orb.js v2 から v3.1 への移行

このガイドは、v2 系の最終版 `v2.4.1` から `@lizard-isana/orb` v3.1 へ
移行するアプリケーション向けです。それ以前の v2 には、ここに記載していない差が
ある場合があります。

v3.1 は従来の同期的な `Orb.*` API を維持しながら、数値上・意味上の問題を修正して
います。また、座標系・中心・単位・時刻系を明示する構造化 API を追加しています。
アップグレードのために、最初から構造化 API へ全面的に書き換える必要はありません。

## 推奨する移行手順

1. 読み込み方法だけを変更し、既存の `Orb.*` 呼び出しは維持する。
2. アプリケーションの数値テストを実行し、後述する意図的な変更を確認する。
3. 明示的なメタデータ、現代的な座標変換、イベント探索、厳密な入力検証が必要な
   箇所だけ、構造化サブパス API を採用する。

この順序なら、配布・読み込みの問題と天文計算の変更を分けて確認できます。

## 1. 配布方法を変更する

npm パッケージ名はスコープ付きになりました。

```sh
npm install @lizard-isana/orb
```

```js
// v2
const Orb = require('orb.js');

// v3.1, CommonJS
const Orb = require('@lizard-isana/orb');

// v3.1, ES module
import * as Orb from '@lizard-isana/orb';
```

ブラウザでは完全版 UMD ビルドを読み込みます。従来どおり `window.Orb` が定義されます。

```html
<!-- v2 -->
<script src="orb.v2.js"></script>

<!-- v3.1 -->
<script src="orb.js"></script>
```

公開ファイルは `dist/orb.js` です。CDN URL にはパッケージ名、バージョン、
`/dist/orb.js` を含め、本番環境ではバージョンを固定してください。

対応ブラウザは Chrome / Edge 92 以降、Firefox 90 以降、Safari / iOS Safari
15.4 以降、Chrome for Android 92 以降、Firefox for Android 90 以降です。
UMD ビルドにはポリフィルと構造化サブパス API は含まれません。

旧コンポーネントファイルは次の入口へ対応します。

| v2 のファイル | v3.1 の置き換え先 |
|---|---|
| `orb.v2.js` | パッケージルート、または `dist/orb.js` |
| `orb-core.v2.js` | パッケージルート。構造化ヘルパーは `/time`, `/frames`, `/geodesy`, `/vocab` にも分割 |
| `orb-planetary.v2.js` | パッケージルート。完全版 VSOP 係数は任意のサブパス import |
| `orb-satellite.v2.js` | パッケージルート、または `/sgp4` |
| `orb-data-loader.v2.js` | 置き換えなし。`fetch`、動的 `import()`、実行環境のローダーを使用 |
| `orb-date-handler.v2.js` | 置き換えなし。`Date`、または `/time` の `AstroInstant` を使用 |

v2 のコンポーネントファイルと v3.1 のビルドを混在させないでください。

## 2. 互換 API を維持し、結果を確認する

主要なコンストラクタとヘルパーはパッケージルートに残っています。

`Sun`、`Luna`/`Moon`、各惑星、`Kepler`、`SGP4`/`Satellite`、
`Observation`、`Observer`、`Time`、`Nutation`、`Obliquity`、座標変換関数、
従来の定数を引き続き使用できます。

そのため、典型的な v2 の呼び出し形は維持できます。

```js
const Orb = require('@lizard-isana/orb');
const date = new Date('2026-07-18T12:00:00Z');

const mars = new Orb.Mars().radec(date);
const moon = new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
  target: new Orb.Luna()
}).azel(date);
```

次の変更は意図的なものです。アプリケーションが新しい意味を必要としていることを
確認してから、スナップショットや許容誤差を更新してください。

| 項目 | v2 の挙動 | v3.1 の挙動 |
|---|---|---|
| 天体暦の時刻 | 一部の級数が実質的に UTC で評価されていた | 天体暦の級数を内部で TT により評価 |
| 惑星・Kepler の赤経赤緯 | 歳差処理により J2000 付近の結果になっていた | 当日分点へ統一 |
| 惑星 `xyz()` のラベル | 座標の元期が明示されなかった | `coordinate_keywords` に `j2000` を明記 |
| 太陽の赤経赤緯の距離 | 数値は km だが単位ラベルは au だった | 数値・ラベルとも au |
| 観測地点の地球楕円体 | WGS-72 に近い観測地点形状 | WGS-84 |
| 近距離天体の観測 | 赤経赤緯経由では完全な測心視差を適用しなかった | 距離既知の対象は測心化し、距離を km に統一 |
| 年初からの通日 | 文字列となる場合やローカル時刻の影響があった | `Time.doy()` は UTC の数値 |
| 恒星時メソッド名 | `gmst()` という名前で視恒星時を返した | `gmst()` は `gast()` の非推奨エイリアス。IAU 1982 の平均恒星時には `gmst82()` を使用 |

たとえば 2026-07-18T12:00:00Z では、歳差の累積により火星の互換 API の
赤経赤緯が v2.4.1 に対して約 0.40 度移動します。東京から見た月の仰角は、v3.1
で日周視差を適用するため約 1 度移動する場合があります。これらは変更規模の例であり、
誤差範囲や互換性の保証ではありません。

### 推測せずエラーにする入力

v3.1 は、未対応または曖昧な従来形式の観測座標・単位に対して明示的なエラーを
投げます。旧アプリケーションが座標オブジェクトを手作業で組み立てている場合は、
座標種別と単位を明確にするか、対応済みの `Orb.*` 天体オブジェクトを渡してください。
このエラーは v2 が危険な仮定を暗黙に行っていた可能性を示すため、握りつぶさないで
ください。

### 削除された v2 グローバル

`Orb.NutationAndObliquity` はエクスポートされません。`Orb.Nutation`、
`Orb.Obliquity`、`Orb.MeanObliquity` を個別に使用してください。v2 のメタデータ
グローバル `Orb.VERSION`、`Orb.AUTHOR`、`Orb.LICENSE` は package metadata と
同梱の `MIT-LICENSE` に置き換わりました。内部データ `Orb.Terms` は v3.1 の公開
API ではありません。

## 3. 必要に応じて構造化 API を採用する

構造化 API は追加の ES module サブパスです。従来 API の複数の天文慣習が混在した
単位ではなく、`AstroInstant`、ラジアン、km、km/s、明示的な状態メタデータを使います。

```js
import { AstroInstant } from '@lizard-isana/orb/time';
import { createObserver } from '@lizard-isana/orb/observer';
import { sunEpv00 } from '@lizard-isana/orb/models/earth-epv00';

const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
const tokyo = createObserver({
  latitude: 35.658 * Math.PI / 180,
  longitude: 139.741 * Math.PI / 180,
  height: 0.025
});

const observed = tokyo.observe(sunEpv00, instant);
// azimuth/elevation/rightAscension/declination: ラジアン
// range/geocentricDistance: km
```

`observe` の第3引数の省略は意図された使い方です。IAU 2006/2000B の座標変換を
使い、光行時間・年周光行差・大気差なしの幾何学的な測心結果を返します。補正は
明示的に有効化します。

```js
const apparent = tokyo.observe(sunEpv00, instant, {
  lightTime: true,
  aberration: true,
  refraction: { pressure: 1010, temperature: 10 },
  meta: true
});
```

メタデータにはモデル、適用した補正、天体モデルが提供する精度、無視した効果が
記録されます。日周光行差、重力による光の偏向、極運動は実装していません。

### 構造化 SGP4

```js
import { AstroInstant } from '@lizard-isana/orb/time';
import { createSatellite } from '@lizard-isana/orb/sgp4';

const satellite = createSatellite({
  line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});
const state = satellite.state(AstroInstant.fromISO('2020-01-14T12:37:54Z'));
// TEME、地球中心、km・km/s
```

SGP4 伝播には、TLE の平均軌道要素がそのモデルに適合されているため WGS-72
重力定数を使います。測地出力には WGS-84 を使います。`B*` は SGP4 の抗力項であり、
物理的な弾道係数ではありません。TLE チェックサム検証は
`{ validateChecksum: true }` で明示的に有効化します。精度は通常 TLE の経過時間と
ともに劣化します。SGP4 の状態を接触軌道状態と表現したり、すべてに共通する予測期間を
設定したりしないでください。

## 移行テストのチェックリスト

- v2.4.1 と v3.1 を別々のテスト環境に固定する。
- テスト時の `new Date()` ではなく、固定した UTC 時刻を比較する。
- 実際に使用する年代と観測地点の近くで値を試験する。
- 保存する参照値ごとに、単位・座標系・中心・分点を記録する。
- 太陽の距離、惑星・Kepler の赤経赤緯、月の地平座標、`Time.doy()` と
  `Time.gmst()` の呼び出しを確認する。
- スナップショットを置き換えるだけでなく、通知しきい値や出没判定の前提を再検証する。
- 衛星では同一の TLE/OMM と伝播時刻を使い、TLE 元期からの経過を下流にも残す。
- 構造化観測を採用する場合は、光行時間・年周光行差・大気差が各製品に必要かを
  明示的に決める。

v3.1 全体については [使い方（日本語）](usage.ja.md) を参照してください。すでに
v3.0 を使用しているアプリケーション向けの短い移行メモも同文書に含まれています。
