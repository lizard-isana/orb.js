# orb.js（v2）- JavaScript library for astronomical calculations

**orb.jsはJavaScriptで手軽に天体の位置計算を行うことを目的としたライブラリです。**  
**※v1とv2ではメソッドや引数に大幅な修正が入っているため互換性がありません。くれぐれもご注意ください。**
- 8惑星(VSOP87)および月・太陽位置
- ケプラー軌道要素からの天体位置
- 2行軌道要素からの人工衛星位置(SGP4)
- 時刻系変換(GMST/ユリウス日/年通日 等)
- 座標変換(赤道座標/黄道座標/地平座標 等)

## スクリプト

### Main
**orb.v2.js**:  
すべての関数が含まれた全部入りバージョンです

**orb-core.v2.js**:  
orb.v2.jsから各関数が依存している関数だけを抜き出したもの。以下のorb-satellite.v2.jsやorb-planetary.v2.jsはこのファイルに依存します。

**orb-satellite.v2.js**:  
orb.v2.jsから人工衛星の計算に必要な関数を抜き出したもの。"orb-core.v2.js"と同時に使う必要があります。

**orb-planetary.v2.js**:  
orb.v2.jsから太陽系内天体(惑星・太陽・月)の計算に必要な関数を抜き出したもの。"orb-core.v2.js"と同時に使う必要があります。

### Supplemental
**orb-data-handler.js**  
外部ファイルを非同期通信で読み込むための関数です。"Orb."のプリフィックスがついていますが、orb.v2.jsと依存関係はありません。

**orb-date-handler.js**  
文字列と日付を相互変換するための関数です。"Orb."のプリフィックスがついていますが、orb.v2.jsと依存関係はありません。



## Examples

    var date = new Date();

    // 惑星位置
    var mars = new Orb.VSOP("Mars");
    var rectangular = mars.xyz(date); // ecliptic rectangular coordinates(x, y, z)
    var spherical = mars.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    // 月位置
    var luna = new Orb.Luna();
    var rectangular = luna.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
    var spherical = luna.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    // 太陽視位置
    var sun = new Orb.Sun();
    var rectangular = sun.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
    var spherical = sun.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    //ケプラー軌道要素から太陽系内天体の位置
    var asteroid = new Orb.Kepler({
      "gm": 2.9591220828559093*Math.pow(10,-4); //au^3/d^2 中心天体が太陽の場合は省略可
      "eccentricity":"0.08728849329001058",
      "inclination":"6.812676631845272",
      "longitude_of_ascending_node":"250.5660658100269",
      "argument_of_periapsis":"95.63473165761138",
      "time_of_periapsis":"2456918.756066796",
      "semi_major_axis":"1.001911878091084"
    });
    var rectangular = asteroid.xyz(date); // ecliptic rectangular coordinates(x, y, z)
    var spherical = asteroid.radec(date); // equatorial spherical coordinates(ra, dec, distance)

    //二行軌道要素から人工衛星の位置
    var tle = {
      first_line:"1 25544U 98067A   15012.59173611  .00014829  00000-0  23845-3 0  7179",
      second_line:"2 25544 051.6466 140.7335 0006107 243.2909 291.5211 15.53213268923827"
    }
    var satellite = new Orb.SGP4(tle);
    var rectangular = satellite.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
    var spherical = satellite.latlng(date); // geographic spherical coordinates(latitude, longitude, altitude)

    //方位、高度の計算
    var your_location = {
      "latitude":35.658,
      "longitude":139.741,
      "altitude":0
    }

    var observe_mars = new Orb.Observation({"observer":your_location,"target":mars});
    var horizontal = observe_mars.azel(date); // horizontal coordinates(azimuth, elevation)

    var observe_satellite = new Orb.Observation({"observer":your_location,"target":satellite});
    var horizontal = observe_satellite.azel(date); // horizontal coordinates(azimuth, elevation)

    var sirius = {
      "ra":6.75257,
      "dec":-16.7131,
      "distance":543300
    }

    var observe_star = new Orb.Observation({
      "observer":your_location ,
      "target":sirius
    });
    var horizontal = observe_star.azel(date); // horizontal coordinates(azimuth, elevation)

    //時刻変換
    var time = new Orb.Time(date);
    var gmst = time.gmst();
    var julian_date = time.jd();
    var time_in_day = time.time_in_day();
    var day_of_year = time.doy();

    //座標変換
    var equatorial_rectangular = Orb.RadecToXYZ(sirius)
    var ecliptic_rectangular = Orb.EquatorialToEcliptic({"date":date,"equatorial":equatorial_rectangular})
    var equatorial_rectangular = Orb.EclipticToEquatorial({"date":date,"ecliptic":ecliptic_rectangular})
    var equatorial_spherical = Orb.XYZtoRadec(equatorial_rectangular)


