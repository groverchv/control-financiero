# Plan de Pruebas de Aseguramiento de la Calidad (QA)

Este documento contiene los casos de prueba detallados para cada uno de los requisitos funcionales del sistema. Está diseñado para que un evaluador de QA pueda marcar los pasos y resultados como verificados (`[ ]` para pendiente, `[x]` para superado).

---

## 👥 Módulo 1: Miembros (Administración)

### **TC-1.1: Crear Miembro (RF-1.1)**
- **Objetivo:** Verificar que el administrador pueda registrar a un nuevo socio con todos sus datos válidos.
- **Pasos:**
  - [ ] Navegar a **Administración > Gestión de Miembros**.
  - [ ] Hacer clic en el botón de **Nuevo Miembro**.
  - [ ] Completar los campos requeridos (Nombre, CI, Correo Electrónico, Rol, Profesión, Biografía, Monto de Inscripción).
  - [ ] Hacer clic en **Guardar**.
- **Resultado Esperado:** El miembro se registra correctamente, aparece en la tabla de miembros y se genera automáticamente su primera cuota de membresía en el backend.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-1.2: Editar Miembro (RF-1.2)**
- **Objetivo:** Comprobar que los datos de un miembro existente se actualicen de forma persistente.
- **Pasos:**
  - [ ] Seleccionar un miembro de la lista en **Gestión de Miembros**.
  - [ ] Hacer clic en la opción **Editar**.
  - [ ] Modificar el campo *Teléfono* y cambiar el *Rol* (ej. de socio a secretario).
  - [ ] Presionar **Guardar Cambios**.
- **Resultado Esperado:** Se muestra un mensaje de confirmación y los datos modificados se actualizan en la tabla y en la base de datos.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-1.3: Desactivar o Pausar Socio (RF-1.3)**
- **Objetivo:** Validar que al cambiar el estado del socio a "pausado" o "inactivo", la lógica de cuotas responda correctamente.
- **Pasos:**
  - [ ] Abrir el formulario de edición de un socio activo.
  - [ ] Cambiar el estado a **Inactivo** o establecer una **Pausa**.
  - [ ] Guardar los cambios.
- **Resultado Esperado:** El sistema registra la fecha de inicio de la pausa y detiene la generación de cuotas mensuales automáticas para este socio.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-1.4: Ficha de Detalles (RF-1.4)**
- **Objetivo:** Verificar la integridad de los datos presentados en la vista detallada del socio.
- **Pasos:**
  - [ ] En la lista de miembros, hacer clic en el botón **Detalles** del socio seleccionado.
  - [ ] Inspeccionar que se cargue la biografía completa, profesión, CI y datos de contacto.
- **Resultado Esperado:** La ficha carga correctamente y muestra toda la información ingresada sin distorsiones ni campos vacíos erróneos.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-1.5: Inscripciones de Socio (RF-1.5)**
- **Objetivo:** Comprobar la visualización correcta de los cursos o talleres inscritos por el miembro.
- **Pasos:**
  - [ ] Entrar al perfil de un miembro que posea inscripciones activas.
  - [ ] Navegar a la pestaña o sección de **Inscripciones / Actividades**.
- **Resultado Esperado:** Se listan todos los cursos donde el miembro está registrado, indicando el estado de su participación (confirmada, cancelada).
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-1.6: Estado de Cuenta Individual (RF-1.6)**
- **Objetivo:** Asegurar que los saldos deudores y cuotas del socio coincidan con sus pagos.
- **Pasos:**
  - [ ] Ir a **Administración > Estado de Cuenta**.
  - [ ] Buscar al miembro deseado.
  - [ ] Comparar el total reportado en cuotas pendientes contra el historial de pagos.
- **Resultado Esperado:** El balance debe reflejar exactamente el monto neto pendiente (Cuotas no pagadas + Costo de cursos pendientes - Abonos realizados).
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-1.7: Notificaciones y Alertas (RF-1.7)**
- **Objetivo:** Comprobar la recepción de avisos internos al interactuar con el sistema.
- **Pasos:**
  - [ ] Registrar un evento que requiera notificación (ej. asignar jurado a un socio o dar de alta un nuevo miembro).
  - [ ] Iniciar sesión con el usuario del socio afectado.
  - [ ] Abrir el panel de **Notificaciones**.
- **Resultado Esperado:** Se visualiza el mensaje correspondiente con el título y la descripción correcta en tiempo real.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-1.8: Carga de CV y Documentos (RF-1.8)**
- **Objetivo:** Verificar la subida de documentos del socio al servidor externo.
- **Pasos:**
  - [ ] Entrar al formulario del miembro y buscar la sección de **Documentos**.
  - [ ] Subir un archivo de prueba en formato PDF o imagen (CV).
  - [ ] Guardar y recargar la página.
  - [ ] Hacer clic en el enlace del documento subido.
