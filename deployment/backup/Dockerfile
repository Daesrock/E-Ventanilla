FROM oven/bun:1.4.2-debian@sha256:4f6e31d1a54d6a3dd312daef655fc998101b5043d52e12592ac293ef04b9bc73 AS bun
FROM rclone/rclone:1.75.2@sha256:2687085f718d3c628f7fdfb77c52a1d344332aed543110bb88088f2c70d43eb5 AS rclone
FROM postgres:18-bookworm@sha256:afc7e2d441324c0388fa80c3d24f733b4194a4eb7f47dd8ee2b08eb1a24a647c
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
WORKDIR /work
COPY deployment/backup/run.mjs /work/run.mjs
COPY deployment/backup/restore-check.mjs /work/restore-check.mjs
COPY database/permissions/runtime.sql /work/deploy-permissions.sql
COPY database/postgres/check-permissions.sql /work/check-permissions.sql
RUN useradd --uid 1000 --create-home eventanilla_backup && mkdir /status && chown eventanilla_backup:eventanilla_backup /status
USER eventanilla_backup
CMD ["bun", "/work/run.mjs"]
