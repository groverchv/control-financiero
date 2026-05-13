#!/bin/bash
# Script de inicializacion de la red Hyperledger Fabric para Control Financiero
# Uso: ./init-network.sh [up|down|restart]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="$SCRIPT_DIR/../network"
CHAINCODE_DIR="$SCRIPT_DIR/../chaincode/audit"
CHANNEL_NAME="auditchannel"

export FABRIC_CFG_PATH="$NETWORK_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[FABRIC]${NC} $1"; }
warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

verificar_dependencias() {
    log "Verificando dependencias..."
    command -v docker >/dev/null 2>&1 || error "Docker no esta instalado."
    command -v docker compose >/dev/null 2>&1 || error "Docker Compose no esta disponible."
    command -v peer >/dev/null 2>&1 || warn "CLI de Fabric (peer) no encontrada. Descarga los binarios de Fabric."
    log "Dependencias verificadas."
}

levantar_red() {
    log "Levantando la red Fabric..."
    cd "$NETWORK_DIR"
    docker compose up -d

    log "Esperando a que los contenedores se inicialicen (15 segundos)..."
    sleep 15

    log "Contenedores activos:"
    docker compose ps
}

detener_red() {
    log "Deteniendo la red Fabric..."
    cd "$NETWORK_DIR"
    docker compose down -v
    log "Red detenida y volumenes eliminados."
}

instalar_chaincode() {
    log "Instalando chaincode de auditoria..."
    cd "$CHAINCODE_DIR"

    if [ ! -d "node_modules" ]; then
        log "Instalando dependencias del chaincode..."
        npm install
    fi

    log "Chaincode listo para ser empaquetado y desplegado."
    warn "Para desplegar el chaincode, ejecute manualmente los comandos de lifecycle."
    warn "Consulte la documentacion en blockchain/README.md para los pasos detallados."
}

mostrar_estado() {
    echo ""
    log "=== Estado de la Red ==="
    docker compose -f "$NETWORK_DIR/docker-compose.yaml" ps 2>/dev/null || warn "No hay contenedores corriendo."
    echo ""
    log "=== Health Check de la API ==="
    curl -s http://localhost:3001/api/health 2>/dev/null | python3 -m json.tool 2>/dev/null || warn "API Gateway no responde."
    echo ""
}

case "${1:-status}" in
    up)
        verificar_dependencias
        levantar_red
        instalar_chaincode
        ;;
    down)
        detener_red
        ;;
    restart)
        detener_red
        levantar_red
        ;;
    status)
        mostrar_estado
        ;;
    *)
        echo "Uso: $0 {up|down|restart|status}"
        exit 1
        ;;
esac
