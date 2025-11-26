FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN bun install

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "--cwd", "server", "start:server:prod"]