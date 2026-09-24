const thirdPartyBanner = `/*!
 * orb.js includes SGP4/SDP4 code ported from python-sgp4.
 * The MIT License (MIT)
 * Copyright © 2012–2016 Brandon Rhodes
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */`;

export default [
  {
    input: 'src/orb.es6.js',
    output: [
      {
        file: 'dist/orb.esm.js',
        format: 'es',
        sourcemap: true,
        banner: thirdPartyBanner
      },
      {
        file: 'dist/orb.esm.mjs',
        format: 'es',
        sourcemap: true,
        banner: thirdPartyBanner
      },
      {
        name: 'Orb',
        file: 'dist/orb.js',
        format: 'umd',
        sourcemap: true,
        banner: thirdPartyBanner
      }
    ]
  },
  {
    input: 'src/compatibility/index.js',
    output: {
      name: 'OrbCompatibility',
      file: 'dist/orb-compat.js',
      format: 'umd',
      sourcemap: true,
      banner: '/*! orb.js browser compatibility preflight */'
    }
  }
];
