'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_METADATA = [
  'schemaVersion',
  'source',
  'sourceVersion',
  'procedure',
  'instant',
  'timeScale',
  'frame',
  'center',
  'units',
  'accuracy',
  'tolerance'
];

function loadReferenceFixture(filename) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', filename);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const missing = REQUIRED_METADATA.filter((key) => {
    const value = fixture[key];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new Error(filename + ' is missing fixture metadata: ' + missing.join(', '));
  }
  if (fixture.schemaVersion !== 1) {
    throw new Error(filename + ' uses unsupported schemaVersion ' + fixture.schemaVersion);
  }

  return fixture;
}

module.exports = { REQUIRED_METADATA, loadReferenceFixture };
