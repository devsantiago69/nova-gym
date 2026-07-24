FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm db:generate
ARG TARGET=web
RUN pnpm --filter @gymchallenge/${TARGET} build
RUN chown -R node:node /app
USER node
CMD ["pnpm","--filter","@gymchallenge/web","start"]
