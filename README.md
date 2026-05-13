# AlertaComunal

Plataforma SaaS municipal para registrar, georreferenciar, gestionar y hacer seguimiento de emergencias comunales.

**Demo en vivo:** [https://alerta-comunal-production.up.railway.app](https://alerta-comunal-production.up.railway.app)

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| UI | React 18 + Tailwind CSS 3 |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | JWT con jose (cookies httpOnly) |
| Mapas | Leaflet + React-Leaflet + OpenStreetMap |
| Geocodificación | Google Maps Places API (autocomplete) + Nominatim (reverse) |
| Validaciones | Zod + React Hook Form |
| Deploy | Railway |

## Funcionalidades

- Login seguro con roles (SUPER_ADMIN, ADMIN, OPERADOR, VISUALIZADOR) y rate limiting Redis distribuido (5 intentos / 15 min, fallback a memoria)
- Dashboard con KPIs en tiempo real vía SSE — reconexión automática, indicador "En vivo", sin polling
- CRUD completo de emergencias con código automático (EMG-2026-XXXX) y paginación (50/página)
- Mapa interactivo con marcadores por prioridad (interno y público ciudadano sin login)
- Subida de evidencias fotográficas (local o MinIO/S3) con limpieza automática al eliminar emergencias
- Gestión de tareas por emergencia con historial de actividad completo
- Formulario ciudadano público en `/reportar` (sin login) con GPS, geocodificación y foto opcional; rate limiting 5 reportes/IP/15min
- Mapa público ciudadano en `/mapa-publico` (sin login) con emergencias activas; rate limiting 60 req/IP/5min
- Consulta pública de estado en `/consulta` (sin login); rate limiting 30 req/IP/10min
- Reporte imprimible/PDF por emergencia con historial completo y bloque de firma
- Exportación CSV con filtros activos; PII oculto para VISUALIZADOR
- Filtros avanzados: estado, prioridad, tipo, sector, rango de fechas, texto libre
- Notificaciones por correo (Resend) con preferencias configurables por usuario
- **Panel de auditoría de seguridad** (`/admin/auditoria`) — log permanente de eventos críticos del sistema
- **Panel de uso por municipalidad** — 6 KPIs, distribución por tipo, emergencias recientes
- Validación de usuario activo en cada request — bloqueo inmediato sin esperar expiración JWT

## Administración SaaS

### Roles del sistema

| Rol | Descripción | Scope |
|-----|-------------|-------|
| `SUPER_ADMIN` | Administra toda la plataforma | Global — ve todas las municipalidades |
| `ADMIN` | Administra su municipalidad | Municipal — solo su municipalidad |
| `OPERADOR` | Gestiona emergencias | Municipal — solo su municipalidad |
| `VISUALIZADOR` | Solo consulta | Municipal — solo su municipalidad |

### Panel de Super Administrador (`/admin`)

Disponible solo para `SUPER_ADMIN`. Incluye:

- **Dashboard global**: total de municipalidades, usuarios y emergencias en toda la plataforma
- **Municipalidades** (`/admin/municipalidades`): listado con emergencias activas por municipio, crear, editar, activar/desactivar
- **Detalle de municipalidad** (`/admin/municipalidades/[id]`): 6 KPIs operacionales, distribución por tipo de emergencia con barras horizontales, emergencias recientes, gestión de usuarios
- **Usuarios** (`/admin/usuarios`): listado global, crear, editar rol/municipalidad, activar/desactivar, cambiar contraseña
- **Auditoría** (`/admin/auditoria`): log permanente de eventos de seguridad — EMERGENCY_DELETED, LOGIN_FAILED, RATE_LIMIT_HIT, EMAIL_SENT/FAILED; filtrable y paginado

### Gestión de municipalidades

Campos: nombre, slug (único), región, comuna, activo.

Reglas:
- El slug solo puede contener letras minúsculas, números y guiones (ej: `santiago-sur`)
- No se permite borrado físico — solo activar/desactivar
- Si se desactiva una municipalidad, sus usuarios siguen en la DB pero no deben operar
- El slug no debe cambiarse si está en uso como `PUBLIC_DEFAULT_MUNICIPALITY_SLUG`

### Gestión de usuarios

Campos: nombre, email, contraseña (al crear), rol, municipalidad, activo, preferencias de notificación.

Reglas:
- `SUPER_ADMIN` puede crear usuarios de cualquier rol
- `ADMIN`, `OPERADOR` y `VISUALIZADOR` **requieren** `municipalityId`
- `SUPER_ADMIN` opera sin municipalidad asignada
- No se permite borrado físico de usuarios
- Cada usuario puede configurar `emailOnAssigned` y `emailOnNewReport` (ambos activos por defecto)

### Scope por municipalidad

- `SUPER_ADMIN` ve emergencias, usuarios y métricas de **todas** las municipalidades
- `ADMIN` ve solo los datos de **su municipalidad**
- `OPERADOR` y `VISUALIZADOR` igual
- Un usuario sin municipalidad asignada (no `SUPER_ADMIN`) recibe 403 en todas las operaciones

### Cómo agregar una nueva municipalidad

1. Iniciar sesión como `SUPER_ADMIN`
2. Ir a `/admin/municipalidades` → **Nueva municipalidad**
3. Completar nombre, slug, región, comuna
4. Crear usuarios `ADMIN`, `OPERADOR` y `VISUALIZADOR` asignados a esa municipalidad
5. El admin municipal puede iniciar sesión y gestionar emergencias de su municipalidad

## Demo municipal

AlertaComunal incluye un conjunto de funcionalidades orientadas a la presentación ante municipios y servicios públicos.

### Dashboard ejecutivo

El dashboard muestra métricas operacionales en tiempo real:

- **Tarjetas de estado:** total, nuevas, en atención, resueltas, cerradas, críticas activas
- **Métricas de período:** emergencias registradas y cerradas en los últimos 7 días
- **Tasa de resolución:** porcentaje de emergencias resueltas o cerradas sobre el total
- **Tiempo promedio de cierre:** promedio en días desde creación hasta cierre
- **Distribución por tipo:** barras horizontales con todos los tipos de emergencia
- **Distribución por prioridad:** barras con colores por nivel de criticidad (crítica, alta, media, baja)

Todos los indicadores respetan el scope municipal: OPERADOR y VISUALIZADOR solo ven datos de su municipalidad; ADMIN ve solo los datos de su municipalidad. SUPER_ADMIN ve todas las municipalidades.

### Exportación CSV

Desde el listado de emergencias, el botón **Exportar CSV** descarga un archivo con todos los registros visibles aplicando los filtros activos:

- Ruta: `GET /api/emergencias/export`
- Respeta scope municipal (nunca expone datos de otra municipalidad)
- Respeta todos los filtros: estado, prioridad, tipo, sector, búsqueda de texto, rango de fechas
- Columnas: código, título, tipo, prioridad, estado, dirección, sector, origen, responsable, fecha creación, fecha ocurrencia, fecha cierre
- **Columnas de PII (reportante, teléfono):** visibles para SUPER_ADMIN, ADMIN y OPERADOR; **ocultas para VISUALIZADOR**
- Codificación UTF-8 con BOM (compatible con Excel en español)

### Filtros por rango de fecha

El listado de emergencias acepta filtros `desde` y `hasta` sobre el campo `createdAt`. Compatible con todos los filtros existentes (estado, prioridad, tipo, sector, búsqueda). Los filtros también se aplican al CSV exportado.

### Reportes imprimibles

El reporte de cada emergencia (`/emergencias/[id]/reporte`) está diseñado para impresión institucional:

- Encabezado con logo AlertaComunal, nombre de municipalidad, comuna y región
- Código de emergencia destacado y fecha de emisión
- Datos organizados en dos columnas (datos generales + ubicación)
- Tabla de tareas con estado y responsable
- Galería de evidencias fotográficas
- **Historial de actividad completo** con fecha, descripción y usuario responsable de cada cambio
- **Bloque de firma** con espacio para firma del responsable municipal y timbre de unidad
- Compatible con impresión desde navegador (Ctrl+P / Cmd+P) y guardar como PDF usando el diálogo de impresión del sistema operativo (no hay generación de PDF server-side)

### Formulario ciudadano (`/reportar`)

- Acceso público sin login
- Selección de región y comuna para contextualizar la búsqueda
- Autocompletado de dirección en tiempo real con Google Maps Places (restricción a Chile)
- Botón GPS para obtener coordenadas del dispositivo + reverse geocoding con Nominatim
- Mini-mapa Leaflet con pin arrastrable para ajuste fino de ubicación
- Foto opcional (se sube a MinIO/S3 o almacenamiento local)
- Genera código único de seguimiento (EMG-YYYY-XXXX)
- Asigna automáticamente la municipalidad activa por región/comuna, o la municipalidad demo como fallback
- Header con links a Ver mapa (`/mapa-publico`) y Consultar reporte (`/consulta`)

### Mapa público ciudadano (`/mapa-publico`)

- Acceso público sin login, sin datos sensibles
- Muestra todas las emergencias activas (NUEVA, EN_ATENCIÓN) con coordenadas
- Tarjetas de estadísticas: total activas, nuevas, en atención
- Leyenda de prioridad por colores (verde/amarillo/naranja/rojo)
- Mapa Leaflet con marcadores por prioridad (igual que el mapa interno)
- Tabla listado bajo el mapa: código, título, tipo, dirección, estado
- Filtrado por municipalidad vía `PUBLIC_DEFAULT_MUNICIPALITY_SLUG`
- Máximo 300 emergencias por consulta, ordenadas por fecha de creación desc
- No expone datos de reportantes ni campos internos

### Consulta ciudadana (`/consulta`)

- Búsqueda por código único
- Devuelve solo campos públicos: estado, tipo, dirección, fechas
- No expone usuarios internos, teléfonos ni historial de actividad

### Separación por municipalidad

- OPERADOR y VISUALIZADOR solo ven emergencias, usuarios y estadísticas de su municipalidad
- ADMIN solo ve los datos de su municipalidad (no es vista global)
- Solo SUPER_ADMIN tiene scope global sobre todas las municipalidades
- El sidebar muestra nombre, comuna y región de la municipalidad activa
- Los usuarios sin municipalidad asignada reciben 403 en todas las operaciones
- Los usuarios desactivados quedan bloqueados inmediatamente (validación contra DB en cada request, no requiere expiración del JWT)

## Instalación local

### Prerequisitos
- Node.js 18+
- PostgreSQL 14+

### 1. Clonar e instalar

```bash
git clone https://github.com/pintoco/alerta-comunal.git
cd alerta-comunal
npm install
```

### 2. Variables de entorno

Crea un archivo `.env` en la raíz:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/alertacomunal"
JWT_SECRET="genera-un-secreto-seguro-con-openssl-rand-base64-32"
APP_URL="http://localhost:3000"
PUBLIC_DEFAULT_MUNICIPALITY_SLUG=demo
STORAGE_PROVIDER=local
MAX_UPLOAD_SIZE_MB=5
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="tu-api-key-de-google-maps"
# Correo (opcional — si no se configura, las emergencias se crean igual)
RESEND_API_KEY="re_xxxx"
EMAIL_FROM=tecnico@elementalpro.cl
EMAIL_ENABLED=false
# Demo (opcional — solo para presentaciones, nunca en producción real)
NEXT_PUBLIC_DEMO_MODE=false
```

> Sin `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` el formulario funciona (GPS y mini-mapa siguen operativos) pero el autocompletado de dirección no aparece.
> Sin `RESEND_API_KEY` o con `EMAIL_ENABLED=false` los correos no se envían, pero las emergencias se crean correctamente.

### 3. Inicializar base de datos

```bash
# Aplica migraciones y carga datos iniciales (todo en uno)
npm run prisma:setup
```

### 4. Crear carpeta de uploads

```bash
mkdir -p public/uploads
```

### 5. Iniciar en desarrollo

```bash
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000)

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto JWT — **obligatorio en producción** | Cadena aleatoria 32+ chars (`openssl rand -base64 32`) |
| `APP_URL` | URL base de la aplicación | `http://localhost:3000` |
| `PUBLIC_DEFAULT_MUNICIPALITY_SLUG` | Slug de municipalidad para reportes ciudadanos | `demo` |
| `STORAGE_PROVIDER` | Backend de almacenamiento de archivos | `local` |
| `MAX_UPLOAD_SIZE_MB` | Tamaño máximo de upload en MB | `5` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | API key de Google Maps (Places + Geocoding). Sin ella el autocompletado se desactiva. | Activar en Google Cloud Console: Maps JavaScript API + Places API |
| `RESEND_API_KEY` | API key de Resend para envío de correos. Obligatoria solo si `EMAIL_ENABLED=true`. | `re_xxxx...` |
| `EMAIL_FROM` | Remitente de los correos automáticos. El dominio debe estar verificado en Resend. Default: `tecnico@elementalpro.cl`. | `notificaciones@midominio.cl` |
| `EMAIL_ENABLED` | Activa el envío de correos. Si es `false` o no está, no se envían correos. | `true` / `false` |
| `REDIS_URL` | URL de conexión Redis para rate limiting distribuido (multi-instancia). Opcional — sin ella el rate limiting usa memoria in-process (suficiente para instancia única). | `redis://user:pass@host:6379` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` muestra el panel QuickLogin en la página principal con credenciales precargadas. **No usar en producción real.** Default: `false`. | `true` / `false` |

## Comandos disponibles

```bash
npm run dev                 # Desarrollo con hot-reload
npm run build               # Build para producción
npm run start               # Iniciar servidor de producción
npm run lint                # Verificar código
npm run prisma:generate     # Generar cliente Prisma
npm run prisma:push         # Sincronizar schema directo (solo desarrollo, sin migraciones)
npm run prisma:migrate      # Aplicar migraciones pendientes (prisma migrate deploy)
npm run prisma:migrate:dev  # Crear nueva migración en desarrollo (prisma migrate dev)
npm run prisma:seed         # Cargar datos de ejemplo
npm run prisma:setup        # migrate deploy + seed (todo en uno)
```

## Deploy en Railway

### Paso 1: Repositorio GitHub

```bash
git clone https://github.com/pintoco/alerta-comunal.git
```

### Paso 2: Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo** → selecciona `alerta-comunal`

### Paso 3: Agregar PostgreSQL

En el proyecto Railway: **New** → **Database** → **PostgreSQL**

Railway vincula automáticamente la variable `DATABASE_URL` al servicio.

### Paso 4: Variables de entorno

En **Variables** del servicio agrega:

```
JWT_SECRET=<genera con: openssl rand -base64 32>
APP_URL=https://tu-app.up.railway.app
PUBLIC_DEFAULT_MUNICIPALITY_SLUG=demo
STORAGE_PROVIDER=local
MAX_UPLOAD_SIZE_MB=5
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<tu key de Google Cloud Console>
RESEND_API_KEY=<tu API key de Resend>
EMAIL_FROM=tecnico@elementalpro.cl
EMAIL_ENABLED=true
```

> `RESEND_API_KEY` y `EMAIL_ENABLED=true` son opcionales. Sin ellas las emergencias se crean correctamente pero no se envían correos.

### Paso 4b (opcional): Volumen para imágenes persistentes

Railway elimina archivos al redesplegar. Para conservar las imágenes subidas:

1. En el proyecto Railway → **New** → **Volume**
2. Configura el mount path: `/app/public/uploads`
3. Railway montará el volumen en ese directorio automáticamente

Sin volumen, las imágenes se pierden en cada deploy (el reporte se crea igualmente, solo se pierde el archivo).

> **No agregar `NODE_ENV`** como variable de servicio. Railway inyecta un valor no estándar que confunde a Next.js. El script de build ya incluye `NODE_ENV=production next build` para forzar el modo correcto.

### Paso 5: Configurar comandos en Railway Settings

| Campo | Valor |
|-------|-------|
| Build Command | `npm run build` |
| Start Command | `npm run start` |
| Release Command | `npx prisma migrate deploy && npx prisma db seed` |

> El `postinstall` ejecuta `prisma generate` automáticamente al hacer `npm install`.

> **Primera vez con DB ya existente** (creada con `prisma db push`): ejecutar una sola vez antes de cambiar el Release Command:
> ```bash
> railway run npx prisma migrate resolve --applied 20260512000000_init
> ```
> Esto marca la migración inicial como ya aplicada sin re-ejecutar el SQL.

### Paso 6: Deploy

Railway detecta el push a `main` y despliega automáticamente. El primer deploy tarda ~2-4 minutos.

## Usuarios demo

| Email | Contraseña | Rol | Scope |
|-------|-----------|-----|-------|
| `superadmin@alertacomunal.cl` | `SuperAdmin123` | SUPER_ADMIN | Global — gestiona toda la plataforma |
| `ppinto@elementalpro.cl` | `Admin123456` | ADMIN | Municipalidad Demo |
| `mgonzalez@alertacomunal.cl` | `Operador123` | OPERADOR | Municipalidad Demo |
| `cmartinez@alertacomunal.cl` | `Operador123` | OPERADOR | Municipalidad Demo |
| `visualizador@alertacomunal.cl` | `Visualizador123` | VISUALIZADOR | Municipalidad Demo |

**Formulario ciudadano público:** `/reportar` (no requiere login)
**Consulta de estado:** `/consulta` (no requiere login — ingrese el código de seguimiento)

## Estructura del proyecto

```
alerta-comunal/
├── prisma/
│   ├── schema.prisma          # Modelos: Municipality, User, Emergency, Task, Evidence, ActivityLog, AuditLog
│   ├── migrations/
│   │   ├── migration_lock.toml
│   │   └── 20260512000000_init/migration.sql
│   └── seed.ts                # Admin + operadores + municipalidades + emergencias de ejemplo
├── public/
│   └── uploads/               # Imágenes subidas localmente (gitignored)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Login, logout, session
│   │   │   ├── emergencias/   # CRUD emergencias + estado + export CSV
│   │   │   ├── tareas/        # CRUD tareas por emergencia
│   │   │   ├── evidencias/    # Subida y eliminación de evidencias
│   │   │   ├── reporte-publico/ # GET (consulta por código) + POST (nuevo reporte ciudadano)
│   │   │   ├── mapa-publico/  # GET emergencias activas (público, sin auth)
│   │   │   ├── dashboard/     # stats/ (KPIs snapshot) + stream/ (SSE tiempo real)
│   │   │   └── admin/         # CRUD municipalidades, usuarios y audit-log (SUPER_ADMIN)
│   │   ├── dashboard/         # Dashboard con estadísticas en tiempo real
│   │   ├── emergencias/       # Listado, nueva, detalle, editar, reporte PDF
│   │   ├── mapa/              # Mapa interactivo interno (requiere login)
│   │   ├── mapa-publico/      # Mapa público ciudadano (sin login)
│   │   ├── reportar/          # Formulario público ciudadano (con geocodificación y foto)
│   │   ├── consulta/          # Consulta pública de estado por código
│   │   ├── admin/             # Panel SUPER_ADMIN: municipalidades, usuarios y auditoría
│   │   ├── login/             # Autenticación
│   │   ├── not-found.tsx      # Página 404
│   │   └── layout.tsx         # Layout raíz
│   ├── components/
│   │   ├── admin/             # UserForm, MunicipalityForm, MunicipalityToggle, UserToggle
│   │   ├── dashboard/         # DashboardClient (SSE client), StatsCard, KPICards
│   │   ├── demo/              # QuickLogin (visible solo si NEXT_PUBLIC_DEMO_MODE=true)
│   │   ├── emergencies/       # EmergencyForm, EmergencyTable, EmergencyFilters,
│   │   │                      # TaskList, EvidenceGallery, PrintButtons,
│   │   │                      # LocationPicker (GPS+geocoding+mapa), MiniMap (Leaflet)
│   │   ├── layout/            # Sidebar, Header, MainLayout
│   │   ├── map/               # MapWrapper (client), EmergencyMap (Leaflet)
│   │   └── ui/                # Button, Modal, Alert, Loading
│   ├── lib/
│   │   ├── auth.ts            # JWT / sesión (jose)
│   │   ├── audit.ts           # writeAuditLog() — helper fire-and-forget para AuditLog
│   │   ├── config.ts          # Configuración centralizada (municipalityConfig)
│   │   ├── dashboard.ts       # getDashboardStats() — queries optimizadas para KPIs
│   │   ├── email.ts           # Resend: sendEmergencyAssignmentEmail, sendMunicipalityNewReportEmail
│   │   ├── permissions.ts     # requireAuth, requireRole, requireSuperAdmin, MANAGE_ROLES
│   │   ├── prisma.ts          # Singleton cliente Prisma
│   │   ├── redis.ts           # getRedisClient() — singleton ioredis con fallback a null
│   │   ├── tenant.ts          # getMunicipalityFilter, requireMunicipalityAssigned
│   │   ├── utils.ts           # Labels, formatters (client-safe, sin Prisma)
│   │   ├── generate-code.ts   # Generador de códigos EMG (server-only)
│   │   ├── rate-limit.ts      # Rate limiter Redis/memoria con fallback automático
│   │   ├── storage/
│   │   │   ├── index.ts       # Abstracción: validateFile, saveUpload, deleteUpload
│   │   │   ├── local.ts       # Provider local (public/uploads)
│   │   │   └── s3.ts          # Provider MinIO/S3 (@aws-sdk/client-s3)
│   │   └── validations/       # Schemas Zod (emergency, user, municipality)
│   ├── data/
│   │   └── chile-regions-communes.ts  # Dataset oficial de regiones y comunas de Chile
│   └── types/
│       └── index.ts           # Interfaces TypeScript
├── middleware.ts               # Protección de rutas JWT
└── ...config files
```

## Notas técnicas

- **Auth:** JWT en cookies httpOnly con `jose`. Sin NextAuth.
- **Rate limiting:** Implementado en `src/lib/rate-limit.ts` con dos backends intercambiables. Cuando `REDIS_URL` está configurado usa Redis (patrón atómico `INCR` + `PEXPIRE`) — distribuido y correcto con múltiples réplicas. Sin `REDIS_URL`, cae en modo in-memory (`Map`) — suficiente para instancia única. Máximo 5 intentos de login por IP en ventana de 15 minutos; se reinicia al lograr acceso exitoso. El cambio entre backends es transparente para el endpoint de login.
- **Geolocalización:** Componente `LocationPicker` compartido entre `/reportar` y el formulario interno. Ofrece tres modos: (1) **autocompletado Google Maps Places** — al escribir en el input se muestran sugerencias restringidas a Chile (`componentRestrictions: { country: 'cl' }`), al seleccionar se obtienen coordenadas exactas de la API de Google; (2) botón **GPS** que llama a `navigator.geolocation` y hace reverse geocoding con Nominatim para obtener la dirección textual; (3) **mini-mapa Leaflet con pin arrastrable** — al mover el pin se actualiza la dirección automáticamente por reverse geocoding. El contexto de región/comuna se muestra como hint pero la restricción al país la aplica Google directamente.
- **Mapa:** `dynamic()` con `ssr: false` solo puede usarse en Client Components. El Server Component `mapa/page.tsx` usa `<MapWrapper>` que internamente hace el dynamic import. El mini-mapa del `LocationPicker` usa el mismo patrón (`MiniMap.tsx` importado con `dynamic`).
- **Prisma en cliente:** `utils.ts` no importa Prisma. La función `generateEmergencyCode()` vive en `generate-code.ts` (server-only) para evitar bundling issues.
- **Race condition en códigos:** La función `generateEmergencyCode()` usa `COUNT` (no atómico). Los endpoints POST de emergencias implementan un loop de reintentos (máx. 3) capturando el error Prisma P2002 en el campo `code`.
- **Migraciones controladas:** El proyecto usa `prisma migrate deploy` con archivos versionados en `prisma/migrations/`. El Release Command de Railway las aplica automáticamente en cada deploy. Para crear una nueva migración en desarrollo: `npm run prisma:migrate:dev`.
- **AuditLog permanente:** La tabla `AuditLog` no tiene FK constraints para sobrevivir a eliminaciones en cascada de emergencias o usuarios. Usa campos denormalizados (`userId`, `userName`, `entityId`, `entityLabel`) como strings planos. El helper `src/lib/audit.ts` es fire-and-forget.
- **NODE_ENV en Railway:** Railway inyecta un valor no estándar en `NODE_ENV` durante el build, lo que hace que Next.js use el runtime de desarrollo y crashee en el pre-rendering. El build script usa `NODE_ENV=production next build` para forzar el runtime de producción correcto. No configurar `NODE_ENV` como variable de servicio en Railway.
- **Almacenamiento de imágenes:** Railway usa filesystem efímero. Con `STORAGE_PROVIDER=local` las imágenes se pierden en cada redeploy salvo que se use un Railway Volume. Con `STORAGE_PROVIDER=s3` las imágenes se guardan en MinIO/S3 y la URL pública se persiste en PostgreSQL. Ver sección "Almacenamiento de evidencias" más abajo.

## Almacenamiento de evidencias

El sistema soporta dos proveedores. Se selecciona con `STORAGE_PROVIDER`.

### Modo local (por defecto)

Adecuado para desarrollo y prototipos simples.

```env
STORAGE_PROVIDER=local
MAX_UPLOAD_SIZE_MB=5
```

> **Advertencia Railway:** `public/uploads` no es persistente si no se configura un Volume. Los archivos se pierden en cada redeploy. Para persistencia, crea un Volume en Railway montado en `/app/public/uploads`.

### Modo MinIO/S3

Recomendado para Railway en producción o prototipos estables.

```env
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://minio.midominio.cl
S3_REGION=us-east-1
S3_BUCKET=alerta-comunal-evidencias
S3_ACCESS_KEY_ID=tu_access_key
S3_SECRET_ACCESS_KEY=tu_secret_key
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=https://minio.midominio.cl/alerta-comunal-evidencias
MAX_UPLOAD_SIZE_MB=5
```

- El bucket debe existir antes del primer deploy. La app **no lo crea automáticamente**.
- MinIO debe tener acceso público de lectura o una URL pública configurada en `S3_PUBLIC_URL`.
- La app guarda la URL pública completa en PostgreSQL (`evidence.url`).
- Las evidencias antiguas con URL `/uploads/...` siguen funcionando (archivos estáticos de Next.js).
- Si faltan variables S3 críticas, la subida falla con mensaje claro sin romper el servidor.

### Compatibilidad con evidencias antiguas

| Evidencia | `url` guardada | Cómo se muestra |
|-----------|---------------|-----------------|
| Local | `/uploads/uuid.jpg` | Servida por Next.js como estático |
| MinIO/S3 | `https://minio.../uuid.jpg` | URL pública directa |

