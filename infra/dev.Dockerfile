FROM oven/bun:1.2.13
WORKDIR /app
COPY package.json .
COPY bun.lockb .
RUN bun i
COPY . .
