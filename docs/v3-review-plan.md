# orb.js v3 実装評価とリファクタリング計画

## 1. 目的と調査範囲

この文書は、v3 の数値計算と公開 API を安定化するための、実装前の評価と作業計画である。現在のチェックアウトには `v3` という ref はないため、`package.json` の `3.0.0`、README の v3 表記、および v3 への merge 履歴を根拠に、現在の `work` (`ceb147f`) を評価対象とした。

調査対象は次の通り。

- `src/` の時刻、座標系、VSOP87A、Kepler、SGP4/SDP4、観測者座標の実装
- `package.json`、Rollup/Babel、公開 export、生成済み `dist/`
- `test/smoke.js` と GitHub Actions のビルド/テスト経路
- README、日英の usage、過去の設計決定メモ

本計画ではソース、テスト、生成物の実装変更は行わない。

## 2. 現状評価

### 良い点

- 天文計算の領域別にモジュールが分割され、ESM の公開面も `src/orb.es6.js` に集約されている。
- SGP4 は TEME/GMST 1982、地球測地は WGS-84、暦表系列は TT という、フレームと時刻系の区別を意識した改善が入っている。
- SDP4 の deep-space 3 ケースと near-earth の参照ベクトル、月・太陽・視差など、外部参照値を使った smoke test がある。
- full VSOP87A を登録式の optional data とし、通常バンドルの大型化を避ける方針は妥当である。
- CI は Node 18/20/22 を対象に、ビルド、`dist/` の差分検査、smoke test を実行する。

### 確認できた問題

| 優先度 | 問題 | 影響 | 完了条件 |
| --- | --- | --- | --- |
| P0 | クリーンな checkout の `npm test` は Alpha-5 を含む 2 件で失敗する。ビルド後は Alpha-5 は通るが、VSOP/Sun の RA 差 0.3717 度が残る。 | リリース物が source と不整合で、CI も失敗する。また座標フレーム不整合が数値結果に現れている。 | クリーン checkout と build 後の両方で同一の test suite が通り、`git diff --exit-code dist/` も通る。 |
| P0 | J2000 黄道座標からの変換で、地球座標の差し引き、赤道面への回転、歳差の適用箇所が API 間で一貫しない。`EclipticToEquatorial` は入力 keyword が J2000 でも date の黄道傾角で回転する一方、別に `...J2000` / `...OfDate` が存在する。 | 黄道/赤道、地心/日心、J2000/of-date が暗黙に混在し、約 26 年分の歳差に相当する誤差が出る。 | フレーム変換表と参照パイプラインを定義し、Sun/VSOP/Kepler の交差検証と J2000/of-date の固定参照値が通る。 |
| P0 | `orb-kepler.js` に `EllipticalOrbit` が完全に重複している。過去に削除した履歴があるのに再発しており、global `Math` polyfill も再発している。 | merge で修正済み不具合が戻った可能性が高く、今後の修正信頼性も低い。 | 重複と global mutation を排除し、回帰テスト/静的検査で再発を防ぐ。 |
| P1 | 公開座標オブジェクトが `coordinate_keywords` / `unit_keywords` という自由文字列に依存し、無い場合に `.match()` で例外となる経路もある。不明な単位はゼロや空文字に暗黙変換される。 | 入力ミスが NaN、単位違い、TypeError のいずれかとなり、原因を特定しづらい。 | バリデーション境界を一箇所に集約し、旧形式との互換層を通して明示的な frame/origin/epoch/unit に正規化する。 |
| P1 | `Time` が UTC、UT1、TAI、TT の近似を一クラスに抱え、現在の leap-second table と `delta_t()` の前提もコード内に固定されている。`orb-time` ↔ `orb-obliquity` の circular dependency も build 警告になる。さらに VSOP evaluator は Earth だけ `jd_tt()`、惑星は `jd()` を使う。 | 時刻系の前提が関数名から分からず、暦表計算が不統一である。 | 依存方向を非循環化し、全暦表系列で TT、地球回転で UT1 というポリシーを API 名、実装、テストで一致させる。 |
| P1 | `Observation` の WGS-84 観測者座標は高度を長半径に先に加え、その値に扁平率係数を掛けるため、標準的な `(N+h) cos φ`, `(N(1-e²)+h) sin φ` と異なる。屈折も適用範囲を制限していない。 | 高所の観測者座標と地平線下の大気差に誤差/特異値が出る。 | WGS-84 基準値と大気差の有効範囲を決め、極、赤道、高度、地平線前後をテストする。 |
| P1 | Kepler solver は最大 100,000〜1,000,000 回で打ち切ってもエラーにせず値を返し、必須要素、離心率、距離、`gm` の検証もない。`Cartesian` にも円軌道・赤道軌道の特異点がある。 | 不正入力や e ≈ 1 で、遅い処理の後に NaN または不正値が返る。 | 入力契約、収束条件、最大反復数、失敗時の挙動を定義し、楕円/放物/双曲線と特異ケースを参照実装と照合する。 |
| P2 | スタイルは semicolon、`var`/`let`/`const`、命名、class field arrow と prototype method の方針が混在する。`Earth.radec()` は公開されながら常に `null` で、`SphericalToRectangler` など typo を含む API もある。 | 保守性が低く、暗黙の API 互換性を壊しやすい。 | lint/format を差分最小で導入し、公開 API inventory に基づいて deprecation と次 major での削除を分ける。 |
| P2 | テストは 1 本の custom smoke runner で、数値の許容誤差、参照値の出典/生成方法、source と dist のどちらを検査するかが統一されていない。 | 回帰原因の局所化、許容誤差の妥当性判断、生成物の整合確認が難しい。 | 領域別の unit/reference/contract/package test に分割し、出典、フレーム、時刻系、単位、許容誤差を fixture ごとに記録する。 |
| P2 | リポジトリ直下に作業用 patch が残り、`old/` に過去版が同居する。現行実装と誤認しやすい。 | レビュー、検索、パッケージ管理のノイズとなる。 | patch を削除し、過去版は tag/release へ委ねるか、保存理由と非対象範囲を明記する。 |

