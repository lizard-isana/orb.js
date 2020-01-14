var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require("gulp-rename");
var concat = require("gulp-concat");
var sequence = require('run-sequence');

gulp.task("concat", function() {
  var all = [
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
  ];
  gulp.src(all)
    .pipe(concat('orb.v2.js'))
    .pipe(gulp.dest('./build'));

  var core = [
    './src/core.js',
    './src/time.js',
    './src/earth.js',
    './src/coordinates.js',
    './src/observation.js'
  ];
  gulp.src(core)
    .pipe(concat('orb-core.v2.js'))
    .pipe(gulp.dest('./build'));

  var planetary = [
    './src/kepler.js',
    './src/sun.js',
    './src/luna.js',
    './src/vsop.js'
  ];
  gulp.src(planetary)
    .pipe(concat('orb-planetary.v2.js'))
    .pipe(gulp.dest('./build'));

  var satellite = [
    './src/sgp4.js'
  ];
  gulp.src(satellite)
    .pipe(concat('orb-satellite.v2.js'))
    .pipe(gulp.dest('./build'));

});

gulp.task('copy', function() {
  var supplement = [
    "src/orb-date-handler.js",
    "src/orb-data-handler.js"
  ]
  return gulp.src(supplement)
    .pipe(gulp.dest('./build'));
});

gulp.task('minify',function() {
    return gulp.src("./build/*.js")
        .pipe(uglify())
        .pipe(rename({
          extname: '.min.js'
        }))
        .pipe(gulp.dest('./build/min'));
});

gulp.task('build', function() {
  sequence('concat', 'copy','minify');
});