## orb-planetary.v2.js

### 惑星の位置(Orb.VSOP)
惑星の位置の計算アルゴリズムにはVSOP87(VSOP87A)を使っています。出力されるのはJ2000.0を分点とする日心黄道直交座標です。

まず惑星名を指定して初期化します。

    var mars = new Orb.VSOP["Mars"]

これは以下のように書いても同じです

    var mars = new Mars()

惑星名の指定には以下のキーワードが使えます。頭文字が大文字であることに注意してください。
["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"]

メソッドにDateを渡して位置を計算します。以下の例ではxyz()に渡して黄道直交座標を計算しています。

    var rectangular = mars.xyz(date);

返り値は以下のようになります。coordinate_keywords、unit_keywordsは、orb.jsがこれらの値が再利用された際に座標系を識別するために付加したキーワードです。→ 詳しくは「座標系と単位系の識別」を参照してください。

    rectangular = {
      "x":<Number>,
      "y":<Number>,
      "z":<Number>,
      "date":<Date>,
      "coordinate_keywords":"ecliptic rectangular",
      "unit_keywords":"au"
    }

赤道座標の場合は radec()を使います。赤経の単位が時(hour)であることに注意してください

    var spherical = mars.radec(date);

    spherical = {
      "ra":<Number>
      "dec":<Number>,
      "distance":<Number>,
      "date":<Date>,
      "coordinate_keywords":"equatorial spherical",
      "unit_keywords":"hour degree au"
    };


### 月の位置(Orb.Luna)
地球から見た月の位置を計算します。

    var luna = new Orb.Luna();
    var rectangular = luna.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
    var spherical = luna.radec(date); // equatorial spherical coordinates(ra, dec, distance)

### 太陽の視位置（Orb.Sun）
地球から見た太陽の位置を計算します。xyz()の戻り値が地心赤道座標であることに注意してください。

    var sun = new Orb.Sun();
    var rectangular = sun.xyz(date); // x, y, z -> equatorial rectangular coordinates (Earth centered)
    var spherical = sun.radec(date); // ra, dec, distance -> equatorial coordinates

### ケプラー軌道要素による太陽系内天体の位置(Orb.Kepler)

    var asteroid = new Orb.Kepler({
      "gm": 2.9591220828559093*Math.pow(10,-4); //au^3/d^2 中心天体が太陽の場合は省略可
      "eccentricity":"0.08728849329001058",
      "inclination":"6.812676631845272",
      "longitude_of_ascending_node":"250.5660658100269",
      "argument_of_periapsis":"95.63473165761138",
      "time_of_periapsis":"2456918.756066796",
      "semi_major_axis":"1.001911878091084"
    });
    var rectangular = asteroid.xyz(date); // x, y, z -> ecliptic rectangular coordinates
    var spherical = asteroid.radec(date); // ra, dec, distance -> equatorial spherical coordinates


## orb-satelite.v2.js

### 二行軌道要素による人工衛星の位置(Orb.SGP4)
2行軌道要素(TLE)から地球周回軌道の人工衛星の位置を計算します。

TLEを以下のようにオブジェクトとしてOrb.SGP4()に渡して初期化します。

    var tle = {
      first_line:"1 25544U 98067A   15012.59173611  .00014829  00000-0  23845-3 0  7179",
      second_line:"2 25544 051.6466 140.7335 0006107 243.2909 291.5211 15.53213268923827"
    }
    var satellite = new Orb.SGP4(tle);