## 3. リファクタリング原則

1. **正しさを先に固定する。** スタイル変更より前に参照値、座標系、時刻系、単位を test fixture にする。
2. **v3 の同期 API を維持する。** 既存の constructor、メソッド名、戻り値は、明らかに誤った数値以外は互換層で保つ。破壊的な型変更は別の major 計画に分離する。
3. **変換は純粋関数にする。** 「時刻」「座標」「物理モデル」「入出力互換」を分離し、暗黙の `new Date()` や global mutation を core calculation から外す。
4. **内部表現は明示的に、外部表現は互換的にする。** 内部では `{frame, origin, epoch, unit, position, velocity, date}` 相当の一意な表現を使い、旧 keyword 文字列は adapter で読み書きする。
5. **大規模整形と数値修正を同じ PR に混ぜない。** 各 PR は独立した参照テスと migration note を持つ。
6. **optional data と同期 API を守る。** full VSOP87A を default bundle に取り込まず、入出力を async 化しない。

## 4. 実装フェーズ

### Phase 0: 基準線と API 契約の固定（P0）

- 実際の v3 ref/commit をリモート上で確認し、本評価の差分を再確認する。
- 公開 export、constructor、method、入出力フィールド、単位、フレームを machine-readable な inventory と contract test にする。
- test を source correctness と packaged artifact correctness に分ける。build 前に source test、build 後に CJS/ESM/UMD export test と `dist/` 同期検査を行う。
- VSOP/Sun 失敗を xfail にせず、最小の回帰ケースとして固定する。

### Phase 1: 座標・時刻系の正しさ（P0）

- 太陽系パイプラインの基準を「VSOP87A heliocentric ecliptic J2000 + TT → geocentric ecliptic J2000 → equatorial J2000 → precession/nutation → apparent of-date」のように、各段の前提とともに決定する。
- 「地心化」と「黄道面/赤道面の回転」と「歳差/章動」を別の純粋関数に分解し、関数名と戻り値に frame を反映する。
- Earth と他惑星の VSOP evaluator を共通化し、TT 引数を一回だけ計算する。Sun/planet/Kepler の公開 API には従来形式への adapter を残す。
- JPL/Horizons 等の出典を fixture metadata に保存し、J2000、現在日、過去/未来日で角度と距離を検証する。

### Phase 2: 入力正規化と観測座標（P1）

