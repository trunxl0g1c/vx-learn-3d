# syntax=docker/dockerfile:1

########################################
# deps — shared node_modules install for both the dev and production images.
########################################
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

########################################
# dev — Vite dev server (HMR) against bind-mounted source
# (docker-compose.yml's vx-learn-3d-dev).
########################################
FROM deps AS dev
WORKDIR /app
# Docker Desktop on Windows doesn't reliably forward inotify events for a
# bind-mounted NTFS path into the container, so HMR needs polling to see
# host edits at all — see vite.config.js's watch.usePolling.
ENV VITE_USE_POLLING=true
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

########################################
# build — compile to static assets. VITE_API_URL gets inlined into the JS
# bundle here (Vite replaces import.meta.env.* at build time) — unlike the
# dev server, this can't be changed at container start, only by rebuilding
# with a different --build-arg.
########################################
FROM deps AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

########################################
# production — nginx serving the compiled dist/ (docker-compose.yml's
# vx-learn-3d). No source, no node_modules — immune to source edits, only
# updates when explicitly rebuilt.
########################################
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
