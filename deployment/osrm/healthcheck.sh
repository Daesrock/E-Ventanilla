#!/bin/sh
set -eu
# OSRM solo empieza a escuchar después de cargar el grafo; una ruta HTTP desconocida devuelve 400.
status=$(curl --silent --max-time 3 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:5000/)
test "$status" = 400
