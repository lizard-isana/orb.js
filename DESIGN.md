# orb.js v4 設計文書 / Design Document

Status: draft / 検討中
Branch: `v4-planning`

> **English abstract**: orb.js v4 is a ground-up redesign that keeps the v3
> policy — browser-first, zero runtime dependencies, self-contained ephemeris
> data, MIT — while replacing the stringly-typed coordinate metadata with
> typed state vectors and an explicit frame-transformation graph, making the
> package tree-shakeable per body, and treating the source code itself as
> educational material ("source as textbook"). This document records the
> rationale, the architecture, and the milestones.

---

## 1. 目的とスコープ

v4 は v3 の機能とポリシーを引き継いだ再設計である。

**引き継ぐポリシー**

- ブラウザ完結・実行時依存ゼロ・自己完結(暦データ同梱、実行時通信なし)
- 守備範囲: 太陽・月・惑星の位置、ケプラー軌道、人工衛星(SGP4/SDP4)、
  観測地から見た地平座標、時刻系ユーティリティ
- ホビイストが5行で使える簡潔な API
- MIT ライセンス
- 精度クラス: 秒角〜分角(可視化・衛星追尾・出没計算に十分)。JPL 級は狙わない

**v4 で新たに加える柱**

- **初学者向け学習コンテンツとしての価値**(§7)。v3 が「コードを読んで天文計算を
  学ぶ教材」として使われている実態を、偶然ではなく設計目標に格上げする。

## 2. v3 から得た教訓(設計の根拠)

v3 の総点検(2026-07、レビューブランチ)で確認された不具合は、個別のミスではなく
設計に由来するものが多かった。v4 の設計判断はこの実績に基づく。

| v3 で実際に起きたこと | 原因となった設計 | v4 での対策 |
|---|---|---|
| au の惑星座標から km の観測者位置を減算(仰角 −89.8°) | 単位情報が文字列 `unit_keywords` で、途中の関数が握り潰せる | 内部単位を km/km/s/rad に固定した型付き状態ベクトル(§4.2) |
| 惑星の radec が J2000 分点、太陽・月が当日分点(24′の不整合) | `EclipticToEquatorial` が地心化+回転を暗黙に兼ね、歳差の置き場がない | 座標系グラフ: 変換の定義を1箇所に集約(§4.2) |
| 月の azel が渡し方(インスタンス/座標)で約1°違う | 入力形態ごとに別経路の変換コード | 全経路が同じグラフを通る |
| ΔT 未適用(コメントアウトのまま)、`Date.UTC` の小数秒切り捨てで 1.4 km | 生の `Date`/JD を裸で持ち回る | TT 基準の `Instant` 型に入口で変換(§4.1) |
| `ParabolicOrbit` 未定義で e=1 がクラッシュ | 軌道形状ごとの3分岐実装 | ユニバーサル変数法の単一ソルバ(§4.5) |
| GM 定数の小数点落ち(10倍)が長期間未検出 | テスト不在 | 参照値駆動のテスト(§6)。Meeus 実例・python-sgp4・Horizons 固定値 |
| 月齢だけ欲しいページも VSOP 全係数を読み込む | 全部入り単一バンドル | 天体ごとのサブパスエクスポート+係数の事前コンパイル(§4.3) |

## 3. アーキテクチャ

4層構造。下の層は上の層を知らない。

```
Layer 3  ergonomic shell   observer.observe(moon, t) / riseSet(sun, tokyo, date)
Layer 2  frames graph      座標系の型と変換(歳差・章動・恒星時・視差を一元化)
Layer 1  models            VSOP87 / 月理論 / SGP4 / ケプラーソルバ / 大気差
Layer 0  primitives        Instant(時刻系)・vec3・角度・定数
```

v3 の簡潔な API は Layer 3 の1層だけで実現し、その内側に暗黙の変換を置かない。

## 4. 主要コンポーネント

### 4.1 時刻: `Instant`(Layer 0)

- 内部表現は **2重 double のユリウス日**(整数部+小数部、python-sgp4 と同方式)。
  ミリ秒精度問題を構造的に排除する。
- 基準時刻系は TT。`jd('tt') / jd('utc') / jd('ut1')`、`gmst82()`(TEME 用)、
  `gast()`(視位置用)を提供。
