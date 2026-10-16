FROM oven/bun:1.4.2-debian@sha256:4f6e31d1a54d6a3dd312daef655fc998101b5043d52e12592ac293ef04b9bc73 AS build
WORKDIR /workspace/apps/api
COPY apps/api/package.json apps/api/bun.lock apps/api/check-bun.mjs ./
RUN bun check-bun.mjs && bun install --frozen-lockfile
COPY apps/api/ .
COPY database/ /workspace/database/
COPY contracts/ /workspace/contracts/
COPY apps/android/app/src/main/assets/ /workspace/apps/android/app/src/main/assets/
# Generar Prisma no necesita una base de datos accesible.
RUN export DATABASE_URL=postgresql://localhost/eventanilla AUTH_CODE_SECRET=0000000000000000000000000000000000000000000000000000000000000000; bun run build && bun test --timeout 15000 test

FROM oven/bun:1.4.2-debian@sha256:4f6e31d1a54d6a3dd312daef655fc998101b5043d52e12592ac293ef04b9bc73 AS production-deps
WORKDIR /workspace/apps/api
COPY apps/api/package.json apps/api/bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:1.4.2-debian@sha256:4f6e31d1a54d6a3dd312daef655fc998101b5043d52e12592ac293ef04b9bc73
ENV NODE_ENV=production HOST=0.0.0.0
WORKDIR /app
COPY --from=production-deps --chown=bun:bun /workspace/apps/api/node_modules ./node_modules
COPY --from=build --chown=bun:bun /workspace/apps/api/dist ./dist
COPY --from=build --chown=bun:bun /workspace/apps/api/resources ./resources
COPY --from=build --chown=bun:bun /workspace/apps/api/package.json ./package.json
COPY --from=build --chown=bun:bun /workspace/apps/api/check-bun.mjs ./check-bun.mjs
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
