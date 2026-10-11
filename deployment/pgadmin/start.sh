#!/bin/sh
set -eu
umask 077
cat /run/secrets/pgadmin_pgpass > /var/lib/pgadmin/project.pgpass
chmod 600 /var/lib/pgadmin/project.pgpass
exec /entrypoint.sh
