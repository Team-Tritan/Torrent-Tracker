FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src/ ./src/

RUN bun build ./src/server.ts \
  --outdir ./dist \
  --target=node \
  --bundle

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/src/pages ./dist/pages

RUN mkdir -p /app/data

EXPOSE 8080

CMD ["node", "./dist/server.js"]