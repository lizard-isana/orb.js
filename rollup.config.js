import { babel }  from '@rollup/plugin-babel'
import { terser } from "rollup-plugin-terser";

export default {
  input:"src/orb.js",
  output:[
    { 
      name:"Orb",
      file: "dist/orb.js",
      format: "umd",
      sourcemap: "inline",
    },
    { 
      name:"Orb",
      file: "dist/orb.min.js",
      format: "umd",
      sourcemap: "inline",
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