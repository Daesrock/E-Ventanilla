ARG OSRM_IMAGE=ghcr.io/project-osrm/osrm-backend:26.10.0-debian@sha256:55dbfd47d984c2cacd64e32901b4321c86b5ec761438e69aa053dc78698a786f
FROM ${OSRM_IMAGE} AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY healthcheck.sh /opt/project-healthcheck.sh
COPY LICENSE.osrm /usr/share/licenses/osrm/LICENSE
USER 10001:10001
ENTRYPOINT ["osrm-routed"]

FROM runtime AS prepare
USER root
RUN apt-get update && apt-get install -y --no-install-recommends osmium-tool && rm -rf /var/lib/apt/lists/*
ENTRYPOINT []