これは以下のように書いても同じです

    var satellite = new Orb.Satellite(tle);

Dateをメソッドに渡して位置を計算します。以下の例ではxyz()で地心直交座標で計算します。

    var date = new Date();
    var rectangular = satellite.xyz(date);

    //返り値
    rectangular = {
     "x":<Number>,
     "y":<Number>,
     "z":<Number>,
     "xdot":<Number>,
     "ydot":<Number>,
     "zdot":<Number>,
     "date":<Date>,
     "coordinate_keywords":"geographic rectangular",
     "unit_keywords":"km km/s"
    }

地理座標（緯度経度）を計算する場合は以下のようにlatlng()を使います。

    var spherical = satellite.latlng(date);

    //返り値
    spherical = {
     "latitude":<Number>,
     "longitude":<Number>,
     "distance":<Number>,
     "date":<Date>,
     "coordinate_keywords":"geographic spherical",
     "unit_keywords":"degree km"]
    }

## orb-core.v2.js

### 地平座標への変換(Orb.Observation)

観測者（observer）と観測対象（target）を指定して地平座標を計算します

    var mars = new Orb.VSOP["Mars"]

    var your_location = {
      "latitude":35.658,
      "longitude":139.741,
      "altitude":0
    }

    var observe_mars = new Orb.Observation({"observer":your_location,"target":mars});
    var horizontal = observe_mars.azel(date); // azimuth, elevation -> horizontal coordinates

人工衛星の場合も同じです

    var tle = {
      first_line:"1 25544U 98067A   15012.59173611  .00014829  00000-0  23845-3 0  7179",
      second_line:"2 25544 051.6466 140.7335 0006107 243.2909 291.5211 15.53213268923827"
    }
    var satellite = new Orb.SGP4(tle);

    var observe_satellite = new Orb.Observation({"observer":your_location,"target":satellite});
    var horizontal = observe_satellite.azel(date); // azimuth, elevation -> horizontal coordinates

恒星などの視位置を計算する場合に、赤道座標を直接指定しても計算できます。

    var observe_star = new Orb.Observation({
      "observer":your_location ,
      "target":{"ra":0,"dec":0}
    });

    var horizontal = observe_star.azel(date); // azimuth, elevation


Orb.Observationは、地理座標で指定されたobserverに対して、任意のターゲットを指定すると、ターゲットに応じて位置を計算して変換してから地平座標を計算して返します。Orb.Observationに渡せるオブジェクトは以下のとおりです。

    Orb.VSOPオブジェクト
      var target = new Orb.VSOP["Mars"]

    Orb.SPG4オブジェクト
      var target = new Orb.SGP4(tle)

    Orb.Sunオブジェクト
      var target = new Orb.Sun()

    Orb.Lunaオブジェクト
      var target = new Orb.Luna()

    赤道球面座標の固定値(distance,coordinate_keywords,unit_keywordsは省略可)
      var target = {
        "ra":0,"dec":0,"distance":0,
        "coordinate_keywords":"equatorial spherical",
        "unit_keywords":"hour degree km"
      }

    直交座標の固定値(coordinate_keywords,unit_keywordsは省略可)
      var target = {
        "x":0,"y":0,"z":0,
        "coordinate_keywords":"equatorial rectangular", //or "ecliptic rectangular"
        "unit_keywords":"km" //or "au"
      }
    coordinate_keywordsを省略すると、赤道直交座標とみなして地平座標を計算します。  
    coordinate_keywordsに"ecliptic"が入っていると、黄道直交座標とみなして、赤道直交座標に変換してから計算します。

  戻り値の距離の単位はターゲットの距離単位に揃えられます。


### 時刻の計算(Orb.Time)
天文計算に必要な各種の時刻の計算を行います。

まず、Dateを渡して初期化します。

    var date = new Date();
    var time = new Orb.Time(date);

グリニッジ恒星時（GMST）

    var gmst = time.gmst();

ユリウス日

    var julian_date = time.jd();

