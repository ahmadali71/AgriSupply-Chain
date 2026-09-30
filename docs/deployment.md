# AgriSupply Platform Production Deployment Guide

## 1. Containerization & Docker Setup

### 1.1 Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

### 1.2 Web Frontend Dockerfile (`web/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 1.3 Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - NODE_ENV=production
      - DATABASE_URL=./data/agrisupply.db
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    volumes:
      - agrisupply_data:/app/data
    restart: unless-stopped

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  agrisupply_data:
```

---

## 2. Cloud VPS / AWS / GCP Deployment

### Reverse Proxy Configuration (Nginx with SSL):
```nginx
server {
    listen 443 ssl http2;
    server_name agrisupply.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/agrisupply.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agrisupply.yourdomain.com/privkey.pem;

    # Static Web Client
    location / {
        root /var/www/agrisupply/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # REST API
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Real-Time Gateway
    location /ws {
        proxy_pass http://127.0.0.1:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 3. Production Readiness Checklist

1. **Security & Secrets**:
   - Store `JWT_SECRET` and `JWT_REFRESH_SECRET` in AWS Secrets Manager or HashiCorp Vault.
   - Restrict CORS origin in `server.ts` to your production domain.
2. **Database Resilience**:
   - Enable hourly SQLite `.backup` snapshots or replicate to an S3 bucket.
   - For high concurrent write loads, point `DATABASE_URL` to an AWS Aurora PostgreSQL cluster.
3. **Health Monitoring**:
   - Set up synthetic ping monitors polling `GET /api/health` every 60 seconds.
   - Configure alert notifications if `api.uptimeSeconds` resets unexpectedly.
