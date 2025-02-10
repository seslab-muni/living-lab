# Stage 1: Build
FROM node:20-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=living-lab-web --docker

FROM node:20-alpine AS installer
WORKDIR /app
COPY --from=pruner /app/out/json .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/turbo.json ./turbo.json

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full .
RUN npm install -g pnpm
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY --from=builder /app/ .
WORKDIR /app/apps/web
CMD ["pnpm", "start"]