# Orb.js ES6 Migration (/dist/orb.min.js)

<script src="/dist/orb.min.js"></script>

<script>
  const date = new Date();
  const time = new Orb.Time(date);
  const time_in_day = time.time_in_day();
  results(".time_in_day",`time in day: ${time_in_day}`);
  const jd = time.jd()
  results(".jd",`JD: ${jd}`);
</script>

<pre class="time_in_day"></pre>
<pre class="jd"></pre>
