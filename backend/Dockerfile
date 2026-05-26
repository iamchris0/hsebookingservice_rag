FROM node:22-alpine
WORKDIR /app

RUN npm install -g pnpm@10.28.1

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3001
CMD ["node_modules/.bin/tsx", "src/index.ts"]
