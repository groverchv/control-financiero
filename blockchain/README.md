# Blockchain - Modulo de Auditoria

Implementacion del sistema de auditoria basado en Hyperledger Fabric para el proyecto Control Financiero.

## Arquitectura

```
blockchain/
  chaincode/audit/        # Smart Contract (Node.js)
  network/                # Configuracion Docker de la red Fabric
  api/                    # API Gateway (Express.js)
  scripts/                # Scripts de gestion de la red
```

## Requisitos Previos

1. **Docker Desktop** (v4.0+) con 8GB RAM asignados.
2. **Node.js** v18 o superior.
3. **Binarios de Fabric** v2.5 (peer, configtxgen, cryptogen).

Para instalar los binarios de Fabric:
```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.0 binary
```

## Inicio Rapido

### 1. Levantar la red
```bash
cd blockchain/scripts
chmod +x init-network.sh
./init-network.sh up
```

### 2. Iniciar la API Gateway
```bash
cd blockchain/api
npm install
npm run dev
```

La API estara disponible en `http://localhost:3001`.

### 3. Verificar funcionamiento
```bash
curl http://localhost:3001/api/health
```

### 4. Detener la red
```bash
cd blockchain/scripts
./init-network.sh down
```

## Migracion de Base de Datos

Ejecutar en el Editor SQL de Supabase:
```
supabase/migrations/001_blockchain_audit.sql
```

Este script agrega las columnas `hash_anterior`, `hash_actual` y `blockchain_tx_id` a las tablas `ingreso`, `egreso`, `activos` y `archivo`. Tambien crea los triggers `BEFORE INSERT` que calculan los hashes SHA-256 de forma automatica.

## Variables de Entorno

Agregar al `.env.local` del frontend:
```
VITE_BLOCKCHAIN_API_URL=http://localhost:3001
```

## Endpoints de la API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/audit/sellar` | Registrar un sello en el ledger |
| GET | `/api/audit/sello/:id` | Consultar sello de un registro |
| GET | `/api/audit/historial/:id` | Historial de un registro |
| GET | `/api/audit/tipo/:tabla` | Sellos por tipo de tabla |
| POST | `/api/audit/verificar` | Verificar integridad |
