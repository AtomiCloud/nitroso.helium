﻿FROM oven/bun:1.2.13 as builder
WORKDIR /app
COPY package.json .
COPY bun.lockb .
RUN bun i
COPY . .
RUN bun build ./src/index.ts --target bun --outdir ./build

FROM oven/bun:1.2.13
WORKDIR /app
COPY --from=builder /app/build/index.js /app/index.js
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/bun.lockb /app/bun.lockb
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/config /app/config
ENTRYPOINT ["bun", "run", "index.js"]