- TT−UTC は v3 で実装したうるう秒テーブル(1972〜)+ NASA 多項式(それ以前)を移植。
- 入口: `Instant.fromDate(Date)`(UTC 解釈、v3 踏襲)、`fromISO`, `fromJD`。
  Temporal API は「受け付けるが要求しない」(`Instant.from(temporal)`)。

### 4.2 状態ベクトルと座標系グラフ(Layer 2)— v4 の心臓部

すべての天体位置は1つの型に統一する:

```js
{
  t: Instant,
  frame: 'ecliptic-j2000',   // 'equatorial-of-date' | 'teme' | 'ecef' | 'enu' ...
  center: 'sun',             // 'earth' | 'observer' ...
  r: Float64Array[3],        // 常に km
  v: Float64Array[3] | null  // 常に km/s
}
```

- **内部単位は km / km/s / rad に固定**。au・時角・度への変換は出力フォーマッタ
  のみが行う。
- 変換は単一の入口 `transform(state, {frame, center})` に集約する。グラフの辺:
  - 中心の変更(地心化・測心化)— 光行時間差の適用点でもある
  - J2000 ↔ 当日分点(歳差+章動。**IAU 2006/2000B に更新**、v3 の IAU1976+4項から)
  - 慣性系 ↔ 地球固定(TEME は GMST82、視位置系は GAST — 座標系型が回転角を選ぶ)
  - ECEF ↔ 測地座標・ENU(WGS-84)
- 未定義の変換経路は明示的にエラー。文字列マッチによる推測はしない。

### 4.3 天体: データ+純関数(Layer 1)

```js
import { mars, moon, sun } from 'orb/bodies';
mars.state(t)   // 太陽中心・ecliptic-j2000
moon.state(t)   // 地心・of-date(frame フィールドが正しく主張する)
```

- クラスをやめ純関数+データにすることで、バンドラのツリーシェイキングが効く。
- VSOP87A 係数は**ビルド時に Float64Array へ事前コンパイル**し天体ごとの
  モジュールに分割。ソースの 14,000 行配列リテラルを廃止。
- 精度2段階: 標準=0.1″打ち切りの縮約版(デフォルト)、フル係数(オプトイン)。
- **太陽は VSOP 地球の符号反転から導出**し、独立した簡易太陽理論を廃止
  (v3 で観測された理論間 17″ の不整合が消え、真実の源が1つになる)。
- 月は Meeus 第47章の級数を維持(数秒角、ポリシーに十分)。

バンドルサイズ目標(min+gzip): 月のみ 〜15KB / 太陽+月+観測 〜30KB /
惑星1つ +5〜20KB / SGP4 +15KB / 全部入り単一ファイル 〜200KB。

### 4.4 観測パイプライン(Layer 3)

```js
const tokyo = observer({ latitude: 35.66, longitude: 139.74, height: 25 });
// height はメートル(v3 の km 指定は事故源だった)

tokyo.observe(mars, t)
// 既定で 光行時間差 → 光行差 → 歳差章動 → 日周視差 を適用(v3 は前2者が未適用)
tokyo.observe(mars, t, { refraction: { pressure: 1013, temperature: 10 } })
// 大気差は既定オフ・オプションで明示適用(v3 の「返すだけ」より誤解が少ない)
```

各段は純関数で、個別にテスト・文書化する。

### 4.5 ケプラーソルバ

楕円/放物線/双曲線の3分岐を**ユニバーサル変数法の単一ソルバ**に統一。
e≈1 で連続になり、v3 の「ParabolicOrbit 未定義」型の欠落が構造的に消える。
状態ベクトル→軌道要素の逆変換も同居。

### 4.6 SGP4/SDP4

v3 レビューブランチで移植・検証済みの Vallado リファレンス実装のコア
(`orb-sgp4-propagation.js`: 純関数+satrec、python-sgp4 と 1e-9 km で一致)を
そのまま搬入する。TEME 座標系タグが §4.2 のグラフに接続する。
伝播は WGS-72 定数(TLE のフィット定数)、測地変換は WGS-84 という使い分けも維持。

### 4.7 events モジュール(新規)

出没・南中・薄明・月相・**衛星パス予測**。位置関数に対する求根で実装する。

```js
tokyo.passes(iss, { from, to, minElevation: 10 })
riseSet(sun, tokyo, date)
```

ブラウザ用途の本命機能であり、コア API の実地テストにもなる。

## 5. 言語・配布

