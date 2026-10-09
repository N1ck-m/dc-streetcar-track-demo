# Tracks through time

A static research preview of 269 physical streetcar segments in Washington, D.C. and environs. No runtime dependencies, analytics, account system, external tiles or build step. All asset URLs are relative and work under a GitHub Pages repository subpath.

## Local use

Keep the directory structure intact and open index.html, or run:

    python -m http.server 8000 --bind 127.0.0.1

Then open http://127.0.0.1:8000/. The supplied script data mirror supports offline file opening without fetch requests. Historical source links require the internet only when opened.

## Controls

Choose an integer year (1862–1962), drag the slider, or use the year step buttons. Show all years restores all 269 segments subject to search/area/confidence filters. Select a segment on the map or in the searchable list to read endpoint estimates, plausible ranges, qualifications, scoped-history summaries and source references. Drag the map to pan. Zoom with buttons, keyboard +/− or Ctrl/Command+wheel. Arrow keys pan the focused map; Home fits the network.

## Meaning

Always visible: **Proposed outer-year envelope; does not establish uninterrupted service.**

Annual match: start_year <= selected_year <= end_year. Both endpoint years display. These are proposed earliest/latest passenger-use estimates on one or more scoped portions, not verified installation/removal dates or continuous operation. No canonical OperatingPeriods or route/service UI is included.

141 segments have medium/high confidence at both endpoints; 128 have a low/very-low endpoint, including 20 with a very-low endpoint. Fourteen have explicit mixed-subextent flags, with possible additional mixed history in prose. Citation cautions on fids 1,2,3,6,112 remain visible. WGS 84 longitude/latitude geometry, current M6 names and stable IDs are preserved; display uses a local equirectangular projection without a basemap.

## Data, sources and rights

The public data is a projection of the supplied recovery handoff. It includes physical geometry, proposed factual years, editorial rationale/cautions, short scoped-history summaries, source bibliography/URLs and claim IDs. Full original source payloads, long quotations, raw ledgers, local paths, database row pointers and internal inspection notes are omitted. Source links are citations, not included scans. Two incomplete URLs and four unverified token-bearing URLs are withheld; four sources had no link. No live source review or confidence upgrade is implied.

See data/metadata.json for provenance, data/field_dictionary.json for exact feature definitions and data/known_citation_issues.json for the five citation warnings. Referenced third-party sources retain their rights. No open-source or data-reuse license is asserted by this preview.

## GitHub Pages

This folder is the deployable root. Upload only its contents to the selected repository branch/root and configure GitHub Pages to serve that branch. Keep .nojekyll. Do not change asset URLs to leading-slash paths. No SPA rewrite or server-side code is required. Public repository publishing has been separately authorized; this README does not itself grant publication permissions.
