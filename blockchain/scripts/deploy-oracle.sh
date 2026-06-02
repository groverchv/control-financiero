#!/bin/bash
# ==============================================================================
# Script de Despliegue Automatizado para Oracle Cloud Free Tier (Ubuntu/Oracle Linux)
# ==============================================================================
# Este script automatiza por completo la instalación de dependencias,
# descarga de binarios de Fabric, inicialización de la red y puesta en marcha
# de la API Gateway utilizando PM2 en segundo plano.
# Soporta tanto Ubuntu (apt) como Oracle Linux (dnf/yum).
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INSTALADOR]${NC} $1"; }
warn() { echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Verificar que corremos como Root/Sudo
if [ "$EUID" -ne 0 ]; then
  error "Por favor, ejecute este script usando sudo: sudo ./deploy-oracle.sh"
fi

log "Detectando gestor de paquetes del sistema..."
if command -v dnf &> /dev/null; then
  PM="dnf"
  log "Sistema basado en Oracle Linux/RHEL (dnf) detectado."
elif command -v yum &> /dev/null; then
  PM="yum"
  log "Sistema basado en Oracle Linux/RHEL (yum) detectado."
elif command -v apt-get &> /dev/null; then
  PM="apt"
  log "Sistema basado en Ubuntu/Debian (apt) detectado."
else
  error "No se encontró un gestor de paquetes soportado (apt, dnf o yum)."
fi

log "Iniciando despliegue automatizado en la nube..."

# 1. Actualizar sistema e instalar paquetes base
if [ "$PM" = "apt" ]; then
  log "Actualizando paquetes del sistema..."
  apt update && apt upgrade -y
  apt install -y curl git uidmap coreutils build-essential
else
  log "Actualizando paquetes del sistema..."
  $PM update -y
  $PM install -y curl git coreutils make gcc gcc-c++
fi

# 2. Instalar Docker y Docker Compose
if ! command -v docker &> /dev/null; then
  log "Instalando Docker Engine..."
  if [ "$PM" = "apt" ]; then
    apt install -y docker.io docker-compose
  else
    # Instalación de Docker en RHEL/Oracle Linux
    $PM install -y yum-utils
    if ! yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo; then
      warn "Fallo al configurar repositorio oficial. Instalando docker nativo de Oracle..."
      $PM install -y docker
    else
      $PM install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      # Enlazar docker-compose
      ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true
    fi
  fi
  systemctl start docker
  systemctl enable docker
  log "Docker instalado y activado correctamente."
else
  log "Docker ya se encuentra instalado."
fi

# 3. Instalar Node.js v18 y npm
  log "Instalando Node.js v18 LTS..."
  if [ "$PM" = "apt" ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    $PM install -y nodejs
  fi
  log "Node.js $(node -v) y npm $(npm -v) instalados."
else
  log "Node.js ya se encuentra instalado: $(node -v)"
fi

# 4. Descargar Binarios y Configuración de Hyperledger Fabric v2.5.0
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOCKCHAIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log "Descargando binarios oficiales de Hyperledger Fabric v2.5.0..."
cd "$BLOCKCHAIN_DIR"

if [ ! -d "bin" ]; then
  curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
  chmod +x install-fabric.sh
  ./install-fabric.sh --fabric-version 2.5.0 binary
  rm install-fabric.sh
  log "Binarios descargados correctamente."
else
  log "Los binarios de Fabric ya existen."
fi

# Exportar binarios al PATH del sistema para la sesión actual y futuras
export PATH="$BLOCKCHAIN_DIR/bin:$PATH"
if ! grep -q "blockchain/bin" ~/.bashrc; then
  echo "export PATH=\"$BLOCKCHAIN_DIR/bin:\$PATH\"" >> ~/.bashrc
  log "PATH de Fabric agregado a ~/.bashrc"
fi

# 5. Dar permisos y levantar la red
log "Levantando contenedores Docker de la Blockchain..."
cd "$SCRIPT_DIR"
chmod +x init-network.sh
./init-network.sh up

# 6. Configurar e iniciar la API Gateway en segundo plano
log "Instalando dependencias de la API Gateway..."
cd "$BLOCKCHAIN_DIR/api"
npm install --omit=dev

log "Instalando PM2 en segundo plano..."
npm install -g pm2

log "Iniciando servidor de API en puerto 3001 con PM2..."
# Detener instancia previa si existe
pm2 delete blockchain-api &> /dev/null || true
pm2 start server.js --name "blockchain-api"
pm2 save
pm2 startup || true

log "=========================================================================="
log "🚀 ¡DESPLIEGUE COMPLETADO CON ÉXITO EN TU SERVIDOR EN LA NUBE! 🚀"
log "=========================================================================="
log "Tu red Hyperledger Fabric y la API Gateway ya están activas."
log ""
log "📢 RECOMENDACIONES IMPORTANTES PARA ORACLE CLOUD:"
warn "1. Recuerda abrir el puerto TCP 3001 en la consola web de Oracle Cloud"
warn "   (Security Lists -> Ingress Rules -> Add Ingress Rule para puerto 3001)."
warn "2. En las variables de tu frontend en Netlify, configura:"
warn "   VITE_BLOCKCHAIN_API_URL=http://<IP_PUBLICA_DE_TU_ORACLE_CLOUD>:3001"
log "=========================================================================="
