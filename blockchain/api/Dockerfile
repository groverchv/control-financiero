# ── Blockchain API Gateway ──────────────────────────────────────────
# Imagen optimizada para producción del API Gateway de auditoría.
# 
# Uso:
#   docker build -t control-financiero-api .
#   docker run -p 3001:3001 --env-file .env control-financiero-api
# ────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS production

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de dependencias primero (cache de capas Docker)
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar código fuente (excluyendo lo definido en .dockerignore)
COPY . .

# Puerto expuesto por el servidor Express
EXPOSE 3001

# Healthcheck para orquestadores (Docker Compose, Kubernetes)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Comando de inicio
CMD ["node", "server.js"]