Al eliminar una evidencia, el sistema detecta automáticamente si es local (URL empieza con `/`) o S3 (URL empieza con `http`) y borra el archivo del lugar correcto.

## Configuración en Railway para Redis

AlertaComunal usa Redis para rate limiting distribuido cuando hay múltiples réplicas. Sin Redis, el sistema cae automáticamente a rate limiting en memoria (suficiente para instancia única).

### Paso 1: Agregar Redis en Railway

1. En el proyecto Railway → **New** → **Database** → **Redis**
2. Railway crea el servicio Redis automáticamente

### Paso 2: Vincular Redis al servicio Next.js

1. Ir al servicio de AlertaComunal → **Variables**
2. Hacer clic en **Add Variable Reference**
3. Seleccionar el servicio Redis → elegir `REDIS_URL`
4. Railway inyecta la variable como referencia dinámica:
   ```
   REDIS_URL = ${{Redis.REDIS_URL}}
   ```
5. Railway redespliega automáticamente al guardar

### Verificación

En los logs del servicio Next.js: si la conexión es exitosa no aparece nada (silencioso). Si hay error de conexión se registra `[Redis] connection error: ...` y el sistema continúa con fallback en memoria — el login sigue funcionando.

> Sin `REDIS_URL` configurado el sistema funciona igual con rate limiting en memoria. Redis solo es necesario al escalar a múltiples réplicas.

