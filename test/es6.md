# Orb.js ES6 Migration Tests (/src/orb.js)

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
  const xyz = earth.xyz(date);
  const results_earth = {
    "xyz":xyz,
  }
  display(".results_earth",results_earth);
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
<pre class="results_earth"></pre>