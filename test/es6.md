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
      "radec":mars_radec
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