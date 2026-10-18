const { test } = require('node:test');
const assert = require('node:assert/strict');
const tools = require('../plugins/route-portal-core.cjs')();
const a = {lat:22.25,lng:113.55}, b = {lat:22.25,lng:113.56};
const portal = (guid, lat, lng) => ({guid, title:guid, lat, lng});
test('corridor includes mid-segment portals and endpoints, excludes distant portals, orders along the route', () => {
  const portals = [portal('last',b.lat,b.lng),portal('middle',22.2501,113.555),portal('first',a.lat,a.lng),portal('outside',22.26,113.555)];
  assert.deepEqual(tools.corridor([a,b],portals,40).map(p=>p.guid),['first','middle','last']);
  assert.deepEqual(tools.corridor([b,a],portals,40).map(p=>p.guid),['last','middle','first']);
});
test('nearest-stop candidates expose ambiguity and unmatched stops rather than inventing portal data', () => {
  const result = tools.stops([a,b],[portal('one',a.lat,a.lng),portal('near',a.lat+.0001,a.lng)],40);
  assert.deepEqual(result[0].map(p=>p.guid),['one','near']);assert.equal(result[1].length,0);
});
test('duplicate vertices do not produce NaN or duplicate corridor candidates', () => {
  const result=tools.corridor([a,a,b],[portal('one',a.lat,a.lng)],40);
  assert.equal(result.length,1);assert.equal(result[0].distance,0);
});
test('scan samples cover long segments and preserve the end of every route', () => {
  const result=tools.scanPoints([{points:[a,b]}],200);
  assert.ok(result.length>=6);assert.ok(result.some(p=>tools.distance(p,b)<1));
  for(let i=1;i<result.length;i++) assert.ok(tools.distance(result[i-1],result[i])<=201);
});
test('IITC E6 coordinates, GUID, title and image normalize without coordinate conversion', () => {
  assert.deepEqual(tools.portal('guid',{latE6:22250000,lngE6:113550000,title:'Portal',image:'https://lh3.googleusercontent.com/x'}),
    {guid:'guid',title:'Portal',lat:22.25,lng:113.55,imageUrl:'https://lh3.googleusercontent.com/x'});
  assert.equal(tools.portal('guid',{}),null);
  assert.equal(tools.exportPortal(portal('x',a.lat,a.lng),0).objective,null);
});
