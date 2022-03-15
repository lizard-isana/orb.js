# Orb.js ES6 Migration Tests (/dist/orb.min.js)

<script src="/dist/orb.min.js"></script>
<script>
  const display = function(selector,value){
    document.querySelector(selector).innerHTML = JSON.stringify(value, null, "  ");
  }
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
</script>

```HTML

<script src="/dist/orb.min.js"></script>

```

```JavaScript
const display = function(selector,value){
  document.querySelector(selector).innerHTML = JSON.stringify(value, null, "  ");
}
```

```JavaScript
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
