# The website in a container. Used by docker-compose.yml:
#   npm run docker:dev   → "dev" stage: live-reloading dev server on http://localhost:5173
#   npm run docker:prod  → "production" stage: the built site served by nginx on http://localhost:8080
FROM node:22-alpine AS base
WORKDIR /repo
# Install first (only re-runs when package files change), then copy the code.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN npm ci --no-audit --no-fund --workspace @app/web --include-workspace-root
COPY tsconfig.base.json project.config.json ./
COPY apps/web apps/web

FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--workspace", "@app/web", "--", "--host", "0.0.0.0"]

FROM base AS build
# Where the browser finds your backend, and whether to use fake data.
ARG VITE_API_URL
ARG VITE_USE_MOCKS
ENV VITE_API_URL=$VITE_API_URL VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN npm run build --workspace @app/web

FROM nginx:1.27-alpine AS production
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
# nginx fills in ${PORT} at start; hosting services such as Railway or Render set it.
ENV PORT=80
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