日の単位で表した時間（12時=0.5日）

    var time_in_day = time.time_in_day();

1月1日からの通日

    var day_of_year = time.doy();

なお、以下の実際の位置計算では、通常のDate（Date）を受け取ることに注意してください。
orb.jsの各メソッドはDateを受け取り、内部的にこの関数を使って日付を変換しています。

### 座標変換
天文計算に必要な各種の時刻の計算を行います。

#### 赤道球面座標から赤道直交座標（Orb.RadecToXYZ）
赤道球面座標(RA,Dec)から赤道直交座標(x,y,z)に変換します。

    var sirius = {
      ra:6.75257,
      dec:-16.7131,
      distance:543300
    }
    var xyz = Orb.RadecToXYZ(sirius) // return Equatorial Rectangular

#### 赤道（黄道）直交座標から赤道球面座標（Orb.XYZtoRadec）
直交座標(x,y,z)から赤道球面座標(RA,Dec)に変換します。デフォルトでは入力値を赤道直交座標とみなします。

    var sirius = {
      "x": -101858.45670898016,
      "y": 406051.12168323726,
      "z": -346297.893982406
    }
    var radec = Orb.XYZtoRadec(xyz) // return Equatorial Spherical

位置情報に"ecliptic"を含む"coordinate_keywords"が入っていると、黄道座標から赤道座標への変換を行ってから球面座標に変換します。
→"coordinate_keywords"については「座標系と単位系の識別」を参照してください。

    var sirius = {
      "x": -101858.45670898016,
      "y": 406051.12168323726,
      "z": -346297.893982406,
      "date":new Date(),
      "coorinate_keywords":"ecliptic rectangular"
    }

    var radec = Orb.XYZtoRadec(sirius)

日付を指定しているのは、座標の変換時に黄道傾斜角の変化を考慮に入れているからですが、変動はごく僅か(年に0.01度程度)なので直近の大雑把な位置が知りたいだけなら省略しても問題ありません。"date"を省略すると、現在の位置とみなして計算します。上記の例では省略しても値は変わりません。

#### 赤道直交座標から黄道直交座標（Orb.EquatorialToEcliptic）
赤道直交座標(x,y,z)から黄道直交座標(x,y,z)に変換します

    var sirius = {
      "x": -101858.45670898016,
      "y": 406051.12168323726,
      "z": -346297.893982406
    }
    var ecliptic = Orb.EquatorialToEcliptic({
      "equatorial": sirius,
      "date":date
    })

なお、位置情報に"coordinate_keywords"や"date"が付加されていても無視され、渡された座標を渡された日付の赤道直交座標とみなして変換します。

#### 黄道直交座標から赤道直交座標（Orb.EclipticToEquatorial）
黄道直交座標(x,y,z)から赤道直交座標(x,y,z)に変換します

     var sirius = {
       "x":-101858.45670898016,
       "y":510282.46985869075,
       "z":-156241.94619812947
     }
    var equatorial = Orb.EclipticToEquatorial({
      "ecliptic": sirius,
      "date":date
    })

なお、位置情報に"coordinate_keywords"や"date"が付加されていても無視され、渡された座標を渡された日付の黄道直交座標とみなして変換します。


## 対象天体による直交座標の違い
  orb.jsのメソッド名は出力する値を元につけられています。たとえばxyz()は、x,y,zのベクトルを返し、radec()は赤経(ra),赤緯(dec)を返し、azel()は方位角(azimuth)と高度(elevation)を返します。

  そのため、天体の位置を返すメソッドのうち、直交座標を返すxyz()は、関数によって返す値の内容と単位が変わります。基本的に太陽が中心の場合は日心黄道直交座標を返し、地球が中心の場合は地心赤道直交座標を返します。

  そのままでは帰ってきた値がどの座標系に基づくものかが分からないので、orb.jsは出力に座標系と単位系を表すキーワード"coordinate_keywords"と"unit_keywords"を付加します。→「座標系と単位系の識別」を参照してください。

  なお、radec()は常に赤道球面座標を、latlng()は常に地理座標を、azel()は常に地平座標を返します。

