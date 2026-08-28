# Frontend runtime image: nginx serving the built static assets and proxying
# /api to the backend compose service (single public port, no CORS).

# --- Build stage: build the production bundle with Vite ---
FROM node:22-alpine AS build

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
# The host-generated lock pins `resolved` tarball URLs to the corporate registry
# (artifactory), whose CA is not trusted inside this image, so `npm ci` uses
# those exact URLs and fails. Host-only tweak: rewrite them to the public
# registry on the copy of the lock inside the image (the source lock is untouched).
RUN sed -i 's|https://artifactory\.s\.o3\.ru/artifactory/api/npm/npm-all-virtual/|https://registry.npmjs.org/|g' package-lock.json \
    && npm ci

COPY frontend/ ./
RUN npm run build

# --- Runtime stage: nginx ---
FROM nginx:1.27-alpine

COPY --from=build /frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
