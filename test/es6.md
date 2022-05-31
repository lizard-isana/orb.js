# Orb.js ES6 Migration Tests (/src/orb.es6.js)

<script type="module">
  const display = function(selector,value){
    document.querySelector(selector).innerHTML = JSON.stringify(value, null, "  ");
  }
  import * as Orb from '/src/orb.es6.js';
  const date = new Date();
  const time = new Orb.Time(date);
  const time_in_day = time.time_in_day();
  const jd = time.jd();
  const gmst = time.gmst();
  const delta_t = time.delta_t();
  const doy = time.doy()
  const results_time = {
    "date":date,
    "time in day": time_in_day,
    "jd":jd,
    "gmst":gmst,
    "delta_t":delta_t,
    "doy":doy,
  }
  var hours2hms = (hours) => {
    let sign = "";
    if (hours<0){
     sign = "-";
    }
    const hours_abs = Math.abs(hours);
    const hours_integer = Math.floor(hours_abs);
    const hours_fractional = hours_abs - hours_integer;
    const minutes = hours_fractional * 60;
    const minutes_integer = Math.floor(minutes);
    const minutes_fractional = minutes - minutes_integer;
    const seconds = minutes_fractional * 60;
    return `${sign}${hours_integer}h ${minutes_integer}m ${seconds.toFixed(2)}s`
  }
  var deg2dms = (deg) => {
    let sign = "";
    if (deg<0){
     sign = "-";
    }
    const deg_abs = Math.abs(deg);
    const deg_integer = Math.floor(deg_abs);
    const deg_fractional = deg_abs - deg_integer;
    const minutes = deg_fractional * 60;
    const minutes_integer = Math.floor(minutes);
    const minutes_fractional = minutes - minutes_integer;
    const seconds = minutes_fractional * 60;
    return `${sign}${deg_integer}° ${minutes_integer}′ ${seconds.toFixed(2)}″`
  }


  display(".results_time",results_time);
  const earth = new Orb.Earth();
  const earth_xyz = earth.xyz(date);
  const results_earth = {
    "xyz":earth_xyz,
  }
  display(".results_earth",results_earth);
  const mars = new Orb.Mars();
  //const mars = new Orb.Planet("Mars");
  const mars_xyz = mars.xyz(date);
  const mars_radec = mars.radec(date);
  const results_planets = {
    "Mars":{
      "xyz":mars_xyz,
      "radec":{
        ra:hours2hms(mars_radec.ra),
        dec:deg2dms(mars_radec.dec)
      }
    }
  }
  display(".results_planets",results_planets);
  var sun = new Orb.Sun();
  var sun_xyz = sun.xyz(date);
  var sun_radec = sun.radec(date);
  const results_sun = {
    "Sun":{
      "xyz":sun_xyz,
      "radec":sun_radec
    }
  }
  display(".results_sun",results_sun);
// Position of the moon
var luna = new Orb.Moon();
var luna_xyz = luna.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
var luna_radec = luna.radec(date); // equatorial spherical coordinates(ra, dec, distance)
  const results_moon = {
    "Moon":{
      "xyz":luna_xyz,
      "radec":luna_radec
    }
  }
  display(".results_moon",results_moon);

// Kepler orbital elements
var asteroid = new Orb.Kepler({
  "gm": 2.9591220828559093*Math.pow(10,-4), //(au^3/d^2) default value is the sun, so you can omit this line.
  "eccentricity":"0.08728849329001058",
  "inclination":"6.812676631845272",
  "longitude_of_ascending_node":"250.5660658100269",
  "argument_of_periapsis":"95.63473165761138",
  "time_of_periapsis":"2456918.756066796",
  "semi_major_axis":"1.001911878091084"
});

const results_asteroid = {
  "xyz":asteroid.xyz(date), // ecliptic rectangular coordinates(x, y, z, xdot, ydot, zdot)
  "radec":asteroid.radec(date) // equatorial spherical coordinates(ra, dec, distance)
}
display(".results_asteroid",results_asteroid);

var asteroid_elements = new Orb.CartesianToKeplerian(results_asteroid.xyz)
display(".asteroid_elements",asteroid_elements);

// Position of artificial satellites from Two Line Elements(TLE)
var tle = {
  first_line:"1 25544U 98067A   22102.31652132  .00008077  00000-0  14924-3 0  9995",
  second_line:"2 25544  51.6437 302.8427 0004455  14.2422 158.8889 15.50019435334962"
}
var satellite = new Orb.SGP4(tle);
const results_satellite = {
  "xyz":satellite.xyz(date),
  "latlng": satellite.latlng(date)
}
display(".results_satellite",results_satellite);

var your_location = {
  "latitude":35.658,
  "longitude":139.741,
  "altitude":0
}

var observe_mars = new Orb.Observation({"observer":your_location,"target":mars});
var mars_horizontal = observe_mars.azel(date); // horizontal coordinates(azimuth, elevation)

var observe_satellite = new Orb.Observation({"observer":your_location,"target":satellite});
var satellite_horizontal = observe_satellite.azel(date); // horizontal coordinates(azimuth, elevation)

