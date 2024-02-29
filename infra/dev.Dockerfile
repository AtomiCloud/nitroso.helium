FROM oven/bun:1.0.27
WORKDIR /app
COPY package.json .
COPY bun.lockb .
RUN bun i
COPY . .
