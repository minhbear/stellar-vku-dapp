# Build from the repository root:
#   docker build -f apps/escrow/Dockerfile .
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/sharebill/package.json apps/sharebill/
COPY apps/escrow/package.json apps/escrow/
COPY packages/ui/package.json packages/ui/
COPY packages/stellar/package.json packages/stellar/
COPY packages/sharebill-client/package.json packages/sharebill-client/
COPY packages/escrow-client/package.json packages/escrow-client/
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
# Contract ids and network come from defaults in the source, so no build time
# secrets are needed here. MONGODB_URI is read at runtime.
RUN npm run build -w @vku/escrow

FROM node:22-alpine AS run
WORKDIR /repo
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /repo/apps/escrow/.next/standalone ./
COPY --from=build /repo/apps/escrow/.next/static ./apps/escrow/.next/static
EXPOSE 3000
CMD ["node", "apps/escrow/server.js"]
