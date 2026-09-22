'use strict';

const { finish } = require('./helpers/harness.js');

require('./suites/time-and-frames.test.js');
require('./suites/ephemerides.test.js');
require('./suites/kepler.test.js');
require('./suites/sgp4.test.js');
require('./suites/observer.test.js');

finish();