- **ソースは JavaScript + JSDoc 型注釈**。「JavaScript のみ」というプロジェクトの
  アイデンティティを維持しつつ、`tsc` で `.d.ts` を生成して TypeScript 利用者に
  完全な型を提供する。§7 の教育目標とも整合する(初学者が読むのは JS)。
- **ESM ファースト+サブパスエクスポート**(`orb/bodies/mars`, `orb/sgp4`,
  `orb/events`)。script タグ用に単一 IIFE バンドルを併売。
- `dist/` はコミットしない。CI がリリース時にビルドする(v3 の「dist 同期検査」は
  不要になる)。
- 対応環境: ES2020 水準のブラウザ+Node LTS。トランスパイルは最小限。

## 6. テスト戦略

v3 レビューで作った資産を昇格・拡充する。

- **参照値テスト**: Meeus 実例(47.a 月位置、12.b 恒星時)、python-sgp4 固定
  ベクトル(5軌道種)、JPL Horizons スナップショット(開発時に取得しリポジトリに
  固定)
- **プロパティテスト**: 座標変換の往復恒等、軌道エネルギー保存、視差 ×cos(el)
  恒等、フレームグラフの経路独立性(どの経路でも同じ結果)
- **v3 等価性テスト**(移行期): 同一入力で v3 と v4 の差が「説明済みの改善」の
  範囲内であることを機械的に確認
- CI は v3 で導入した GitHub Actions を踏襲(Node LTS マトリクス)

## 7. Educational 版の設計 — "source as textbook"

初学者向け学習コンテンツとしての価値を、別成果物ではなく**設計原則**として
組み込む。核となる判断: **教育版という別コピーは作らない**。コピーは必ず本体から
乖離する。代わりに、

> ソースそのものを教材品質で書き、配布物からはビルドが自動的にコメントを落とす。

minifier はコメントを除去するので、**豊富なコメントは配布サイズに一切影響しない**。
「教育版」とは、(1) コメント付きのソースそのもの、(2) それを読みやすく閲覧する
生成物、の2つを指す。

### 7.1 コメント規約(教材品質の定義)

各アルゴリズムファイルに次を義務付ける:

1. **ファイル冒頭ヘッダ**: このモジュールが計算する物理量、理論の出典
   (書名・章・式番号)、精度と有効範囲、単位の規約
2. **式番号コメント**: 実装行を教科書の式に対応付ける
   (例: `// Meeus (47.1): 平均黄経 L'`, `// Vallado eq. 3-45`)
3. **「なぜ」コメント**: 数値上の工夫(桁落ち回避、収束判定、特異点処理)は
   理由を書く。v3 レビューで発見した落とし穴(`Date.UTC` の小数秒切り捨て、
   TEME と GMST82 の対応など)は、再発防止としてコード中に残す
4. コメント言語は**英語**(国際的なコントリビュータと教材翻訳の起点)。
   日本語の解説は §7.2 のガイドが担う

この規約が守られるよう、モジュールは「1ファイル=1概念」の粒度に保つ
(§4 の分割はこの点でも教育目標と一致する)。

### 7.2 ガイド(日本語+英語の読み物)と乖離防止

`docs/guide/` に章立ての解説を置く。章 = 学習単位:

1. 時刻系(UTC/TT/ΔT/恒星時)— なぜ69秒ずらすのか
2. 座標系(黄道/赤道/分点/歳差章動)— 24′ずれた実話から始める
3. 太陽と月の位置(級数展開の考え方)
4. ケプラー問題(ユニバーサル変数法)
5. 観測(光行時間差・光行差・視差・大気差)
6. 人工衛星(TLE と SGP4 の仕組み)

各章は実際のソースの抜粋を引用して進める。**抜粋はコピペしない**:

- ソース側にマーカーコメント(`//#region edu:kepler-solver` 〜 `//#endregion`)
- ガイド側は `{{snippet: edu:kepler-solver}}` で参照
- ビルドが抜粋を差し込み、**CI がマーカーの存在と埋め込みの鮮度を検査**する

これで解説とコードの乖離が構造的に起きない。

### 7.3 注釈付きソースビューア

docco 系のツール(または小さな自作スクリプト)で、コメントとコードを左右に並べた
静的 HTML を全モジュール分自動生成し、GitHub Pages で公開する
(underscore.js の annotated source の形式)。ソースが更新されれば自動で追随する。