- **Resultado Esperado:** El archivo se sube exitosamente, la base de datos almacena la URL de Cloudinary y el documento se puede abrir y visualizar correctamente.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

## 🔍 Módulo 2: Búsqueda de Talento (Académico)

### **TC-2.1: Filtros de Habilidades y Profesión (RF-2.1)**
- **Objetivo:** Validar que la búsqueda de talento retorne únicamente a los socios adecuados.
- **Pasos:**
  - [ ] Navegar a **Académico > Buscador de Talento**.
  - [ ] Escribir una profesión específica en el buscador (ej: "Ingeniero").
  - [ ] Aplicar filtros de habilidades/roles si aplica.
- **Resultado Esperado:** El sistema filtra la lista mostrando solo los socios que coinciden con los criterios de búsqueda en sus perfiles.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-2.2: Fichas de Talento Simplificadas (RF-2.2)**
- **Objetivo:** Comprobar que la vista reducida de talentos sea legible y útil.
- **Pasos:**
  - [ ] Realizar una búsqueda en el Buscador de Talento.
  - [ ] Verificar el diseño y contenido de las tarjetas de los resultados.
- **Resultado Esperado:** La tarjeta del socio muestra su profesión, foto/avatar, biografía resumida e historial clave de forma limpia y responsiva.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

## 📅 Módulo 3: Actividades (Académico)

### **TC-3.1: Registro de Actividades (RF-3.1)**
- **Objetivo:** Asegurar que se puedan programar eventos institucionales con los parámetros requeridos.
- **Pasos:**
  - [ ] Ir a **Académico > Gestión de Actividades**.
  - [ ] Crear un nuevo curso/evento con cupos=5, costo=50, modalidad="presencial".
  - [ ] Guardar el registro.
- **Resultado Esperado:** La actividad se inserta de forma correcta en estado "programado".
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-3.2: Asignación de Ubicación con Mapa (RF-3.2)**
- **Objetivo:** Verificar la captura de coordenadas geográficas en el mapa interactivo.
- **Pasos:**
  - [ ] En la creación/edición de una actividad presencial, abrir el selector del mapa.
  - [ ] Hacer clic sobre un punto geográfico del mapa.
  - [ ] Guardar la actividad y volver a abrirla.
- **Resultado Esperado:** Las coordenadas de latitud y longitud se guardan de manera precisa y el marcador permanece en la posición seleccionada.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-3.3: Control de Inscripciones y Cupos (RF-3.3)**
- **Objetivo:** Validar que el trigger de base de datos reste y sume cupos de forma consistente.
- **Pasos:**
  - [ ] Consultar una actividad con 10 cupos disponibles.
  - [ ] Inscribir a un miembro a dicha actividad.
  - [ ] Verificar la cantidad de cupos actuales de la actividad.
  - [ ] Cambiar el estado de la inscripción a **Cancelado** y volver a comprobar los cupos.
- **Resultado Esperado:** Al inscribirse, los cupos disminuyen a 9. Al cancelar la inscripción, los cupos vuelven a aumentar a 10.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-3.4: Asignación de Jurados (RF-3.4)**
- **Objetivo:** Probar la funcionalidad de vincular evaluadores y el despacho de la notificación.
- **Pasos:**
  - [ ] Ir a **Asignar Jurado** dentro del módulo académico.
  - [ ] Elegir a un socio y asociarlo a una actividad seleccionada.
  - [ ] Guardar la asignación.
- **Resultado Esperado:** El sistema registra al jurado y emite de inmediato una notificación interna al socio asignado.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-3.5: Historial de Actividades (RF-3.5)**
- **Objetivo:** Verificar que el estado de las actividades cambie automáticamente por fecha.
- **Pasos:**
  - [ ] Crear una actividad con fecha de ayer y estado inicial "programado".
  - [ ] Consultar la tabla de actividades del sistema.
- **Resultado Esperado:** El trigger del sistema actualiza el estado de la actividad a "finalizado" automáticamente por transcurso de fecha.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

## 🏢 Módulo 4: Activos (Patrimonio)

### **TC-4.1: Catálogo de Activos (RF-4.1)**
- **Objetivo:** Evaluar la creación de registros de bienes y deudas institucionales.
- **Pasos:**
  - [ ] Ir a **Patrimonio > Gestión de Activos**.
  - [ ] Registrar un activo de costo total de 1000 y saldo pendiente de 1000.
