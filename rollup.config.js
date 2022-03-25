import { babel }  from '@rollup/plugin-babel'
import { terser } from "rollup-plugin-terser";

export default {
  input:"src/orb.es6.js",
  output:[
    { 
      name:"Orb",
      file: "dist/orb.js",
      format: "umd",
      sourcemap: true,
    },
    { 
      name:"Orb",
      file: "dist/orb.min.js",
      format: "umd",
      plugins: [
        terser(),
      ],
    },
  ],
  plugins: [
    babel({
      babelHelpers: 'bundled'
    })
  ]
};