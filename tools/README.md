# Engineering tools

## Performance benchmark

Run the representative v3 throughput baseline with:

```sh
npm run bench
```

The default measurement window is 300 milliseconds per case. For a faster
smoke run or a longer local comparison, pass a duration in milliseconds:

```sh
npm run bench -- --duration=100
npm run bench -- --duration=1000
```

The benchmark is deliberately not a CI pass/fail gate. Node.js version,
machine load, and JIT state affect absolute throughput. Compare results from
the same machine and process setup, and treat order-of-magnitude changes as a
signal to investigate. The `relative` column compares only equivalent paths
measured in the same run; currently it records the cost of full versus short
Mars VSOP87A coefficients.
