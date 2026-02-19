# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN corepack enable &&     if [ -f pnpm-lock.yaml ]; then pnpm i --frozen-lockfile;     elif [ -f package-lock.json ]; then npm ci;     else npm i; fi

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable &&     if [ -f pnpm-lock.yaml ]; then pnpm build; else npm run build; fi

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
# writable storage
RUN mkdir -p /home/data
CMD ["node", "dist/index.js"]
