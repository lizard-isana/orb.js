// venus.js — heliocentric position and velocity of Venus (VSOP87A).
//
// Importing this module pulls in only Venus's coefficient table, so a
// bundle that never mentions the other planets never pays for them.
// Default data is the truncated series (<0.1 arcsec as seen from Earth,
// 1500-2500 AD); swap in ./data/vsop87a-venus.full.js via makeVsopBody
// for the complete series.

import { makeVsopBody } from './vsop.js';
import * as DATA from './data/vsop87a-venus.js';

export const venus = makeVsopBody('venus', DATA);
