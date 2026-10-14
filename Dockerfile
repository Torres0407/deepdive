# ------------------------------------------------------------------------------
# Build Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Production Stage: Nginx Alpine
# ------------------------------------------------------------------------------
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled frontend and public assets
COPY --from=build /app/dist /usr/share/nginx/html
# Ensure public frames are in html directory
COPY --from=build /app/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
