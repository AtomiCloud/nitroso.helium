FROM oven/bun:1.0.17-alpine
WORKDIR /app
COPY package.json .
COPY bun.lockb .
RUN bun i
COPY . .
ENTRYPOINT ["bun", "run", "src/index.ts"]