const results_observation = {
  "mars horizontal": {
    output:mars_horizontal,
    azimuth:deg2dms(mars_horizontal.azimuth),
    elevation:deg2dms(mars_horizontal.elevation)
  },
  "satellite horizontal":{
    output:satellite_horizontal,
    azimuth:deg2dms(satellite_horizontal.azimuth),
    elevation:deg2dms(satellite_horizontal.elevation)
  },
}

display(".results_observation",results_observation);

</script>

## Preparation
```JavaScript
import * as Orb from '/src/orb.js';
const display = function(selector,value){
  document.querySelector(selector).innerHTML = JSON.stringify(value, null, "  ");
}
const date = new Date();
```

## Time
```JavaScript
const time = new Orb.Time(date);
const time_in_day = time.time_in_day();
const jd = time.jd()
const gmst = time.gmst()
const delta_t = time.delta_t();
const doy = time.doy()
const results = {
  "date":date,
  "time in day": time_in_day,
  "jd":jd,
  "gmst":gmst,
  "delta_t":delta_t,
  "doy":doy,
}
display(".results_time",results_time)
```
<pre class="results_time"></pre>

## Earth
```JavaScript
const earth = new Orb.Earth();
const xyz = earth.xyz(date);
const results_earth = {
  "xyz":xyz,
}
display(".results_earth",results_earth);
```
<pre class="results_earth"></pre>

## Planets
```JavaScript
const mars = new Orb.Mars();
//const mars = new Orb.Planet("Mars");
//const mars = new VSOP["Mars"];
const mars_xyz = mars.xyz(date);
const mars_radec = mars.radec(date);
const results_planets = {
  "Mars":{
    "xyz":mars_xyz,
    "radec":mars_radec
  }
}
```
<pre class="results_planets"></pre>

## Sun
```JavaScript
var sun = new Orb.Sun();
var sun_xyz = sun.xyz(date);
var sun_radec = sun.radec(date);
const results_sun = {
  "Sun":{
    "xyz":sun_xyz,
    "radec":sun_radec
  }
}
display(".results_sun",results_sun);
```
<pre class="results_sun"></pre>

## Moon
```JavaScript
var luna = new Orb.Moon();
var luna_xyz = luna.xyz(date); // Earth centered equatorial rectangular coordinates (x, y, z)
var luna_radec = luna.radec(date); // equatorial spherical coordinates(ra, dec, distance)
  const results_moon = {
    "Moon":{
      "xyz":luna_xyz,
      "radec":luna_radec
    }
  }
  display(".results_moon",results_moon);

```
<pre class="results_moon"></pre>


## Asteroid (Keplerian elements from/to Cartesian elements)
```JavaScript
// Kepler orbital elements
const asteroid = new Orb.Kepler({
  "gm": 2.9591220828559093*Math.pow(10,-4), //(au^3/d^2) default value is the sun, so you can omit this line.
  "eccentricity":"0.08728849329001058",
  "inclination":"6.812676631845272",
  "longitude_of_ascending_node":"250.5660658100269",
  "argument_of_periapsis":"95.63473165761138",
  "time_of_periapsis":"2456918.756066796",
  "semi_major_axis":"1.001911878091084"
});
const results_asteroid = {
  "xyz":asteroid.xyz(date), // ecliptic rectangular coordinates(x, y, z, xdot, ydot, zdot)
  "radec":asteroid.radec(date) // equatorial spherical coordinates(ra, dec, distance)
}
display(".results_asteroid",results_asteroid);

var asteroid_elements = new Orb.CartesianToKeplerian(results_asteroid.xyz)
display(".asteroid_elements",asteroid_elements);

```

<pre class="results_asteroid"></pre>

<pre class="asteroid_elements"></pre>

## Satellite

```JavaScript
// Position of artificial satellites from Two Line Elements(TLE)
var tle = {
  first_line:"1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015",
  second_line:"2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038"
}
var satellite = new Orb.SGP4(tle);
const results_satellite = {
  "xyz":satellite.xyz(date),
  "latlng": satellite.latlng(date)
}
display(".results_satellite",results_satellite);
```

<pre class="results_satellite"></pre>



## Observation

```JavaScript
var your_location = {
  "latitude":35.658,
  "longitude":139.741,
  "altitude":0
}

var observe_mars = new Orb.Observation({"observer":your_location,"target":mars});
var mars_horizontal = observe_mars.azel(date); // horizontal coordinates(azimuth, elevation)

var observe_satellite = new Orb.Observation({"observer":your_location,"target":satellite});
var satellite_horizontal = observe_satellite.azel(date); // horizontal coordinates(azimuth, elevation)

const results_observation = {
  "mars horizontal": {
    azimuth:deg2dms(mars_horizontal.azimuth),
    elevation:deg2dms(mars_horizontal.elevation)
    },
  "satellite horizontal": satellite_horizontal,
}

display(".results_observation",results_observation);

```
<pre class="results_observation"></pre>

