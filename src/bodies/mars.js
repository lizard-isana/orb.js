// mars.js — heliocentric position and velocity of Mars (VSOP87A).
//
// Importing this module pulls in only Mars's coefficient table, so a
// bundle that never mentions the other planets never pays for them.
// Default data is the truncated series (<0.1 arcsec as seen from Earth,
// 1500-2500 AD); swap in ./data/vsop87a-mars.full.js via makeVsopBody
// for the complete series.

import { makeVsopBody } from './vsop.js';
import * as DATA from './data/vsop87a-mars.js';

export const mars = makeVsopBody('mars', DATA);
