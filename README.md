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
| Validaciones | Zod + React Hook Form |
| Deploy | Railway |

## Funcionalidades

- Login seguro con roles (ADMIN, OPERADOR, VISUALIZADOR) y rate limiting (5 intentos / 15 min)
- Dashboard con estadísticas en tiempo real
- CRUD completo de emergencias con código automático (EMG-2026-XXXX)
- Mapa interactivo con marcadores por prioridad
- Subida de evidencias fotográficas
- Gestión de tareas por emergencia con auditoría de cambios
- Formulario ciudadano público en `/reportar` (sin login) con geocodificación y foto opcional
- Consulta pública de estado de reporte en `/consulta` (sin login)
- Reporte imprimible y exportable a PDF por emergencia
- Historial de actividad completo (creación, cambios de estado, tareas, evidencias)
- Filtros avanzados de búsqueda (estado, prioridad, tipo, sector, texto libre)

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
```

### 3. Inicializar base de datos

```bash
# Crear tablas desde el schema (sin archivos de migración)
npx prisma db push

# Cargar datos iniciales (admin + usuarios + emergencias de ejemplo)
npm run prisma:seed
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

## Comandos disponibles

```bash
npm run dev               # Desarrollo con hot-reload
npm run build             # Build para producción
npm run start             # Iniciar servidor de producción
npm run lint              # Verificar código
npm run prisma:generate   # Generar cliente Prisma
npm run prisma:push       # Sincronizar schema con la DB (sin migraciones)
npm run prisma:seed       # Cargar datos de ejemplo
npm run prisma:setup      # prisma db push + seed (todo en uno)
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
```

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
| Release Command | `npx prisma db push && npx prisma db seed` |

> El `postinstall` ejecuta `prisma generate` automáticamente al hacer `npm install`.

### Paso 6: Deploy

Railway detecta el push a `main` y despliega automáticamente. El primer deploy tarda ~2-4 minutos.

## Usuarios demo

| Email | Contraseña | Rol | Permisos |
|-------|-----------|-----|----------|
| `ppinto@elementalpro.cl` | `Admin123456` | ADMIN | Todo |
| `mgonzalez@alertacomunal.cl` | `Operador123` | OPERADOR | Crear/editar emergencias, tareas y evidencias |
| `cmartinez@alertacomunal.cl` | `Operador123` | OPERADOR | Crear/editar emergencias, tareas y evidencias |
| `visualizador@alertacomunal.cl` | `Visualizador123` | VISUALIZADOR | Solo lectura |

**Formulario ciudadano público:** `/reportar` (no requiere login)
**Consulta de estado:** `/consulta` (no requiere login — ingrese el código de seguimiento)

## Estructura del proyecto

```
alerta-comunal/
├── prisma/
│   ├── schema.prisma          # Modelos: User, Emergency, Task, Evidence, ActivityLog...
│   └── seed.ts                # Admin + operadores + emergencias de ejemplo
├── public/
│   └── uploads/               # Imágenes subidas localmente (gitignored)
├── src/
│   ├── app/
│   │   ├── api/               # API Routes (auth, emergencias, tareas, evidencias, reportes)
│   │   ├── dashboard/         # Dashboard con estadísticas
│   │   ├── emergencias/       # Listado, nueva, detalle, editar, reporte PDF
│   │   ├── mapa/              # Vista de mapa interactivo
│   │   ├── reportar/          # Formulario público ciudadano (con geocodificación y foto)
│   │   ├── consulta/          # Consulta pública de estado por código
│   │   ├── login/             # Autenticación
│   │   ├── not-found.tsx      # Página 404
│   │   └── layout.tsx         # Layout raíz
│   ├── components/
│   │   ├── dashboard/         # StatsCard, RecentEmergencies
│   │   ├── emergencies/       # EmergencyForm, EmergencyTable, EmergencyFilters,
│   │   │                      # TaskList, EvidenceGallery, PrintButtons
│   │   ├── layout/            # Sidebar, Header, MainLayout
│   │   ├── map/               # MapWrapper (client), EmergencyMap (Leaflet)
│   │   └── ui/                # Button, Modal, Alert, Loading
│   ├── lib/
│   │   ├── auth.ts            # JWT / sesión (jose)
│   │   ├── prisma.ts          # Singleton cliente Prisma
│   │   ├── utils.ts           # Labels, formatters (client-safe, sin Prisma)
│   │   ├── generate-code.ts   # Generador de códigos EMG (server-only)
│   │   ├── rate-limit.ts      # Rate limiter en memoria (login brute-force)
│   │   ├── storage/
│   │   │   ├── index.ts       # Abstracción: validateFile, saveUpload, deleteUpload
│   │   │   ├── local.ts       # Provider local (public/uploads)
│   │   │   └── s3.ts          # Provider MinIO/S3 (@aws-sdk/client-s3)
│   │   └── validations/       # Schemas Zod
│   └── types/
│       └── index.ts           # Interfaces TypeScript
├── middleware.ts               # Protección de rutas JWT
└── ...config files
```

## Notas técnicas

- **Auth:** JWT en cookies httpOnly con `jose`. Sin NextAuth.
- **Rate limiting:** Implementado en memoria (`Map`) en `src/lib/rate-limit.ts`. Máximo 5 intentos de login por IP en ventana de 15 minutos. Se reinicia al lograr acceso exitoso. En instancias múltiples (horizontal scaling) el estado no se comparte — solución suficiente para MVP; migrar a Redis en producción de alta escala.
- **Geocodificación:** Nominatim / OpenStreetMap (gratuito, sin API key). El formulario `/reportar` y el formulario interno tienen botón para convertir dirección a coordenadas lat/lon.
- **Mapa:** `dynamic()` con `ssr: false` solo puede usarse en Client Components. El Server Component `mapa/page.tsx` usa `<MapWrapper>` que internamente hace el dynamic import.
- **Prisma en cliente:** `utils.ts` no importa Prisma. La función `generateEmergencyCode()` vive en `generate-code.ts` (server-only) para evitar bundling issues.
- **Race condition en códigos:** La función `generateEmergencyCode()` usa `COUNT` (no atómico). Los endpoints POST de emergencias implementan un loop de reintentos (máx. 3) capturando el error Prisma P2002 en el campo `code`.
- **DB en Railway:** Se usa `prisma db push` en lugar de `prisma migrate deploy`, ya que no se generan archivos de migración localmente.
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

## Roadmap (post-MVP)

- [x] Upload de imágenes a MinIO/S3 (proveedor configurable)
- [ ] Notificaciones por correo electrónico
- [ ] Gestión de usuarios (CRUD desde UI)
- [ ] Reportes estadísticos exportables
- [ ] Integración WhatsApp Business API
- [ ] WebSockets para actualizaciones en tiempo real
- [ ] Panel multi-municipio
- [ ] App móvil React Native
