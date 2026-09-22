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

## VSOP87A generation and verification

The original CDS VI/81 VSOP87A distribution files are vendored in
`tools/data/vsop87/`. Verify their checksums, parse every coefficient, and
confirm that the committed optional-full modules are byte-for-byte
reproducible with:

```sh
npm run vsop:check
```

To regenerate `src/vsop87a/*.js` from those inputs, run:

```sh
npm run vsop:write
```

Both modes also report the sampled displacement between the existing legacy
short tables and the official full series over 1500–2500. The legacy tables
remain unchanged during v3.1 M0; selecting a new default precision is a later
numerical-model decision. The raw inputs and engineering tools are excluded
from the published npm package by the package allow-list.
