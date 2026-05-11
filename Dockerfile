FROM oven/bun:latest

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src/ ./src/
RUN bun build ./src/server.ts --outdir ./dist --target=bun
RUN mkdir -p /app/data

EXPOSE 8080

CMD ["bun", "./dist/server.js"]