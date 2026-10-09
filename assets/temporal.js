/* Pure annual-envelope logic, shared by browser and Node tests. No prose parsing. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TrackTime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function validBounds(p) {
    return Number.isInteger(p.start_year) && Number.isInteger(p.end_year) && p.start_year <= p.end_year;
  }
  function matchesYear(p, year, allYears = false) {
    if (allYears) return true; // Deliberate all-records mode, even if a future record lacks dates.
    return Number.isInteger(year) && validBounds(p) && p.start_year <= year && year <= p.end_year;
  }
  function confidenceGroup(p) {
    const ranks = {very_low: 0, low: 1, medium: 2, high: 3};
    const values = [ranks[p.start_confidence], ranks[p.end_confidence]];
    if (values.some(v => v === undefined)) return 'unknown';
    const lower = Math.min(...values);
    return lower === 0 ? 'very_low' : lower === 1 ? 'low' : 'medium_high';
  }
  return Object.freeze({validBounds, matchesYear, confidenceGroup});
});
