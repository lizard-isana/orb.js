// venus.js — heliocentric position and velocity of Venus (VSOP87A).
//
// Importing this module pulls in only Venus's coefficient table, so a
// bundle that never mentions the other planets never pays for them.
// Data: official VSOP87A (CDS VI/81), truncated to <0.1 arcsec as seen
// from Earth (1500-2500 AD) and self-validated at compile time; run
// 'node tools/vsop-compile.js --full' to generate the complete series
// and swap it in via makeVsopBody.

import { makeVsopBody } from './vsop.js';
import * as DATA from './data/vsop87a-venus.js';

export const venus = makeVsopBody('venus', DATA);
