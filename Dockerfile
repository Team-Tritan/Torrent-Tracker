FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY src/ ./src/

RUN npm install -g typescript
RUN tsc ./src/server.ts --outDir ./dist --esModuleInterop true

EXPOSE 8080

CMD ["node", "./dist/server.js"]