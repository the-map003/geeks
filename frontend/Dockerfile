# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/
RUN npm ci --workspace frontend --include-workspace-root=false
COPY frontend frontend
WORKDIR /app/frontend
ARG NUXT_PUBLIC_SITE_URL=http://localhost
ENV NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL
RUN npm run build

# ---- runtime ----
FROM node:22-alpine
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/frontend/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
