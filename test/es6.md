# Orb.js ES6 Migration Tests (/src/orb.js)

<script type="module">
  const display = function(selector,value){
    document.querySelector(selector).innerHTML = JSON.stringify(value, null, "  ");
  }

  import * as Orb from '/src/orb.es6.js';
  const date = new Date();
  const time = new Orb.Time(date);
  const time_in_day = time.time_in_day();
  const jd = time.jd()
  const gmst = time.gmst()
  const results = {
    "date":date,
    "time in day": time_in_day,
    "jd":jd,
    "gmst":gmst,
  }
  display(".results",results)
</script>

```JavaScript
const display = function(selector,value){
  document.querySelector(selector).innerHTML = JSON.stringify(value, null, "  ");
}
```

```JavaScript
import * as Orb from '/src/orb.js';
const date = new Date();
const time = new Orb.Time(date);
const time_in_day = time.time_in_day();
const jd = time.jd()
const results = {
  "date":date,
  "time in day": time_in_day,
  "jd":jd,
}
display(".results",results)
```
<pre class="results"></pre>
