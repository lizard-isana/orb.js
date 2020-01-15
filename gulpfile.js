var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require("gulp-rename");
var concat = require("gulp-concat");

const src = {
  all: [
    './src/orb.js',
    './src/core.js',
    './src/time.js',
    './src/earth.js',
    './src/coordinates.js',
    './src/observation.js',
    './src/sgp4.js',
    './src/kepler.js',
    './src/sun.js',
    './src/luna.js',
    './src/vsop.js'
  ],
  core: [
    './src/orb.js',
    './src/core.js',
    './src/time.js',
    './src/earth.js',
    './src/coordinates.js',
    './src/observation.js'
  ],
  planetary: [
    './src/orb.js',
    './src/core.js',
    './src/time.js',
    './src/earth.js',
    './src/coordinates.js',
    './src/observation.js',
    './src/kepler.js',
    './src/sun.js',
    './src/luna.js',
    './src/vsop.js'
  ],
  satellite: [
    './src/orb.js',
    './src/core.js',
    './src/time.js',
    './src/earth.js',
    './src/coordinates.js',
    './src/observation.js',
    './src/sgp4.js'
  ]
}

const concat_scripts = function (done) {
  gulp.src(src.all)
    .pipe(concat('orb.v2.js'))
    .pipe(gulp.dest('./build'));

  gulp.src(src.core)
    .pipe(concat('orb-core.v2.js'))
    .pipe(gulp.dest('./build'));

  gulp.src(src.planetary)
    .pipe(concat('orb-planetary.v2.js'))
    .pipe(gulp.dest('./build'));

  gulp.src(src.satellite)
    .pipe(concat('orb-satellite.v2.js'))
    .pipe(gulp.dest('./build'));
  done()
  return
}

const copy_scripts = function (done) {
  var supplement = [
    "src/orb-date-handler.js",
    "src/orb-data-handler.js"
  ]
  return gulp.src(supplement)
    .pipe(gulp.dest('./build'));
};


const minify_scripts = function (done) {

  return gulp.src("./build/*.js")
    .pipe(uglify())
    .pipe(rename({
      extname: '.min.js'
    }))
    .pipe(gulp.dest('./build/min'));
};

exports.build = gulp.series(concat_scripts, copy_scripts, minify_scripts);