- Date、数値、単位、frame、origin、epoch の parser/validator を追加し、公開 API の入口でのみ旧 keyword を正規化する。
- Observation の RA/Dec、equatorial/ecliptic rectangular、TEME を明示的な dispatch に置き換え、支持外入力は説明的な例外にする。
- WGS-84 geodetic → ECEF/ECI を標準式に分離し、大気差はモデル名、適用範囲、適用有無を明示する。
- 単位の往復変換、座標変換の round-trip、既知の観測地を property/reference test にする。

### Phase 3: Kepler/SGP4 の頑健性（P1）

- Kepler の重複実装と global mutation を除去し、solver を軌道種別ごとの小さな純粋関数へ分割する。
- 有限値、物理的範囲、必須要素を先に検査し、収束しない場合は制限回数で明示的に失敗させる。e=0、e≈1、e=1、e>1、赤道/極軌道の fixture を追加する。
- TLE/OMM parsing と propagation を分離し、行長、文字種、checksum、Alpha-5、epoch を parser 単体テストにする。
- SGP4/SDP4 は Vallado 参照ケースを増やし、TEME から地球固定/観測座標までの統合テストを行う。

### Phase 4: 保守性、package、文書（P2）

- ESLint/Prettier 相当の最小ルールを導入し、まず未使用変数、重複 class member、暗黙 global、未到達/常に null の API を検出する。format-only PR は数値変更と分ける。
- circular dependency を解消し、ESM/CJS/browser の export map と optional VSOP subpath を package tarball から検査する。
- 互換 alias、deprecated API、精度別の保証範囲を日英で同期し、すべての参照値に出典と許容誤差の根拠を書く。
- patch や過去版の保存方針を決め、npm tarball のファイル一覧/サイズを CI で監視する。

## 5. PR の分割案

1. **test: establish v3 source/package baselines** — test runner 分割、API inventory、既知失敗の回帰テスト。
2. **fix: make ecliptic/equatorial epoch transforms explicit** — 座標変換と VSOP/Sun 不整合の修正。
3. **refactor: unify ephemeris evaluation on TT** — Earth/planet evaluator 共通化と時刻依存の非循環化。
4. **refactor: normalize coordinate metadata at API boundaries** — 新内部表現と v3 compatibility adapter。
5. **fix: correct WGS-84 observer and refraction handling** — geodetic/reference tests 付き。
6. **refactor: harden Kepler solvers without global mutation** — 重複排除、入力/収束契約、特異点対応。
7. **refactor: isolate and validate TLE/OMM parsing** — Alpha-5/checksum/epoch と propagation の分離。
8. **chore: enforce style, package, and repository hygiene** — lint、tarball test、不要ファイル方針、日英文書同期。

座標系の修正と API 正規化はレビュー負荷と回帰リスクが大きいため、同じ PR にまとめない。各 PR で source test → build → package test → `dist/` 同期の順に検証する。

## 6. 共通の検証ゲート

各フェーズの完了条件に次を含める。

- Node 18/20/22 で unit/reference/contract test がすべて成功する。
- `npm run build` 後に `git diff --exit-code dist/` が成功する。
- `npm pack --dry-run` の内容とサイズが許容範囲内で、CJS/ESM/browser と optional VSOP subpath を tarball から load できる。
- 公開 API inventory に意図しない差分がない。意図した数値変更は migration note と before/after の参照誤差を持つ。
- 天文参照 fixture は出典、参照座標系、時刻系、単位、生成手順、許容誤差を記録する。
- default bundle に full VSOP87A data が混入せず、同期 API が維持される。

## 7. 実装前に決める事項

1. `EclipticToEquatorial` の v3 互換挙動を正すか、新しい明示 API を追加して deprecated にするか。
2. 公開座標メタデータを当面は文字列で維持するか、構造化フィールドも併記するか。
3. 明らかに誤った結果を「互換性より正しさを優先する v3 patch」としてどこまで変更するか。
4. Earth `radec()`, typo 付き method、`gmst()` alias などの deprecated/未実装 API を v3 でどこまで残すか。
5. UT1 に UTC を代用する現在の精度レベルで良いか、DUT1 の任意入力を追加するか。

これらの決定と Phase 0 の契約固定が終わるまで、大規模なクラス再編や format-only 変更に着手しない。
