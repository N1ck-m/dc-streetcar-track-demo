(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const D = window.TRACK_DATA;
  if (!D || !window.TrackTime) {
    $('segment-detail').textContent = 'The local data files did not load. Keep the assets and data folders beside index.html, then reload.';
    return;
  }
  const features = D.geojson.features;
  const byId = new Map(features.map(f => [f.id, f]));
  const state = {year: 1930, allYears: false, query: '', area: '', confidence: '', selected: null};
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = $('map'), stage = $('map-stage');
  const [west, south, east, north] = D.geojson.bbox;
  const latitude = (north + south) / 2, longitude = (west + east) / 2;
  const cosLat = Math.cos(latitude * Math.PI / 180);
  const project = ([lon, lat]) => [(lon - longitude) * cosLat * 1000, (latitude - lat) * 1000];
  const elements = new Map(), paths = new Map();
  let visible = [], view, fullView, drag = null, announcementTimer = null;
  const human = value => String(value ?? '').replaceAll('_', ' ');
  const make = (tag, cls, text) => {const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e;};
  const svgNode = (tag, attrs) => {const n = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n;};
  const para = (text, cls = '') => make('p', cls, text);
  const localLink = (file, title) => {const a = make('a', '', title); a.href = `./data/${file}`; a.download = ''; return a;};
  const safeLink = (url, title) => {
    try {const u = new URL(url); if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Unsupported scheme'); const a = make('a', '', title); a.href = u.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;} catch {return make('span', '', title);}
  };
  const announce = text => {clearTimeout(announcementTimer); announcementTimer = setTimeout(() => {$('announcement').textContent = text;}, 180);};
  function geometryBounds(fs) {
    const pts = fs.flatMap(f => f.geometry.coordinates.map(project));
    return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  }
  function viewForBounds(bounds, padding = 1.18) {
    const ratio = stage.clientWidth / stage.clientHeight || 1000 / 760;
    const cx = (bounds[0] + bounds[2]) / 2, cy = (bounds[1] + bounds[3]) / 2;
    let w = Math.max(4, bounds[2] - bounds[0]) * padding, h = Math.max(4, bounds[3] - bounds[1]) * padding;
    if (w / h < ratio) w = h * ratio; else h = w / ratio;
    return {x: cx - w / 2, y: cy - h / 2, w, h};
  }
  function applyView() {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    const kmPerWorldUnit = 111.195 / 1000;
    const targetKm = (70 / stage.clientWidth) * view.w * kmPerWorldUnit;
    const lengths = [.1, .2, .5, 1, 2, 5, 10, 20, 50];
    const km = lengths.reduce((best, n) => Math.abs(Math.log(n / targetKm)) < Math.abs(Math.log(best / targetKm)) ? n : best, lengths[0]);
    $('scale-line').style.width = `${km / kmPerWorldUnit / view.w * stage.clientWidth}px`;
    $('scale-label').textContent = km < 1 ? `${km * 1000} m` : `${km} km`;
  }
  function fitNetwork() {fullView = viewForBounds(geometryBounds(features)); view = {...fullView}; applyView();}
  function zoom(factor, px = stage.clientWidth / 2, py = stage.clientHeight / 2) {
    const w = Math.min(fullView.w * 1.5, Math.max(fullView.w / 80, view.w * factor));
    const actual = w / view.w, h = view.h * actual;
    view = {x: view.x + (view.w - w) * px / stage.clientWidth, y: view.y + (view.h - h) * py / stage.clientHeight, w, h};
    applyView();
  }
  for (let lon = Math.floor(west * 10) / 10; lon <= east + .1; lon += .1) {
    const [x] = project([lon, latitude]); const [, y1] = project([lon, north + .08]); const [, y2] = project([lon, south - .06]);
    $('grid').append(svgNode('line', {x1:x, y1, x2:x, y2}));
    const t = svgNode('text', {x:x + 3, y:y2 - 4}); t.textContent = `${Math.abs(lon).toFixed(1)}° W`; $('grid').append(t);
  }
  for (let lat = Math.floor(south * 10) / 10; lat <= north + .1; lat += .1) {
    const [x1,y] = project([west - .055, lat]); const [x2] = project([east + .05,lat]);
    $('grid').append(svgNode('line', {x1,y1:y,x2,y2:y}));
    const t = svgNode('text',{x:x1+3,y:y-3});t.textContent=`${lat.toFixed(1)}° N`;$('grid').append(t);
  }
  for (const f of features) {
    const path = f.geometry.coordinates.map((c,i) => {const [x,y] = project(c); return `${i?'L':'M'}${x.toFixed(7)},${y.toFixed(7)}`;}).join(' ');
    const group = svgNode('g', {class:'track-group', 'data-segment-id':f.id});
    group.append(svgNode('path',{d:path,class:`track ${f.properties.confidence_group}`}));
    group.append(svgNode('path',{d:path,class:'hit-track'}));
    const title=svgNode('title',{});title.textContent=`#${f.properties.fid} · ${f.properties.name}`;group.append(title);
    group.addEventListener('pointermove',event => {
      if (drag?.moved || event.pointerType === 'touch') return;
      const rect=stage.getBoundingClientRect();const tip=$('map-tooltip');
      tip.textContent=`#${f.properties.fid} · ${f.properties.name}`;tip.hidden=false;
      const x=event.clientX-rect.left,y=event.clientY-rect.top;
      tip.style.left=`${Math.max(8,Math.min(stage.clientWidth-tip.offsetWidth-8,x+12))}px`;
      tip.style.top=`${Math.max(8,Math.min(stage.clientHeight-tip.offsetHeight-32,y+12))}px`;
    });
    group.addEventListener('pointerleave',()=>{$('map-tooltip').hidden=true;});
    $('tracks').append(group);elements.set(f.id,group);paths.set(f.id,path);
  }
  function matchesFilter(f) {
    const p=f.properties;
    return TrackTime.matchesYear(p,state.year,state.allYears) && (!state.area || p.atlas_area_id===state.area) && (!state.confidence || p.confidence_group===state.confidence) && (!state.query || `${p.name} ${p.estimate_label} ${p.atlas_area_id} ${p.segment_id} ${p.fid}`.toLowerCase().includes(state.query));
  }
  function redraw() {
    visible=features.filter(matchesFilter);const shown=new Set(visible.map(f=>f.id));
    for(const [id,g] of elements) g.style.display=shown.has(id)?'':'none';
    const counts={medium_high:0,low:0,very_low:0};for(const f of visible)counts[f.properties.confidence_group]++;
    $('shown-count').textContent=visible.length;$('list-count').textContent=visible.length;
    $('count-medium').textContent=counts.medium_high;$('count-low').textContent=counts.low;$('count-very-low').textContent=counts.very_low;
    $('map-year-label').textContent=state.allYears?'· all years':`· ${state.year} envelope`;
    $('map-title').textContent=state.allYears?'Historic physical streetcar segments, all years':`Historic physical streetcar segments within proposed ${state.year} envelopes`;
    $('empty-map').hidden=visible.length>0;$('clear-search').hidden=!state.query&&!state.area&&!state.confidence;
    $('year-slider').value=state.year;$('year-number').value=state.year;
    $('year-slider').style.setProperty('--range-progress',`${state.year-1862}%`);
    $('year-slider').disabled=state.allYears;$('year-number').hidden=state.allYears;$('all-years-label').hidden=!state.allYears;
    $('previous-year').disabled=state.allYears||state.year<=1862;$('next-year').disabled=state.allYears||state.year>=1962;
    $('all-years').setAttribute('aria-pressed',String(state.allYears));$('all-years').firstChild.textContent=state.allYears?'Selected year ':'All years ';
    $('year-caption').textContent=state.allYears?'All proposed physical segments':'Within the proposed envelope';
    renderList();renderSelection();renderDetail();
    announce(`${visible.length} segments match ${state.allYears?'all years':state.year}${state.query?', with search filter':''}.`);
  }
  function renderList() {
    const results=$('results');results.replaceChildren();
    if(!visible.length){results.append(para('No matching segments. Try another year or clear the filters.','no-results'));return;}
    for(const f of visible){const p=f.properties;const b=make('button','result');b.type='button';b.dataset.segmentId=f.id;b.setAttribute('aria-pressed',String(state.selected===f.id));b.append(make('span','',`#${p.fid} · ${p.atlas_area_id} · ${p.start_year}–${p.end_year}`),document.createTextNode(p.name));b.addEventListener('click',()=>selectSegment(f.id));results.append(b);}
  }
  function renderSelection() {
    const layer=$('selection-overlay');layer.replaceChildren();
    if(!state.selected || !visible.some(f=>f.id===state.selected))return;
    layer.append(svgNode('path',{d:paths.get(state.selected),class:'selected-halo'}),svgNode('path',{d:paths.get(state.selected),class:'selected-track'}));
  }
  function selectSegment(id) {state.selected=id;renderList();renderSelection();renderDetail();$('map-tooltip').hidden=true;announce(`Selected segment ${byId.get(id).properties.fid}. Evidence is below Find a segment.`);}
  function disclosure(title,content) {const d=make('details');const summary=make('summary','',title);d.append(summary,content);return d;}
  function renderValue(value, container, depth=0) {
    if(value===null || value===undefined || value==='')return;
    if(Array.isArray(value)) {
      if(!value.length)return;
      if(value.every(v=>typeof v==='string'||typeof v==='number')) {const ul=make('ul');for(const v of value)ul.append(make('li','',String(v)));container.append(ul);}
      else for(const v of value){const record=make('div','record');renderValue(v,record,depth+1);container.append(record);}
    } else if(typeof value==='object') {
      const dl=make('dl');
      for(const [key,v] of Object.entries(value)) {
        if(v===null||v===''||(Array.isArray(v)&&!v.length))continue;
        dl.append(make('dt','',human(key)));const dd=make('dd');renderValue(v,dd,depth+1);dl.append(dd);
      }container.append(dl);
    } else container.append(document.createTextNode(String(value)));
  }
  function recordsContent(records) {const wrap=make('div','detail-content');renderValue(records,wrap);return wrap;}
  function endpoint(label,prefix,p) {
    const box=make('div','endpoint');box.append(make('span','endpoint-label',label),make('strong','',p[`${prefix}_year`]));
    const conf=p[`${prefix}_confidence`];const group=conf==='very_low'?'very_low':conf==='low'?'low':'medium_high';
    box.append(make('span',`confidence-label ${group}`,`${human(conf)} confidence`));
    box.append(make('span','',`Plausible: ${p[`${prefix}_earliest_year`]}–${p[`${prefix}_latest_year`]}`));return box;
  }
  function renderDetail() {
    const panel=$('segment-detail');panel.replaceChildren();$('details-panel').hidden=!state.selected;
    if(!state.selected)return;
    const f=byId.get(state.selected),p=f.properties,record=D.evidence.segments[f.id],r=record.recovered_ledger;
    const top=make('div','detail-eyebrow',`PHYSICAL SEGMENT #${p.fid} · ${p.atlas_area_id}`);const close=make('button','','×');close.type='button';close.setAttribute('aria-label','Clear selected segment');close.addEventListener('click',()=>{state.selected=null;renderList();renderSelection();renderDetail();});top.append(close);
    panel.append(top,make('h2','',p.name));
    const included=visible.some(x=>x.id===f.id);const temporal=TrackTime.matchesYear(p,state.year,state.allYears);
    panel.append(make('div',`status-chip${included?'':' outside'}`,included?(state.allYears?'Shown · all-years view':`Within proposed ${state.year} envelope`):temporal?'Hidden by search or area/confidence filter':`Outside proposed ${state.year} envelope`));
    const fit=make('button','fit-segment','Zoom to this segment ↗');fit.type='button';fit.addEventListener('click',()=>{view=viewForBounds(geometryBounds([f]),1.9);applyView();});panel.append(fit);
    const grid=make('div','endpoint-grid');grid.append(endpoint('PROPOSED START','start',p),endpoint('PROPOSED END','end',p));panel.append(grid);
    const expanded=make('div','detail-content');const mainPanel=panel;const appendDetail=(...nodes)=>expanded.append(...nodes);
    appendDetail(para('Earliest/latest passenger-use estimates for one or more identified portions. No verified endpoint dates.','detail-note'));
    const badges=make('div','badge-row');if(p.mixed_subextent)badges.append(make('span','badge','Mixed subextents'));if(p.has_known_periods)badges.append(make('span','badge','Historical periods / context'));if(p.confidence_group==='very_low')badges.append(make('span','badge','Very-low endpoint'));if(badges.children.length)appendDetail(badges);
    if(p.citation_review_warning){const warn=make('div','warning');warn.append(make('strong','','Citation-scope review needed'),para(p.citation_review_warning));appendDetail(warn);}
    if(r.scope_caveat)appendDetail(para(r.scope_caveat,'detail-note'));
    if(r.operational_role_uncertainty)appendDetail(para(`Passenger-use caution: ${r.operational_role_uncertainty}`,'detail-note'));
    if(p.start_estimated_date)appendDetail(para(`Opening day estimate: ${p.start_estimated_date} (${p.start_precision} precision). This is not a verified date.`,'detail-note'));
    const rationale=make('section','detail-section');rationale.append(make('h3','','Why these years?'),make('h4','','Proposed opening'),para(r.opening_basis),make('h4','','Proposed closing'),para(r.closing_basis));appendDetail(rationale);
    if(r.source_support_caveat)appendDetail(para(r.source_support_caveat,'detail-note'));
    if(r.subextent_estimates.length)appendDetail(disclosure(`Scoped portions (${r.subextent_estimates.length})`,recordsContent(r.subextent_estimates)));
    if(r.known_periods.length){const body=recordsContent(r.known_periods);body.prepend(para('Retained evidence, not a normalized timeline. These records do not silently remove years from the map.'));appendDetail(disclosure(`Known periods & context (${r.known_periods.length})`,body));}
    if(r.alternative_scenarios.length)appendDetail(disclosure(`Alternative histories (${r.alternative_scenarios.length})`,recordsContent(r.alternative_scenarios)));
    const uncertainty=make('div','detail-content');uncertainty.append(para(`Passenger-use qualification: ${human(p.passenger_use_existence)}.`),para(`Geometry correspondence: ${human(p.geometry_correspondence)}.`),para(`Uncertainty group: ${human(p.uncertainty_reason_group)}.`));
    for(const key of ['passenger_use_flag_audit_reason','nonpassenger_interpretation_limit','open_research_question','date_interpretation_for_terminal_piece'])if(r[key])uncertainty.append(para(String(r[key])));
    uncertainty.append(para('Endpoint bounds are inclusive editorial plausible ranges, not statistical confidence intervals. A zero-width range is not verification. The 14 explicit mixed-subextent flags are not a complete inventory of possible mixed history.'));
    appendDetail(disclosure('Scope & uncertainty',uncertainty));
    if(r.basis_evidence.length)appendDetail(disclosure(`Historical claim IDs & locators (${r.basis_evidence.length})`,recordsContent(r.basis_evidence)));
    if(r.scope_evidence.length)appendDetail(disclosure(`Scoped evidence & locators (${r.scope_evidence.length})`,recordsContent(r.scope_evidence)));
    const sourceIds=[...new Set([...p.source_ids,...p.context_source_ids])];const sourceBox=make('div','detail-content');sourceBox.append(para('Historical source references. A source can support a scoped event or corridor without proving this entire geometry or its lifespan. Links were not live-checked for this preview.'));
    for(const id of sourceIds){const source=D.sources[id];const item=make('div','source');if(!source){item.append(para(`Unresolved source: ${id}`));sourceBox.append(item);continue;}
      item.append(source.source_uri?safeLink(source.source_uri,source.title):make('span','',source.title));
      item.append(make('div','source-code',`${id}${p.context_source_ids.includes(id)?' · context reference':''}`));
      if(source.publication_date_text)item.append(para(source.publication_date_text));
      if(!source.source_uri)item.append(para(source.url_review_status==='not_supplied'?'No source URL supplied.':'Source URL omitted pending review.'));
      if(source.inherited_inspection_status)item.append(para(`Inherited review: ${human(source.inherited_inspection_status)}`));sourceBox.append(item);
    }appendDetail(disclosure(`Sources & references (${sourceIds.length})`,sourceBox));
    const provenance=make('div','detail-content');provenance.append(para(`Stable ID: ${p.segment_id}`),para(`Recovered estimate ID: ${p.estimate_id}`),para(`Recovered estimate label: ${p.estimate_label}`),para(`Geometry SHA-256: ${p.geometry_hash}`),para('Display name is the current M6 label. Recovered dates remain provisional, unverified and unadmitted. Geometry, stable ID and current name are preserved.'),localLink('evidence.json','Download public evidence JSON'),document.createTextNode(' · '),localLink('field_dictionary.json','Field definitions'));
    appendDetail(disclosure('Identity & provenance',provenance));
    appendDetail(make('div','identity',p.segment_id));
    mainPanel.append(disclosure(p.citation_review_warning?'Details & sources · citation review':'Details & sources',expanded));
  }
  function setYear(raw) {const n=Number(raw);if(!Number.isInteger(n)||n<1862||n>1962){$('year-number').value=state.year;announce('Enter an integer year from 1862 to 1962.');return;}state.year=n;state.allYears=false;redraw();}
  $('year-slider').addEventListener('input',event=>setYear(event.target.value));$('year-number').addEventListener('input',event=>{const n=Number(event.target.value);if(Number.isInteger(n)&&n>=1862&&n<=1962)setYear(n);});$('year-number').addEventListener('change',event=>setYear(event.target.value));$('year-number').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();setYear(event.target.value);}});
  $('previous-year').addEventListener('click',()=>setYear(state.year-1));$('next-year').addEventListener('click',()=>setYear(state.year+1));
  $('all-years').addEventListener('click',()=>{state.allYears=!state.allYears;redraw();});
  $('search').addEventListener('input',event=>{state.query=event.target.value.toLowerCase().trim();$('segment-list').open=true;redraw();});
  $('area-filter').addEventListener('change',event=>{state.area=event.target.value;redraw();});$('confidence-filter').addEventListener('change',event=>{state.confidence=event.target.value;redraw();});
  function clearFilters(){state.query='';state.area='';state.confidence='';$('search').value='';$('area-filter').value='';$('confidence-filter').value='';redraw();}
  $('clear-search').addEventListener('click',clearFilters);$('reset-filters').addEventListener('click',clearFilters);
  $('fit-map').addEventListener('click',fitNetwork);$('zoom-in').addEventListener('click',()=>zoom(.7));$('zoom-out').addEventListener('click',()=>zoom(1/.7));
  svg.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,view:{...view},moved:false,id:event.target.closest('[data-segment-id]')?.dataset.segmentId};svg.setPointerCapture(event.pointerId);});
  svg.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>4){drag.moved=true;svg.classList.add('dragging');$('map-tooltip').hidden=true;}if(drag.moved){view={...drag.view,x:drag.view.x-dx/stage.clientWidth*drag.view.w,y:drag.view.y-dy/stage.clientHeight*drag.view.h};applyView();}});
  function endDrag(event){if(!drag||drag.pointer!==event.pointerId)return;const was=drag;drag=null;svg.classList.remove('dragging');if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);if(event.type==='pointerup'&&!was.moved&&was.id)selectSegment(was.id);}
  svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
  svg.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();const r=stage.getBoundingClientRect();zoom(Math.exp(event.deltaY*.002),event.clientX-r.left,event.clientY-r.top);},{passive:false});
  svg.addEventListener('keydown',event=>{if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))event.preventDefault();if(event.key==='+'||event.key==='=')zoom(.7);else if(event.key==='-')zoom(1/.7);else if(event.key==='Home')fitNetwork();else if(event.key.startsWith('Arrow')){const step=view.w*.08;if(event.key==='ArrowLeft')view.x-=step;if(event.key==='ArrowRight')view.x+=step;if(event.key==='ArrowUp')view.y-=step;if(event.key==='ArrowDown')view.y+=step;applyView();}});
  let previousWidth=0;new ResizeObserver(()=>{if(!view){fitNetwork();return;}const width=stage.clientWidth;if(width===previousWidth)return;previousWidth=width;const zoomRatio=fullView.w/view.w;const cx=view.x+view.w/2,cy=view.y+view.h/2;fullView=viewForBounds(geometryBounds(features));view={w:fullView.w/zoomRatio,h:fullView.h/zoomRatio};view.x=cx-view.w/2;view.y=cy-view.h/2;applyView();}).observe(stage);
  fitNetwork();redraw();
  // Read-only diagnostics support repeatable local tests; no external state or data mutation.
  window.TRACK_ATLAS={getState:()=>({...state,visibleCount:visible.length,visibleIds:visible.map(f=>f.id)}),getView:()=>({...view})};
})();