- **Resultado Esperado:** El activo se guarda en estado "deuda" en el catálogo.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-4.2: Plan de Amortización (RF-4.3)**
- **Objetivo:** Comprobar la generación de cuotas mensuales para financiar un bien.
- **Pasos:**
  - [ ] En la ficha del activo de prueba, generar un plan de amortización a 5 cuotas.
- **Resultado Esperado:** El sistema crea 5 cuotas consecutivas con fechas de vencimiento espaciadas mensualmente y con un costo fraccionado equivalente a la deuda.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-4.3: Gestión de Deudas de Activos (RF-4.4)**
- **Objetivo:** Verificar la conciliación automática del saldo del activo al registrar egresos.
- **Pasos:**
  - [ ] Registrar un **Egreso** por un monto de 400 y asociarlo al Activo creado (saldo deudor original = 1000).
  - [ ] Verificar el estado del Activo en el catálogo.
  - [ ] Registrar otro **Egreso** por 600 asociado al mismo activo.
- **Resultado Esperado:** Tras el primer egreso, el saldo pendiente del activo baja a 600. Tras el segundo egreso (saldo = 0), el estado del activo cambia automáticamente a "pagado".
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

## 💰 Módulo 5: Financiero (Ingresos, Egresos y Cuotas)

### **TC-5.1: Registro de Ingresos (RF-5.1)**
- **Objetivo:** Probar el registro de ingresos ordinarios y extraordinarios.
- **Pasos:**
  - [ ] Ir a **Finanzas > Registro de Ingresos**.
  - [ ] Completar el formulario de ingreso indicando el miembro pagador, monto, fecha y tipo de ingreso.
- **Resultado Esperado:** El ingreso se almacena y se actualiza el flujo de caja reflejado en los totales del sistema.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-5.2: Registro de Egresos (RF-5.2)**
- **Objetivo:** Probar el registro de egresos y arqueo de caja.
- **Pasos:**
  - [ ] Ir a **Finanzas > Registro de Egresos**.
  - [ ] Rellenar el concepto y monto del egreso. Guardar.
- **Resultado Esperado:** El egreso se resta de los saldos generales y queda documentado en la bitácora financiera.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-5.3: Gestión y Generación de Cuotas (RF-5.3)**
- **Objetivo:** Comprobar la imposibilidad de duplicar cuotas por periodo para el mismo socio.
- **Pasos:**
  - [ ] Intentar insertar manualmente dos cuotas para el miembro "X" en el período "2026-08".
- **Resultado Esperado:** La base de datos rechaza la segunda inserción debido a la restricción única `uq_cuota_miembro_periodo`, arrojando una alerta controlada.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-5.4: Administración de Códigos QR de Pago (RF-5.5)**
- **Objetivo:** Comprobar que los socios tengan acceso a los códigos QR correctos para transferencias rápidas.
- **Pasos:**
  - [ ] Administrador: Subir un código QR de pago para "Cuotas Ordinarias".
  - [ ] Socio: Iniciar sesión y entrar a su panel.
- **Resultado Esperado:** El socio puede ver e interactuar con el código QR exacto asignado para el pago rápido de sus cuotas ordinarias.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-5.5: Reportes Financieros y Exportación (RF-5.6)**
- **Objetivo:** Validar la precisión de los gráficos y la descarga de documentos PDF/Excel.
- **Pasos:**
  - [ ] Ir a **Finanzas > Reportes Financieros**.
  - [ ] Hacer clic en **Exportar a PDF** y luego en **Exportar a Excel**.
- **Resultado Esperado:** Se descargan ambos archivos con el formato correcto, conteniendo todos los ingresos y egresos registrados en el rango de fechas seleccionado.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

## 🛡️ Módulo 6: Auditoría y Copias de Seguridad

### **TC-6.1: Copias de Seguridad - Backup (RF-6.1)**
- **Objetivo:** Asegurar que se pueda resguardar la base de datos ante incidentes.
- **Pasos:**
  - [ ] Ir a **Auditoría > Backup**.
  - [ ] Hacer clic en el botón de **Generar y Descargar JSON** y **SQL**.
- **Resultado Esperado:** El navegador descarga archivos estructurados que contienen los esquemas públicos de la base de datos y toda la información acumulada.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`

---

### **TC-6.2: Bitácora de Transacciones y Cambios (RF-6.2)**
- **Objetivo:** Comprobar la trazabilidad de las modificaciones.
- **Pasos:**
  - [ ] Realizar una modificación crítica (ej. anular un ingreso).
  - [ ] Consultar el panel de auditoría / bitácora de cambios.
- **Resultado Esperado:** Queda registrado el cambio con la fecha, el usuario que ejecutó la acción y el estado anterior/nuevo del registro.
- **Estado:** `[ ] Pendiente` / `[ ] Aprobado` / `[ ] Fallido`