### 太陽系内天体（Orb.VSOP, Orb.Kepler）

    object.xyz(date)  // 日心黄道直交座標 x, y, z (au)
    object.radec(date)  // 地心赤道球面座標 ra, dec, distance (degree, hour, au)

Orb.Kepler(ケプラー軌道要素による位置計算)は重力定数(gm)を省略すると日心黄道座標を返しますが、任意の重力定数を指定するとそれに準じた値を返します。その場合も、radec()は直交座標を日心直交座標とみなして値を返します（無意味な数字です）。

### 太陽（Orb.Sun）

    object.xyz(date) ///地心赤道直交座標 x, y, z (au)
    object.radec(date)  // 地心赤道球面座標 ra, dec, distance (degree, hour, au)

### 地球近傍天体（Orb.Luna, Orb.SGP4）

    object.xyz(date) ///地心赤道直交座標 x, y, z (km)
    object.latlng(date) //地理座標 latitude, longitude, distance (degree, km)

### 視位置（Orb.Observation）

    object.azel(date) //地平座標 azimuth, elevation, distance (degree, au or km)

## 座標系と単位系の識別
  orb.jsは出力する位置情報に以下の座標系と単位系のキーワードを付加します。

    coorinate_keywords = ["geographic","ecliptic","equatorial","horizontal","rectangular","spherical"]
    unit_keywords = ["degree","hour",rad","km","au","km/s","au/d"]

　たとえば、Orb.VSOP(惑星位置)のデフォルトは座標系が黄道直交座標、単位が天文単位なので

    coorinate_keywords = "ecliptic rectangular";
    unit_keywords = "au"

　というキーワードが付加されます。

  orb.jsは、このキーワードを参照し、必要に応じて値を変換してから必要な計算を行います。orb.jsが出力する値をそのまま使っている場合は意識する必要はありませんが、手作業で座標系の変換を行った場合に、実際の内容と異なるキーワードが付けられていると、正しい値が出力されない場合があります。
  具体的には、Orb.XYXtoRadecとOrb.Observationで入力された直交座標に対してキーワードによる黄道座標/赤道座標の判別をしています。

## Supplemental

### orb-data-handler.js

#### Orb.DataLoader()

    var data = Orb.DataLoader({
      format:"text", // or "json" or "xml"
      path: <path_to_data>,
      id:"id",
      ajax:true, // or "false"
      callback:function(data,id){
      // do something
      }
    })

### orb-date-handler.js

#### Orb.DigitsToDate()

    var date = Orb.DigitsToDate("20170101120000"); // return date object 2017.01.01 12:00:00 UTC

#### Orb.DateToDigits()

    var date = new Date();
    date.setTime(Date.UTC(2017,0,1,12,0,0))    
    var digits = Orb.DateToDigits(date); //return "20170101120000"

#### Orb.StringToDate()

    var str = "2017-01-01T12:00:00"    
    //date separator should be "." or "-", time and date separator should be " " or "T" and time separator should be ":"

    var date = Orb.StringToDate(str)

#### Orb.FormatUTCDate()

    var date = new Date();
    date.setTime(Date.UTC(2017,0,1,12,0,0))  
    var str = Orb.FormatUTCDate(date) // return "2017.01.01 12:00:00"

#### Orb.FormatLocalDate()

    var date = new Date();
    date.setTime(Date.UTC(2017,0,1,12,0,0))  
    var str = Orb.FormatUTCDate(date) // return "2017.01.01 21:00:00" in timezone GMT+9:00


## Reference
- Bretagnon, P.; Francou, G. "Planetary theories in rectangular and spherical variables - VSOP 87 solutions". Astronomy & Astrophysics,1988
- Jean Meeus. Astronomical Algorithms second edition. Willmann-Bell, 1999
- 長澤 工. 天体の位置計算 増補版. 地人書館, 1985

## License
 Copyright (c) 2012 Isana Kashiwai
 Dual licensed under the MIT (MIT-LICENSE) and GPL (GPL-LICENSE) licenses.

## Administrator
  Isana Kashiwai
  email: isana.k at gmail.com
