# ── Frontend React (Vite) ───────────────────────────────────────────
# Multi-stage build: compilación con Node + servicio con Nginx.
# 
# Uso:
#   docker build -t control-financiero-frontend .
#   docker run -p 80:80 control-financiero-frontend
# ────────────────────────────────────────────────────────────────────

# Etapa 1: Compilación
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Copiar configuración personalizada de Nginx para SPA (Single Page App)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
