"""Importa instantáneas públicas; nunca consulta contraseñas de usuarios."""
import csv
import hashlib
import io
import json
from pathlib import Path
import unicodedata
import urllib.request
import zipfile
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ROOT / 'api/resources'
ASSETS = ROOT / 'android/app/src/main/assets'
CATALOG_URL = 'https://www.inegi.org.mx/contenidos/app/ageeml/catun_municipio.zip'

def fetch(url):
    return urllib.request.urlopen(url, timeout=60).read()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

RESOURCES.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)
archive = fetch(CATALOG_URL)
assert sha(archive) == 'cb0f21fb4c53d2c0adca356ca669646372f9b81b2cdcbd51745c01acaec7204f', 'La descarga cambió: corrobora la nueva referencia en INEGI antes de actualizar los metadatos.'
with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
    member = next(name for name in zipped.namelist() if name.endswith('_utf8.csv'))
    raw = zipped.read(member)
rows = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
municipalities = [{'code': row['CVEGEO'], 'name': row['NOM_MUN']} for row in rows if row['CVE_ENT'] == '07']
assert municipalities and len({m['code'] for m in municipalities}) == len(municipalities)
assert all(len(m['code']) == 5 and m['code'].startswith('07') and m['name'].strip() for m in municipalities)
municipalities.sort(key=lambda m: ''.join(c for c in unicodedata.normalize('NFD', m['name'].lower()) if not unicodedata.combining(c)))
payload = json.dumps(municipalities, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
catalog = {'metadata': {
    'publisher': 'INEGI', 'catalog': 'Catálogo Único de Claves de Áreas Geoestadísticas Estatales, Municipales y Localidades',
    'sourceUrl': CATALOG_URL, 'catalogUrl': 'https://www.inegi.org.mx/app/ageeml/default.html',
    'referenceDate': '2026-08', 'publishedAt': '2026-09-15', 'retrievedAt': date.today().isoformat(),
    'entityCode': '07', 'entityName': 'Chiapas', 'archiveMember': member,
    'archiveSha256': sha(archive), 'sourceCsvSha256': sha(raw), 'municipalitiesSha256': sha(payload),
    'checksumEncoding': 'SHA-256 of UTF-8 compact JSON municipalities array',
}, 'municipalities': municipalities}
write_json(RESOURCES / 'municipalities.json', catalog)
(ASSETS / 'municipalities.json').write_bytes((RESOURCES / 'municipalities.json').read_bytes())
# A reference date must be corroborated on INEGI's index before refreshing this importer.
commit = json.loads(fetch('https://api.github.com/repos/danielmiessler/SecLists/commits?path=Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt&per_page=1'))[0]['sha']
base = f'https://raw.githubusercontent.com/danielmiessler/SecLists/{commit}/'
url = base + 'Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt'
passwords = fetch(url)
license_data = fetch(base + 'LICENSE')
(RESOURCES / 'common-passwords.txt').write_bytes(passwords)
(RESOURCES / 'SecLists-LICENSE.txt').write_bytes(license_data)
(ASSETS / 'common-passwords.txt').write_bytes(passwords)
(ASSETS / 'SecLists-LICENSE.txt').write_bytes(license_data)
write_json(RESOURCES / 'common-passwords.metadata.json', {
    'publisher': 'NCSC', 'distributor': 'SecLists', 'sourceUrl': url, 'commit': commit,
    'retrievedAt': date.today().isoformat(), 'sha256': sha(passwords),
    'license': 'MIT', 'licenseSourceUrl': base + 'LICENSE', 'licenseSha256': sha(license_data),
    'comparison': 'Whole password, case insensitive; no trimming or normalization of the stored credential',
})
(ASSETS / 'common-passwords.metadata.json').write_bytes((RESOURCES / 'common-passwords.metadata.json').read_bytes())
print(f'Catálogo oficial: {len(municipalities)} claves únicas; SHA-256 {sha(payload)}. Lista NCSC y licencia guardadas.')
