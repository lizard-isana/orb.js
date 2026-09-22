'use strict';

const { loadReferenceFixture } = require('./reference-fixture.js');

const SGP4_REFERENCE = loadReferenceFixture('python-sgp4-2.27.json');
const ISS_CASE = SGP4_REFERENCE.cases.find(({ id }) => id === 'iss-near-earth');

if (!ISS_CASE) {
  throw new Error('python-sgp4-2.27.json is missing the iss-near-earth case');
}

const ISS_TLE = {
  first_line: ISS_CASE.line1,
  second_line: ISS_CASE.line2
};

module.exports = { ISS_CASE, ISS_TLE, SGP4_REFERENCE };
