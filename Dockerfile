FROM oven/bun:1.0.15-alpine as builder
WORKDIR /app
COPY package.json .
COPY bun.lockb .
RUN bun i
COPY . .
RUN bun build ./src/index.ts --target bun --outdir ./build

FROM oven/bun:1.0.15-alpine
WORKDIR /app
COPY --from=builder /app/build/index.js /app/index.js
ENTRYPOINT ["bun", "run", "index.js"]
