# One image, one origin: the server serves the built client, the WebSocket and
# the Discord token endpoint. A Discord Activity is an iframe pointing at a
# single HTTPS host, so keeping it to one host is what makes the URL mapping a
# single line instead of three.

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/bot/package.json packages/bot/
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY . .

# Baked into the bundle at build time, because Vite substitutes it statically.
# The client *id* is public — it appears in the OAuth URL either way. The
# client secret is not here and must never be: it belongs only in the running
# server's environment.
ARG VITE_DISCORD_CLIENT_ID=""
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID

RUN npm test && npm run typecheck
RUN npm run build --workspace @flens/web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV WEB_DIR=/app/apps/web/dist

# The server runs its TypeScript through tsx, so the sources and the full
# dependency tree both come across rather than a compiled subset.
COPY --from=build /app /app

EXPOSE 8080
USER node
CMD ["npm", "run", "start", "--workspace", "@flens/server"]
