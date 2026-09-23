# The executor talks to the host Docker daemon (mounted socket) to run each
# submission in a throw-away container. It needs the docker CLI only.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY executor/package.json executor/
RUN npm ci --workspace executor --include-workspace-root=false
COPY executor executor
WORKDIR /app/executor
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache docker-cli
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/executor/dist ./executor/dist
COPY --from=build /app/executor/package.json ./executor/package.json
WORKDIR /app/executor
EXPOSE 5000
CMD ["node", "dist/server.js"]
