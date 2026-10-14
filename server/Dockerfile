# ------------------------------------------------------------------------------
# Build Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install native compilation dependencies for SQLite
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# ------------------------------------------------------------------------------
# Production Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Create SQLite persistent data volume mount point
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "dist/main.js"]
