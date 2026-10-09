/* WGS 84 <-> spherical Web Mercator, for exact SVG / XYZ-tile registration. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TrackGeo=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const BASE_ZOOM=10,WORLD_SIZE=256*2**BASE_ZOOM,MAX_LAT=85.0511287798066;
 function world([lon,lat]){const clamped=Math.max(-MAX_LAT,Math.min(MAX_LAT,lat));const rad=clamped*Math.PI/180;return[(lon+180)/360*WORLD_SIZE,(1-Math.asinh(Math.tan(rad))/Math.PI)/2*WORLD_SIZE];}
 function lonLat([x,y]){return[x/WORLD_SIZE*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y/WORLD_SIZE)))*180/Math.PI];}
 function tileSpan(z){return 256*2**(BASE_ZOOM-z);}
 function tileAt(lonlat,z){const [x,y]=world(lonlat),span=tileSpan(z);return{x:Math.floor(x/span),y:Math.floor(y/span),z};}
 function kilometersPerUnit(lat){return 40075.01668557849*Math.cos(lat*Math.PI/180)/WORLD_SIZE;}
 return Object.freeze({BASE_ZOOM,WORLD_SIZE,MAX_LAT,world,lonLat,tileSpan,tileAt,kilometersPerUnit});
});