### 7.4 実行できる教材

- `examples/` に**段階的に組み立てる縮小実装**を置く:
  「50行で太陽位置」「100行で月齢」「正弦項を3つだけ使った月位置」など、
  本体と同じ規約・同じテスト参照値を使う小さな写経用コード
- 各ガイド章にブラウザでそのまま動くデモページ(v3 の `test/` デモの後継)を対応
  させる。import 1行で本体モジュールを呼ぶため、教材と本体の API が常に一致する

### 7.5 配布形態

| 成果物 | 内容 | コメント |
|---|---|---|
| `orb`(npm) | ESM(未 minify)+ `.d.ts` | **保持**(そのまま教材) |
| `orb.min.js` | script タグ用 IIFE | 除去 |
| annotated source(Pages) | §7.3 の生成物 | 整形表示 |
| `docs/guide/` | 章立て解説(ja/en) | — |

npm 配布のデフォルトを「コメント保持の未 minify ESM」にするのがポイント。
バンドラ利用者は自分のビルドで minify するので実害がなく、`node_modules` を
開いた人がそのまま教材に出会う。

## 8. リポジトリ構成

```
src/
  time/       instant.js, scales.js, sidereal.js
  math/       vec3.js, angles.js, kepler.js
  frames/     frames.js, precession.js, nutation.js, geodetic.js
  bodies/     sun.js, moon.js, mercury.js ... neptune.js, data/(生成物)
  sgp4/       propagation.js(v3 から搬入), tle.js, omm.js
  observer/   observer.js, lighttime.js, aberration.js, refraction.js
  events/     riseset.js, phases.js, passes.js
  compat/     v3.js(旧 API シム)
docs/
  guide/      教材章(ja/en)、snippet 参照で本体ソースを引用
examples/     段階的縮小実装+ブラウザデモ
tools/        vsop-compile.js, annotate.js(注釈付きソース生成),
              snippets.js(抜粋差し込み+CI 検査), reference-gen/
test/         参照値テスト・プロパティテスト・v3 等価性テスト
```

## 9. マイルストーン

教材は「あとで書く」と書かれないため、各マイルストーンに組み込む。

| M | 実装 | 教材(同時並行) | 完了条件 |
|---|---|---|---|
| M1 | time + math + frames | ガイド1章・2章、snippet 基盤、注釈ビューア | 参照値・往復テスト green、v3 との差分説明 |
| M2 | bodies(VSOP コンパイラ+月+太陽導出) | ガイド3章、「50行で太陽位置」 | v3 と数値照合(差分=既知の改善のみ) |
| M3 | observer(光行時間差・光行差・視差・大気差) | ガイド5章 | Horizons 測心値との照合で v3 超え |
| M4 | SGP4 搬入+events | ガイド4章・6章、パス予測デモ | python-sgp4 一致、パス予測の実測比較 |
| M5 | compat シム・ベンチマーク・リリース準備 | ガイド全章校正、Pages 公開 | v4.0-alpha 公開 |

## 10. 決定事項と保留事項

**決定(この文書の合意事項)**

- 基本方針は §1〜§6 のとおり(オーナー承認済み: 2026-07-19)
- Educational 版は「別コピー」ではなく「source as textbook」方式(§7)

**推奨として提示済み・実装開始までに確定したいもの**

| 論点 | 推奨 | 理由 |
|---|---|---|
| ソース言語 | JS + JSDoc(TS はしない) | ポリシー・教育目標との整合 |
| 赤経の単位 | API は度、`hms()`/`dms()` フォーマッタ | 単位事故の根絶 |
| VSOP 精度 | 縮約版デフォルト+フルはオプトイン | ブラウザ第一 |
| events | v4.0 に含める | 本命機能・コアの実地テスト |
| 観測者の標高 | メートル | v3 の km は事故源 |
| ガイドの言語 | 日本語を正、英語を追随 | 想定読者と保守者 |

## 11. v3 互換と移行

- v3 ブランチはフリーズ(バグ修正のみ)。2026-07 のレビューブランチの修正を
  取り込んだ状態を凍結点とする。
- `orb/compat` に旧クラス API(`new Orb.Luna().radec(date)` 等)を新コア上で
  再実装したシムを提供。値の差は §6 の等価性テストで「説明済みの改善」に限定する。
- 移行ガイドは v3 の usage の「挙動変更」節の形式を踏襲する。
