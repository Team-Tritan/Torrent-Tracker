FROM oven/bun:latest

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src/ ./src/

EXPOSE 8080

CMD ["bun", "./src/server.ts"]