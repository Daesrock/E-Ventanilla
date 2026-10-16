#!/bin/bash
set -euo pipefail
umask 022
code_dir=$(cd -- "$(dirname -- "$0")" && pwd)
root=${OSRM_ROOT:-/home/ubuntu/e-ventanilla/routing}
case "$root" in /*) ;; *) echo 'OSRM_ROOT debe ser absoluto.' >&2; exit 1;; esac
mkdir -p "$root"
if [[ -n "${OSRM_RELEASE:-}" ]]; then
    release=$(realpath "$OSRM_RELEASE")
    [[ "$release" == "$root"/region-* && -d "$release" && ! -e "$release/region.osm.pbf" ]] || { echo 'La preparación no puede reanudarse en esa ruta.' >&2; exit 1; }
else
    release=$(mktemp -d "$root/region-XXXXXXXX")
fi
chmod 755 "$release"
printf '%s\n' "$release" > "$root/latest-preparation.txt"

docker build --target runtime -t eventanilla-osrm:26.10.0 "$code_dir"
docker build --target prepare -t eventanilla-osrm-tools:26.10.0 "$code_dir"

download() {
    local name=$1 url=$2 checksum_url=$3
    if [[ -s "$release/$name" && -s "$release/$name.md5-source" && -s "$release/$name.sha256" ]]; then
        sha256sum --check --status "$release/$name.sha256"
        return
    fi
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --retry 2 --max-time 1200 \
        --dump-header "$release/$name.headers" "$url" --output "$release/$name"
    curl --fail --silent --show-error --proto '=https' --retry 2 --max-time 60 "$checksum_url" --output "$release/$name.md5-source"
    local expected
    expected=$(awk 'NR==1 {print $1}' "$release/$name.md5-source")
    [[ "$expected" =~ ^[0-9a-fA-F]{32}$ ]] || { echo 'Checksum de origen inválido.' >&2; exit 1; }
    printf '%s  %s\n' "$expected" "$release/$name" | md5sum --check --status
    sha256sum "$release/$name" > "$release/$name.sha256"
}

printf 'Descargando cartografía pública; no se modifican servicios existentes.\n'
download chiapas.osm.pbf https://download.openstreetmap.fr/extracts/north-america/mexico/chiapas-latest.osm.pbf \
    https://download.openstreetmap.fr/extracts/north-america/mexico/chiapas.osm.pbf.md5
download mexico.osm.pbf https://download.geofabrik.de/north-america/mexico-latest.osm.pbf \
    https://download.geofabrik.de/north-america/mexico-latest.osm.pbf.md5

tools() {
    docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true \
        --cpus 1 --memory 4g --memory-swap 4g --pids-limit 128 --user "$(id -u):$(id -g)" \
        --tmpfs /tmp:rw,nosuid,size=256m -e OMP_NUM_THREADS=1 -v "$release:/data" -v "$code_dir:/project:ro" \
        eventanilla-osrm-tools:26.10.0 "$@"
}
metadata() {
    docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true \
        --memory 256m --user "$(id -u):$(id -g)" -v "$release:/data" -v "$code_dir:/project:ro" \
        oven/bun:1.4.2-debian@sha256:4f6e31d1a54d6a3dd312daef655fc998101b5043d52e12592ac293ef04b9bc73 \
        bun /project/region-metadata.mjs "$1" /data
}

# Un único archivo nacional evita mezclar carreteras de extractos de fechas diferentes.
tools osmium fileinfo -e -j /data/chiapas.osm.pbf > "$release/extent.json"
tools osmium fileinfo -j /data/mexico.osm.pbf > "$release/source-info.json"
bbox=$(metadata bounds)
tools osmium extract --bbox "$bbox" --strategy complete_ways /data/mexico.osm.pbf -o /data/region.osm.pbf
tools osmium fileinfo -j /data/region.osm.pbf > "$release/region-info.json"
tools osrm-extract --threads 1 -p /opt/car.lua /data/region.osm.pbf
tools osrm-partition --threads 1 /data/region.osrm
tools osrm-customize --threads 1 /data/region.osrm
tools sha256sum /opt/car.lua > "$release/profile.sha256"
# Algunos archivos de mmap se generan con 0600; el servicio solo necesita leer cartografía pública.
find "$release" -maxdepth 1 -type f -name 'region.osrm*' -exec chmod 0644 {} +

# Los puntos de comprobación salen de vías de OSM, nunca se presentan como ventanillas.
tools osmium tags-filter /data/chiapas.osm.pbf w/highway=primary,secondary,tertiary -o /data/probe-roads.osm.pbf
tools osmium export /data/probe-roads.osm.pbf -f geojsonseq -o /data/probe-roads.geojsonseq
metadata manifest
runtime_id=$(docker image inspect eventanilla-osrm:26.10.0 --format '{{.Id}}')
printf 'OSRM_RUNTIME_IMAGE=%s\nOSRM_DATA_DIR=%s\n' "$runtime_id" "$release" > "$release/runtime.env"
printf 'Grafo preparado en %s. El servicio aún no se ha activado.\n' "$release"