## Configuración en Railway para MinIO

1. Ir al servicio de AlertaComunal → **Variables**
2. Agregar las siguientes variables:

```
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://minio.midominio.cl
S3_REGION=us-east-1
S3_BUCKET=alerta-comunal-evidencias
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=https://minio.midominio.cl/alerta-comunal-evidencias
MAX_UPLOAD_SIZE_MB=5
```

3. Redeployar el servicio.
4. Probar subida desde `/reportar` y desde el detalle de emergencia → pestaña Evidencias.
5. Verificar que el archivo aparece en el bucket MinIO y que la URL pública abre la imagen.

> No agregar `NODE_ENV` como variable manual en Railway.

## Notificaciones por correo con Resend

AlertaComunal usa [Resend](https://resend.com) para notificaciones automáticas por correo.

### Variables requeridas

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend — obligatoria solo si `EMAIL_ENABLED=true` |
| `EMAIL_FROM` | Remitente. Por defecto: `tecnico@elementalpro.cl` |
| `EMAIL_ENABLED` | `true` activa el envío. Si es `false` o no existe, no se envían correos |

> El dominio del remitente (`EMAIL_FROM`) debe estar verificado en Resend para que el correo llegue correctamente.

### Correos que se envían

1. **Nuevo reporte ciudadano** — Al crear un reporte desde `/reportar`, se envía al(los) `ADMIN` activo(s) de la municipalidad asignada **que tengan habilitada la preferencia `emailOnNewReport`**. Incluye código, tipo, prioridad, datos del reportante, descripción y link al detalle interno.

2. **Asignación de emergencia** — Al crear o editar una emergencia y asignar un responsable nuevo, se envía a ese usuario **si tiene habilitada la preferencia `emailOnAssigned`**. Incluye código, tipo, prioridad, dirección y link directo.

### Preferencias de notificación por usuario

Cada usuario puede configurar qué correos recibe desde `/admin/usuarios/[id]/editar`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `emailOnAssigned` | Boolean (default: `true`) | Recibir correo al ser asignado como responsable de una emergencia |
| `emailOnNewReport` | Boolean (default: `true`) | Recibir correo cuando se recibe un reporte ciudadano (solo aplica a ADMINs) |

Las preferencias se guardan en la tabla `User` y se respetan en todos los envíos de correo. Al crear un usuario, ambas preferencias están activadas por defecto.

### Comportamiento ante fallos

- Si el envío falla: la emergencia **igual se crea**. No hay rollback.
- El error se registra en consola y en el `ActivityLog` de la emergencia (`action: EMAIL_FAILED`).
- Si `EMAIL_ENABLED=false`: no se intenta enviar ningún correo.
- Si no hay administradores activos en la municipalidad: se registra advertencia en consola.

### ActivityLog de correos y sistema

| Action | Cuándo |
|--------|--------|
| `CREATED` | Emergencia o reporte creado |
| `ASSIGNED` | Responsable asignado o reasignado |
| `MUNICIPALITY_ASSIGNED` | Municipalidad asignada automáticamente por región/comuna |
| `EVIDENCE_ADDED` | Evidencia fotográfica adjuntada |
| `EMAIL_SENT` | Correo enviado exitosamente |
| `EMAIL_FAILED` | Fallo al enviar correo |

### Configuración en Railway

1. Ir al servicio → **Variables** y agregar:
```
RESEND_API_KEY=re_xxxx...
EMAIL_FROM=tecnico@elementalpro.cl
EMAIL_ENABLED=true
```
2. Verificar que el dominio del remitente está habilitado en Resend.
3. Redeployar el servicio.

### Asignación automática de municipalidad por región/comuna

Cuando un ciudadano selecciona región y comuna en `/reportar`, el sistema busca automáticamente una municipalidad activa con esa región/comuna y asigna el reporte a ella. Si no existe coincidencia, usa la municipalidad configurada en `PUBLIC_DEFAULT_MUNICIPALITY_SLUG` como fallback.

## Roadmap

### Completado

- [x] CRUD completo de emergencias con código único (EMG-YYYY-XXXX) y reintentos ante colisión
- [x] Dashboard con KPIs operacionales: tasa de resolución, tiempo promedio de cierre, distribución por tipo y prioridad
- [x] Mapa interactivo interno con marcadores por prioridad (Leaflet + OpenStreetMap)
- [x] **Mapa público ciudadano** (`/mapa-publico`) — emergencias activas sin login, sin datos sensibles
- [x] Subida de evidencias fotográficas (local o MinIO/S3, proveedor configurable)
- [x] **Limpieza automática de archivos** al eliminar una emergencia (local y S3)
- [x] Geolocalización precisa: Google Maps Places Autocomplete (forward) + GPS + Nominatim reverse + mini-mapa con pin arrastrable
- [x] Selects región/comuna en cascada con dataset oficial de Chile
- [x] Asignación automática de municipalidad por región/comuna en reportes ciudadanos
- [x] Notificaciones por correo con Resend (nuevo reporte al ADMIN + asignación al responsable)
- [x] **Preferencias de notificación por usuario** (`emailOnAssigned`, `emailOnNewReport`)
- [x] Gestión de usuarios CRUD desde UI (crear, editar, activar/desactivar, cambiar contraseña)
- [x] Panel multi-municipio para SUPER_ADMIN (municipalidades, usuarios, scope global)
- [x] **Panel de uso por municipalidad** — 6 KPIs (total, activas, últimos 30 días, tasa de resolución, tiempo promedio de cierre, usuarios activos), distribución por tipo con barras horizontales, emergencias recientes, columna "Activas" en el listado
- [x] **Panel de auditoría de seguridad** (`/admin/auditoria`) — EMERGENCY_DELETED, LOGIN_FAILED, RATE_LIMIT_HIT, EMAIL_SENT/FAILED; tabla permanente sin FK que sobrevive a eliminaciones en cascada
- [x] **Migraciones controladas** — archivos versionados en `prisma/migrations/`, `migrate deploy` en Release Command (en reemplazo de `db push`)
- [x] **Validación de asignación cross-municipalidad**: no se puede asignar un usuario de otra municipalidad como responsable
- [x] **Permisos de UI por rol**: VISUALIZADOR no ve botones de crear, editar ni eliminar emergencias
- [x] Exportación CSV con filtros activos (compatible Excel en español con BOM)
- [x] Reporte imprimible/PDF por emergencia con historial completo y bloque de firma
- [x] Flujo de cierre de emergencias (closedAt, closingNotes, notas obligatorias)
- [x] Filtros avanzados con rango de fechas
- [x] Rate limiting en login (5 intentos / 15 min por IP)
- [x] Consulta pública de estado por código único (`/consulta`)
- [x] Actualizaciones en tiempo real en el dashboard vía SSE (Server-Sent Events): snapshot inicial server-side, refresco cada 30s, keepalive para Railway, reconexión automática con backoff exponencial e indicador "En vivo"
- [x] Redis para rate limiting distribuido (multi-instancia): patrón atómico `INCR` + `PEXPIRE`, fallback automático a memoria in-process si `REDIS_URL` no está configurado
- [x] **Rate limiting en rutas públicas** (`/api/reporte-publico`, `/api/mapa-publico`): 5 reportes/IP/15min, 30 consultas/IP/10min, 60 solicitudes mapa/IP/5min
- [x] **Modo demo condicional** (`NEXT_PUBLIC_DEMO_MODE`): QuickLogin y credenciales solo visibles si la variable está activa; ocultos en producción real
- [x] **Validación de usuario activo en cada request**: usuarios desactivados quedan bloqueados inmediatamente sin esperar expiración del JWT; municipalidades inactivas bloquean a sus usuarios municipales
- [x] **Paginación en listado de emergencias**: 50 registros por página, controles anterior/siguiente, compatible con todos los filtros
- [x] **CSV sin PII para VISUALIZADOR**: columnas de reportante y teléfono ocultas; visibles para ADMIN, OPERADOR y SUPER_ADMIN
- [x] **Closing notes obligatorio al cerrar** (mínimo 10 caracteres)
- [x] **Validación Zod en status de tareas**: valores inválidos retornan 400 con mensaje claro
- [x] **AuditLog en operaciones admin críticas**: crear/editar/activar/desactivar municipalidades y usuarios, cambio de contraseña (sin exponer la contraseña en metadata)
- [x] **Índices de base de datos**: Emergency (municipalityId, status, createdAt y combinados), ActivityLog (emergencyId), AuditLog (action, createdAt, entityType, userId)
- [x] **Dashboard optimizado**: cálculo de tiempo promedio de cierre limitado a últimos 90 días (máx. 500 registros) en lugar de toda la historia

### Corto plazo (próximos sprints)

- [ ] Múltiples responsables por emergencia (co-asignados) — requiere tabla join o array en schema
- [ ] Templates de correo configurables por municipalidad — nuevo modelo `MunicipalityEmailTemplate`
- [ ] Webhooks configurables por municipalidad — notificaciones HTTP a sistemas externos

### Largo plazo

- [ ] Integración WhatsApp Business API (notificaciones al reportante y al ADMIN)
- [ ] App móvil React Native para operadores en terreno
- [ ] Backups automáticos y monitoreo (Railway Pro + Sentry o similar)
