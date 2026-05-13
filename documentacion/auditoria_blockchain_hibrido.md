# Documentación Técnica: Módulo de Auditoría (Blockchain Híbrido)

**Proyecto:** Control Financiero (ERP Institucional)
**Arquitectura:** React 19 + Supabase + Cloudinary + Hyperledger Fabric (OCI)
**Módulo:** Sellado Inmutable y Auditoría Descentralizada de Registros Financieros
**Autor:** Arquitectura de Software / Technical Lead

---

## 1. Introducción y Arquitectura Híbrida

El sistema "Control Financiero" implementa un modelo de **Blockchain Híbrido** basado en el patrón **Hash-Anchor**. Este enfoque combina la agilidad de las bases de datos relacionales (Supabase/PostgreSQL) con la inmutabilidad y transparencia de una red de registro distribuido (Hyperledger Fabric).

### Stack Tecnológico del Módulo
*   **Frontend:** React 19 (Zustand para estado, Tailwind para UI).
*   **Base de Datos Operativa:** Supabase (PostgreSQL) para CRUD rápido y políticas RLS.
*   **Almacenamiento de Comprobantes:** Cloudinary (CDN de imágenes y documentos).
*   **Capa de Inmutabilidad:** Hyperledger Fabric v2.x desplegado en **Oracle Cloud Infrastructure (OCI)** utilizando instancias ARM (Always Free).

---

## 2. Topología de la Red Fabric en OCI

Para maximizar los recursos del nivel gratuito de Oracle Cloud (4 Cores ARM, 24GB RAM), se propone una arquitectura de red permisionada compacta pero robusta.

### Configuración de Nodos (Instancia OCI ARM)
| Componente | Rol | Recursos Sugeridos |
| :--- | :--- | :--- |
| **Peer0.org1** | Almacena el Ledger (CouchDB) y ejecuta Chaincode. | 2 Cores / 8GB RAM |
| **Orderer.org1** | Servicio de ordenamiento de transacciones (Raft). | 1 Core / 4GB RAM |
| **CA.org1** | Autoridad de Certificación (Identidades y MSP). | 0.5 Core / 2GB RAM |
| **CouchDB** | Base de Datos de Estado (World State). | 0.5 Core / 4GB RAM |

**Optimización:** El uso de **CouchDB** permite realizar consultas enriquecidas sobre los hashes sellados, facilitando las tareas de auditoría externa.

---

## 3. Alcance y Patrón Hash-Anchor

El blockchain **no almacena** los datos personales ni los archivos binarios. Su única función es actuar como un **Ancla de Verdad** inmutable.

### Entidades Protegidas
1.  **Ingreso:** Registro de aportes, cuotas y donaciones.
2.  **Egreso:** Pagos a proveedores, servicios y gastos operativos.
3.  **Activos:** Compras de patrimonio institucional.
4.  **Archivo:** URLs de Cloudinary vinculadas a las transacciones anteriores (evidencia digital).

### El Patrón Hash-Anchor
Cada vez que se registra una transacción crítica, el sistema genera un **Hash SHA-256** compuesto por los campos clave del registro. Este hash se envía a Fabric, mientras que el registro completo permanece en Supabase.
*   **Ledger (Blockchain):** Almacena `[ID_Registro, Hash, Timestamp, UsuarioID]`.
*   **Supabase (DB):** Almacena el registro completo + el `Certificado_Blockchain` (TxID).

---

## 4. Estructura del Chaincode (Smart Contract)

El Smart Contract (desarrollado en Go o Node.js) define la lógica de negocio para el sellado y la consulta.

### Funciones Principales

```typescript
/**
 * Registra un nuevo sello criptográfico en el ledger
 */
async function SellarTransaccion(
    tipo_tabla: string,    // ingreso, egreso, activo, archivo
    id_registro: string,   // UUID de Supabase
    hash_calculado: string,// SHA-256 generado
    id_usuario: string     // Quién realizó la operación
): Promise<string>;

/**
 * Consulta la historia de un registro específico
 */
async function ConsultarSello(id_registro: string): Promise<Sello>;

/**
 * Recupera el historial completo de cambios de un ID (Audit Trail)
 */
async function ObtenerHistorial(id_registro: string): Promise<HistoryRecord[]>;
```

---

## 5. Flujo Técnico de Integración (Ciclo de Vida)

El proceso de registro de un gasto (Egreso) con su respectivo comprobante sigue este flujo estrictamente secuencial:

1.  **Subida de Evidencia (Cloudinary):**
    El usuario (Secretario) selecciona el recibo. El frontend lo sube a Cloudinary y recibe la `secure_url`.
2.  **Persistencia Operativa (Supabase):**
    El frontend envía el JSON con los datos del egreso y la URL a Supabase. Se guarda el registro con estado `pendiente_de_sello`.
3.  **Cálculo de Hash y Anclaje (Edge Function):**
    *   Un **Trigger de Supabase** o una **Edge Function** se dispara al insertar el registro.
    *   Se concatena: `ID + Monto + Fecha + URL_Cloudinary + UsuarioID`.
    *   Se calcula el `SHA-256`.
4.  **Invocación del SDK de Fabric:**
    *   La Edge Function (o un backend intermedio en Node.js) utiliza el **Fabric Gateway SDK**.
    *   Se firma la transacción con el certificado digital del servidor.
    *   Se invoca `SellarTransaccion` en los nodos de OCI.
5.  **Confirmación:**
    Fabric devuelve un `TransactionID`. Supabase actualiza el registro a estado `sellado` e incluye el ID de transacción del blockchain.

---

## 6. Mecanismo de Auditoría y Verificación

El rol de **Socio** puede validar la integridad de los datos sin depender de la buena fe de los administradores de la base de datos Supabase.

### Proceso de Validación Matemática
1.  **Obtención de Datos:** El socio selecciona un registro en el frontend.
2.  **Re-cálculo Local:** El frontend descarga los datos de Supabase y vuelve a generar el Hash SHA-256 localmente usando los mismos parámetros originales.
3.  **Consulta al Ledger:** El frontend realiza una llamada a Fabric (vía API Gateway) para obtener el hash almacenado para ese `ID_Registro`.
4.  **Comparación:**
    *   **Si `Hash_Local === Hash_Blockchain`:** El registro es auténtico e íntegro.
    *   **Si `Hash_Local !== Hash_Blockchain`:** El registro en la base de datos ha sido alterado (ej. se cambió el monto o la URL del archivo después del sellado).

### Beneficios de la Auditoría Descentralizada
Incluso si un atacante obtiene acceso de Superusuario a Supabase y modifica un monto, **no podrá modificar el hash en Hyperledger Fabric**, ya que este último requiere consenso de red y es inmutable por diseño. La discrepancia entre la DB y el Blockchain delatará el fraude de forma inmediata.
