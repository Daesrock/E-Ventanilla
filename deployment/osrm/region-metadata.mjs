import { readFileSync, writeFileSync, statSync, realpathSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

if (typeof Bun === 'undefined' || Bun.version !== '1.4.2') throw new Error('Usa Bun 1.4.2.');
const [operation, folder] = process.argv.slice(2);
const root = realpathSync(folder);
const read = (name) => readFileSync(join(root, name), 'utf8');
const json = (name, value) => writeFileSync(join(root, name), JSON.stringify(value, null, 2));

async function checksum(name) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(join(root, name))) hash.update(chunk);
  return hash.digest('hex');
}

if (operation === 'bounds') {
  const extent = JSON.parse(read('extent.json'));
  const boxes = extent.header.boxes.length ? extent.header.boxes : [extent.data.bbox];
  if (boxes.length !== 1 || boxes[0].length !== 4 || !boxes[0].every(Number.isFinite)) {
    throw new Error('El extracto no tiene un rectángulo de cobertura inequívoco.');
  }
  const [west, south, east, north] = boxes[0];
  const latitudeMargin = 100 / 111.32;
  const longitudeMargin = latitudeMargin / Math.cos(((south + north) / 2) * Math.PI / 180);
  const bounds = [west - longitudeMargin, south - latitudeMargin, east + longitudeMargin, north + latitudeMargin];
  json('bounds.json', bounds);
  console.log(bounds.join(','));
} else if (operation === 'manifest') {
  const sources = [];
  for (const [name, url] of [
    ['chiapas.osm.pbf', 'https://download.openstreetmap.fr/extracts/north-america/mexico/chiapas-latest.osm.pbf'],
    ['mexico.osm.pbf', 'https://download.geofabrik.de/north-america/mexico-latest.osm.pbf'],
  ]) {
    sources.push({ url, sha256: await checksum(name), sizeBytes: statSync(join(root, name)).size,
      responseHeaders: read(name + '.headers') });
  }
  json('manifest.json', {
    preparedAtUtc: new Date().toISOString(), sources, osrmVersion: '26.10.0', profile: 'car', algorithm: 'mld',
    osrmImage: 'ghcr.io/project-osrm/osrm-backend:26.10.0-debian@sha256:55dbfd47d984c2cacd64e32901b4321c86b5ec761438e69aa053dc78698a786f',
    sourceDataTimestamp: JSON.parse(read('source-info.json')).header.option.osmosis_replication_timestamp ?? null,
    profileSha256: read('profile.sha256').trim().split(/\s+/)[0],
    bounds: JSON.parse(read('bounds.json')), approximateMarginKm: 100,
    graphSource: 'mexico.osm.pbf', graphSha256: await checksum('region.osm.pbf'),
    attribution: '© OpenStreetMap contributors', licenseUrl: 'https://www.openstreetmap.org/copyright',
  });
  // Vías reales de OSM para comprobar el motor; no se presentan como ventanillas.
  const probes = [];
  const lines = createInterface({ input: createReadStream(join(root, 'probe-roads.geojsonseq')) });
  for await (const line of lines) {
    const { geometry, properties } = JSON.parse(line.replace(/^\x1e/, ''));
    if (geometry?.type !== 'LineString' || ['no', 'private'].includes(properties.access)) continue;
    const points = geometry.coordinates;
    if (points.length < 2 || String(points[0]) === String(points.at(-1))) continue;
    const pair = [points[0], points.at(-1)];
    if (properties.oneway === '-1') pair.reverse();
    probes.push({ coordinates: pair, source: 'OpenStreetMap way' });
    if (probes.length === 20) break;
  }
  if (!probes.length) throw new Error('No hay vías cartográficas para comprobar el motor.');
  json('probe-pairs.json', probes);
} else {
  throw new Error('Operación desconocida.');
}
