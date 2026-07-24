# AlertaComunal

Plataforma SaaS multi-tenant para registrar, georreferenciar, gestionar y hacer seguimiento de emergencias comunales. Cada municipalidad opera de forma aislada sobre la misma infraestructura.

**Producción:** [https://alertacomunal.elementalpro.cl](https://alertacomunal.elementalpro.cl) — desplegado en AWS (ver [Arquitectura en AWS](#arquitectura-en-aws-producción)).

**Manuales de uso:** [Manual de Administrador](https://alertacomunal.elementalpro.cl/manual-administrador.html) · [Guía para reportar emergencias](https://alertacomunal.elementalpro.cl/manual-usuario-publico.html)

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| UI | React 18 + Tailwind CSS 3 |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | JWT con jose (cookies httpOnly) |
| Mapas | Leaflet + React-Leaflet + OpenStreetMap |
| Geocodificación | Google Maps Places API (autocompletado) + Google Geocoding API (reversa) + Nominatim (respaldo) |
| Validaciones | Zod + React Hook Form |
| Cache / rate limiting | Redis (ElastiCache) con fallback en memoria |
| Almacenamiento | S3 (evidencias fotográficas) con fallback local |
| Correo | Resend |
| Infraestructura | Terraform (AWS) — ver sección dedicada |
| Proceso en servidor | PM2 (cluster mode) sobre EC2 |
| Deploy alternativo | Railway (Nixpacks, sin Terraform) |

## Arquitectura en AWS (producción)

Infraestructura completa como código en `infra/aws/*.tf`, región `sa-east-1` (São Paulo) por defecto en el despliegue actual, configurable vía `aws_region`.

```
Internet
   │
   ▼
Route53 (opcional) ── ACM (TLS) ── WAFv2
   │
   ▼
ALB (subredes públicas, 2 AZ)
   │  health check GET /api/health
   ▼
Auto Scaling Group (subredes privadas "app", 2 AZ)
   │  EC2 t3.small · Amazon Linux 2023 · PM2 cluster (2 procesos)
   │  IMDSv2 obligatorio · IAM role (SSM + S3 + CloudWatch Logs)
   ▼
┌─────────────┬──────────────────┬────────────────────┐
│ RDS Postgres│ ElastiCache Redis│ S3 (evidencias)     │
│ (subred data)│ (subred data)   │ + VPC Gateway Endpt │
└─────────────┴──────────────────┴────────────────────┘
```

### Componentes

| Componente | Detalle |
|---|---|
| **Red** | VPC `/16` propia con subredes públicas, privadas de aplicación y privadas de datos en 2 AZ. NAT Gateway (único por defecto, `single_nat_gateway`) para salida a internet desde las subredes privadas (Resend, npm). VPC Gateway Endpoint a S3 para no pagar NAT en tráfico de evidencias. |
| **Cómputo** | Auto Scaling Group (min 2 / max 6 / deseado 2, ajustable) sobre Launch Template con AMI Amazon Linux 2023 más reciente. Health check tipo `ELB` con `grace period` de 600s (build de Next.js in-place tarda varios minutos). Escalado automático por CPU (target tracking, 60%). |
| **Balanceo** | Application Load Balancer con listener HTTPS (TLS 1.3, certificado ACM) y redirección HTTP→HTTPS. Target group apunta al puerto 3000 con health check en `/api/health`. |
| **Base de datos** | RDS PostgreSQL 16, `gp3` encriptado, backups automáticos (7 días por defecto), `deletion_protection` activado, Multi-AZ opcional (`db_multi_az`). |
| **Cache** | ElastiCache Redis 7.1 (un nodo por defecto) usado por `src/lib/rate-limit.ts` para rate limiting distribuido entre instancias. |
| **Almacenamiento** | Bucket S3 dedicado a evidencias fotográficas, con política de lectura pública y lifecycle rule. |
| **WAF** | Web ACL regional asociada al ALB: límite de 2000 req/5min por IP, `AWSManagedRulesCommonRuleSet` (con `rule_action_override` en `SizeRestrictions_BODY` para no bloquear reportes ciudadanos con foto) y `AWSManagedRulesKnownBadInputsRuleSet`. |
| **Observabilidad** | CloudWatch Log Group para la app, alarmas de CPU alto, 5xx del ALB, hosts unhealthy, conexiones RDS altas y almacenamiento RDS bajo — todas notifican a un tópico SNS por correo (`alerts_email`). |
| **Secretos** | `JWT_SECRET` y la contraseña de RDS se generan con `random_password` y se guardan como `SecureString` en SSM Parameter Store (`/alertacomunal/prod/*`), nunca en el código. Las instancias las leen vía IAM role al arrancar. |
| **Acceso de emergencia** | EC2 Instance Connect Endpoint (SSH sin bastion) + SSM Session Manager/Run Command para diagnóstico remoto, restringido a un CIDR admin opcional. |
| **DNS/TLS** | Registro Route53 opcional (`domain_name` + `hosted_zone_id`) apuntando al ALB; si no se usa Route53, se entrega `alb_dns_name` para crear un CNAME manual (ej. en Cloudflare). |

### Variables de Terraform (`infra/aws/variables.tf`)

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `app_repo_url` | Sí | — | URL git del repo que cada instancia clona al arrancar |
| `certificate_arn` | Sí | — | ARN de certificado ACM ya validado para el listener HTTPS |
| `alerts_email` | Sí | — | Correo que recibe las alarmas de CloudWatch vía SNS |
| `aws_region` | No | `us-east-1` | Región AWS |
| `environment` / `project` | No | `prod` / `alertacomunal` | Prefijo de nombres de recursos |
| `azs` | No | 2 AZ de `us-east-1` | Zonas de disponibilidad a usar |
| `instance_type` | No | `t3.small` | Tipo de instancia del ASG |
| `asg_min_size` / `asg_max_size` / `asg_desired_capacity` | No | `2` / `6` / `2` | Capacidad del Auto Scaling Group |
| `db_instance_class` | No | `db.t4g.micro` | Clase de instancia RDS |
| `db_multi_az` | No | `false` | Standby síncrono en otra AZ |
| `redis_node_type` | No | `cache.t3.micro` | Clase de nodo ElastiCache |
| `domain_name` / `hosted_zone_id` | No | — | Si se completan, Terraform crea el registro Route53 |
| `admin_cidr` / `ssh_key_name` | No | — | Habilitan SSH directo además de SSM (solo para depuración temporal) |
| `resend_api_key` / `email_enabled` / `google_maps_api_key` | No | `""` / `false` / `""` | Se guardan en SSM, igual que en Railway |
| `public_default_municipality_slug` | No | `demo` | Municipalidad usada como fallback en reportes públicos |

Copia `infra/aws/terraform.tfvars.example` a `terraform.tfvars` (gitignored) y completa los valores antes de aplicar.

### Desplegar o actualizar la infraestructura

```bash
cd infra/aws
terraform init
terraform plan
terraform apply
```

`terraform apply` provisiona todo desde cero (~75 recursos). Para actualizar solo el código de la app (sin tocar infraestructura), basta con:

```bash
git push origin main
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name alertacomunal-prod-asg \
  --region sa-east-1 \
  --preferences "MinHealthyPercentage=50,InstanceWarmup=600"
```

El Launch Template clona el repo (`app_repo_url` / `app_repo_branch`), instala dependencias, corre `prisma generate` y `next build`, y levanta la app con PM2 (`ecosystem.config.js`, 2 procesos en cluster mode). El script de arranque vive en `infra/aws/templates/user_data.sh.tpl`.

### Costo aproximado

Con los valores por defecto (2× `t3.small`, `db.t4g.micro` sin Multi-AZ, `cache.t3.micro`, NAT Gateway único) el costo mensual estimado ronda los **USD 140**, dominado por EC2, NAT Gateway y RDS. Reducir a 1 instancia deseada o eliminar el NAT Gateway (usando solo el S3 Gateway Endpoint) baja el costo a cambio de menor resiliencia.

## Funcionalidades

- Login seguro con roles (SUPER_ADMIN, ADMIN, OPERADOR, VISUALIZADOR) y rate limiting Redis distribuido (5 intentos / 15 min, fallback a memoria)
- Dashboard con KPIs en tiempo real vía SSE — reconexión automática, indicador "En vivo", sin polling
- CRUD completo de emergencias con código automático (EMG-2026-XXXX) y paginación (50/página)
- **Eliminación de emergencias** desde el detalle (SUPER_ADMIN y ADMIN), con confirmación inline
- Mapa interactivo con marcadores por prioridad (interno y público ciudadano sin login)
- Subida de evidencias fotográficas (local o S3) con limpieza automática al eliminar emergencias
- Gestión de tareas por emergencia con historial de actividad completo
- **Multi-municipalidad real en las rutas públicas**: `/reportar/[slug]` y `/mapa-publico/[slug]` fijan la municipalidad automáticamente; `/reportar` y `/mapa-publico` sin slug piden región/comuna o muestran un desplegable de municipalidades activas (`/api/municipios-publicos`)
- El mapa público **se recentra automáticamente** en el centroide de las emergencias de la municipalidad elegida en el desplegable
- Formulario ciudadano público en `/reportar` (sin login) con GPS, geocodificación y foto opcional; rate limiting 5 reportes/IP/15min
- Mapa público ciudadano en `/mapa-publico` (sin login) con emergencias activas; rate limiting 60 req/IP/5min
- Consulta pública de estado en `/consulta` (sin login); rate limiting 30 req/IP/10min
- Página de inicio con accesos directos a mapa público, formulario ciudadano, consulta y ambos manuales de uso
- Reporte imprimible/PDF por emergencia con historial completo y bloque de firma
- Exportación CSV con filtros activos; PII oculto para VISUALIZADOR
- Filtros avanzados: estado, prioridad, tipo, sector, rango de fechas, texto libre
- Notificaciones por correo (Resend) con preferencias configurables por usuario
- **Webhooks configurables por municipalidad** (`/admin/municipalidades/[id]/webhook`) — notificaciones HTTP firmadas (HMAC-SHA256) hacia sistemas externos al crear una emergencia, asignar responsable o recibir un reporte ciudadano
- **Panel de auditoría de seguridad** (`/admin/auditoria`) — log permanente de eventos críticos del sistema
- **Panel de uso por municipalidad** — 6 KPIs, distribución por tipo, emergencias recientes
- Validación de usuario activo en cada request — bloqueo inmediato sin esperar expiración JWT
- Healthcheck (`GET /api/health`) usado como target del ALB en AWS

## Multi-municipalidad y acceso público

| Ruta | Requiere login | Comportamiento |
|---|---|---|
| `/reportar` | No | Pide región y comuna; asigna la municipalidad por coincidencia o usa `PUBLIC_DEFAULT_MUNICIPALITY_SLUG` |
| `/reportar/[slug]` | No | Fija la municipalidad indicada por `slug`; oculta región/comuna |
| `/mapa-publico` | No | Desplegable con todas las municipalidades activas (`/api/municipios-publicos`); al elegir una, navega a su slug y el mapa se recentra en el centroide de sus emergencias |
| `/mapa-publico/[slug]` | No | Mapa filtrado y centrado en esa municipalidad |
| `/consulta` | No | Búsqueda de un reporte propio por **token de seguimiento** (aleatorio, no el código interno `EMG-YYYY-XXXX`), sin datos de otros reportes |
| `/api/municipios-publicos` | No | Lista `{ slug, name }` de municipalidades con `active: true`, rate-limited |

## Manuales de uso

Dos guías completas, alojadas como páginas estáticas propias de la app (no dependen de servicios externos):

- **`/manual-administrador.html`** — roles y permisos, dashboard, gestión de emergencias, usuarios, municipalidades, plantillas de correo, auditoría.
- **`/manual-usuario-publico.html`** — cómo reportar una emergencia, indicar ubicación (autocompletado, GPS o pin arrastrable), consultar el estado y preguntas frecuentes.

Ambos enlazados desde el footer de la página de inicio (`src/app/page.tsx`).

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
- **Detalle de municipalidad** (`/admin/municipalidades/[id]`): 6 KPIs operacionales, distribución por tipo de emergencia, emergencias recientes, gestión de usuarios
- **Plantillas de correo** (`/admin/municipalidades/[id]/templates`): asunto y cuerpo HTML personalizables por municipalidad para los correos de asignación y de nuevo reporte ciudadano, con variables `{{code}}`, `{{type}}`, `{{link}}`, etc.
- **Webhook** (`/admin/municipalidades/[id]/webhook`): URL propia por municipalidad, firmada con HMAC-SHA256, con toggle por evento (creación, asignación, nuevo reporte) y botón de prueba
- **Usuarios** (`/admin/usuarios`): listado global, crear, editar rol/municipalidad, activar/desactivar, cambiar contraseña, **eliminar** (solo SUPER_ADMIN)
- **Auditoría** (`/admin/auditoria`): log permanente de eventos de seguridad — EMERGENCY_DELETED, LOGIN_FAILED, RATE_LIMIT_HIT, EMAIL_SENT/FAILED; filtrable y paginado

`ADMIN` gestiona usuarios `OPERADOR`/`VISUALIZADOR` solo de su propia municipalidad (`ADMIN_ASSIGNABLE_ROLES` en `src/lib/permissions.ts`); no puede crear otro `ADMIN` ni cambiar la municipalidad de un usuario fuera de la suya.

### Gestión de municipalidades

Campos: nombre, slug (único), región, comuna, activo.

Reglas:
- El slug solo puede contener letras minúsculas, números y guiones (ej: `tierra-amarilla`) y es el que se usa en `/reportar/[slug]` y `/mapa-publico/[slug]`
- No se permite borrado físico — solo activar/desactivar
- Una municipalidad inactiva desaparece del desplegable público y deja de aceptar reportes por su slug
- El slug no debe cambiarse si está en uso como `PUBLIC_DEFAULT_MUNICIPALITY_SLUG`

### Gestión de usuarios

Campos: nombre, email, contraseña (al crear o cambiar), rol, municipalidad, activo, preferencias de notificación.

Reglas:
- `SUPER_ADMIN` puede crear/editar/**eliminar** usuarios de cualquier rol
- `ADMIN`, `OPERADOR` y `VISUALIZADOR` **requieren** `municipalityId`
- `SUPER_ADMIN` opera sin municipalidad asignada
- Cada usuario puede configurar `emailOnAssigned` y `emailOnNewReport` (ambos activos por defecto)
- Un usuario no puede eliminarse a sí mismo

### Scope por municipalidad

- `SUPER_ADMIN` ve emergencias, usuarios y métricas de **todas** las municipalidades
- `ADMIN`, `OPERADOR` y `VISUALIZADOR` ven solo los datos de **su municipalidad**
- Un usuario sin municipalidad asignada (no `SUPER_ADMIN`) recibe 403 en todas las operaciones

## Demo municipal

### Dashboard ejecutivo

El dashboard muestra métricas operacionales en tiempo real:

- **Tarjetas de estado:** total, nuevas, en atención, resueltas, cerradas, críticas activas
- **Métricas de período:** emergencias registradas y cerradas en los últimos 7 días
- **Tasa de resolución** y **tiempo promedio de cierre**
- **Distribución por tipo** y **por prioridad**

Todos los indicadores respetan el scope municipal. SUPER_ADMIN ve todas las municipalidades.

### Exportación CSV

- Ruta: `GET /api/emergencias/export`
- Respeta scope municipal y todos los filtros activos (estado, prioridad, tipo, sector, texto, rango de fechas)
- **Columnas de PII (reportante, teléfono):** visibles para SUPER_ADMIN, ADMIN y OPERADOR; **ocultas para VISUALIZADOR**
- Codificación UTF-8 con BOM (compatible con Excel en español)

### Reportes imprimibles

El reporte de cada emergencia (`/emergencias/[id]/reporte`) incluye encabezado institucional, datos generales y de ubicación, tabla de tareas, galería de evidencias, historial de actividad completo y bloque de firma. Se genera con el diálogo de impresión del navegador (no hay generación de PDF server-side).

### Formulario ciudadano (`/reportar` y `/reportar/[slug]`)

- Acceso público sin login
- Autocompletado de dirección con Google Maps Places (restricción a Chile)
- Botón GPS + geocodificación reversa con **Google Geocoding API** (Nominatim como respaldo si Google falla o no hay API key)
- Mini-mapa Leaflet con pin arrastrable para ajuste fino de ubicación
- Foto opcional (jpg/png/webp, máx. 5 MB)
- Genera código único de seguimiento (EMG-YYYY-XXXX)
- Con `[slug]`: asigna directamente esa municipalidad. Sin `[slug]`: asigna por coincidencia región/comuna o usa la municipalidad demo como fallback

### Mapa público ciudadano (`/mapa-publico` y `/mapa-publico/[slug]`)

- Acceso público sin login, sin datos sensibles
- Muestra emergencias activas (NUEVA, EN_ATENCIÓN) con coordenadas, coloreadas por prioridad
- Desplegable de municipalidades activas; al elegir una, el mapa navega a su slug y se recentra en el centroide de sus emergencias
- Tabla listado bajo el mapa

### Consulta ciudadana (`/consulta`)

Búsqueda por código único. Devuelve solo campos públicos (estado, tipo, dirección, fechas); no expone usuarios internos, teléfonos ni historial de actividad.

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
# Seed: sin esta variable el seed corre en modo productivo (sin datos de ejemplo).
# Solo para desarrollo local — nunca la actives en un entorno con datos reales.
SEED_DEMO=true
```

> `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` necesita **Maps JavaScript API**, **Places API** y **Geocoding API** habilitadas en Google Cloud Console. Sin ella, el formulario funciona (GPS y mini-mapa siguen operativos vía Nominatim) pero sin autocompletado ni geocodificación de alta precisión.
> Sin `RESEND_API_KEY` o con `EMAIL_ENABLED=false` los correos no se envían, pero las emergencias se crean correctamente.

### 3. Inicializar base de datos

```bash
npm run prisma:setup
```

Con `SEED_DEMO=true` en tu `.env`, esto crea la municipalidad demo, 5 usuarios de prueba y emergencias de ejemplo — las contraseñas quedan impresas en la consola. Sin esa variable, corre el seed productivo: no crea datos de ejemplo (ver sección "Seed de producción").

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
| `APP_URL` | URL base de la aplicación | `https://alertacomunal.elementalpro.cl` |
| `PUBLIC_DEFAULT_MUNICIPALITY_SLUG` | Slug de municipalidad fallback para reportes sin coincidencia | `demo` |
| `STORAGE_PROVIDER` | Backend de almacenamiento de archivos | `local` o `s3` |
| `MAX_UPLOAD_SIZE_MB` | Tamaño máximo de upload en MB | `5` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | API key de Google Maps (Places + Geocoding). Sin ella, autocompletado y geocodificación reversa de alta precisión se desactivan (cae a Nominatim). | Habilitar en Google Cloud Console |
| `RESEND_API_KEY` | API key de Resend. Obligatoria solo si `EMAIL_ENABLED=true`. | `re_xxxx...` |
| `EMAIL_FROM` | Remitente de los correos automáticos (dominio verificado en Resend). Default: `tecnico@elementalpro.cl`. | `notificaciones@midominio.cl` |
| `EMAIL_ENABLED` | Activa el envío de correos. | `true` / `false` |
| `REDIS_URL` | Conexión Redis para rate limiting distribuido. Opcional — sin ella cae a memoria in-process. | `redis://user:pass@host:6379` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile para el CAPTCHA adaptativo de `/reportar`. Opcionales — sin ambas, el CAPTCHA nunca se exige. | Crear sitio en el dashboard de Cloudflare |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_URL` | Requeridas solo si `STORAGE_PROVIDER=s3`. En AWS, `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` pueden omitirse: la instancia EC2 usa su IAM role automáticamente. | Ver sección Almacenamiento |
| `NEXT_PUBLIC_DEMO_MODE` | `true` muestra el panel QuickLogin en la página principal. **No usar en producción real.** | `true` / `false` |

En AWS estas variables no se configuran a mano: Terraform las escribe en SSM Parameter Store (`ssm_params.tf`) y el script de arranque las inyecta como `.env.production.local` al clonar el repo.

## Comandos disponibles

```bash
npm run dev                 # Desarrollo con hot-reload
npm run build               # Build para producción
npm run start               # Iniciar servidor de producción
npm run lint                # Verificar código
npm run test                # Tests unitarios (Vitest)
npm run test:watch          # Tests unitarios en modo watch
npm run test:e2e            # Smoke tests E2E (Playwright)
npm run prisma:generate     # Generar cliente Prisma
npm run prisma:push         # Sincronizar schema directo (solo desarrollo, sin migraciones)
npm run prisma:migrate      # Aplicar migraciones pendientes (prisma migrate deploy)
npm run prisma:migrate:dev  # Crear nueva migración en desarrollo (prisma migrate dev)
npm run prisma:seed         # Cargar datos de ejemplo
npm run prisma:setup        # migrate deploy + seed (todo en uno)
```

## Tests y CI

Dos capas de prueba, ambas obligatorias antes de mergear a `main` (ver `.github/workflows/ci.yml`):

- **Unitarios (Vitest, `src/**/*.test.ts`)**: cubren las cuatro superficies más sensibles del sistema — permisos por rol (`src/lib/permissions.test.ts`), aislamiento multi-tenant (`src/lib/tenant.test.ts`), validación de carga de archivos (`src/lib/storage/index.test.ts`) y el guard SSRF de webhooks (`src/lib/webhooks.test.ts`). Corren contra Prisma mockeado — no requieren una base de datos real.
- **E2E smoke (Playwright, `e2e/*.spec.ts`)**: confirman que `/login` y `/reportar` renderizan y validan correctamente (incluido que el formulario ciudadano bloquea el envío sin aceptar el consentimiento de datos). Deliberadamente acotados a smoke tests — no ejercitan un login real ni crean emergencias, así que no dependen de datos sembrados.

En GitHub Actions hay dos jobs:

| Job | Qué valida |
|---|---|
| `test` | `npm run lint` + `npm run test` + `npm run build` — sin base de datos |
| `e2e` | Levanta un Postgres 16 efímero, corre `prisma migrate deploy` contra él (detecta una migración rota antes de que llegue a RDS) y luego los smoke tests de Playwright |

Ambos jobs son checks requeridos en `main` — un PR no se puede mergear si alguno falla.

## Deploy en Railway (alternativa sin Terraform)

Railway sigue siendo una opción válida para un despliegue simple de instancia única (sin Auto Scaling ni WAF).

### Paso 1: Repositorio GitHub

```bash
git clone https://github.com/pintoco/alerta-comunal.git
```

### Paso 2: Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo** → selecciona `alerta-comunal`

### Paso 3: Agregar PostgreSQL

En el proyecto Railway: **New** → **Database** → **PostgreSQL**. Railway vincula automáticamente `DATABASE_URL`.

### Paso 4: Variables de entorno

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

> **No agregar `NODE_ENV`** como variable de servicio. Railway inyecta un valor no estándar que confunde a Next.js; el build ya usa `cross-env NODE_ENV=production` para forzar el modo correcto.

### Paso 4b (opcional): Volumen para imágenes persistentes

Railway elimina archivos al redesplegar. Con `STORAGE_PROVIDER=local`, monta un Volume en `/app/public/uploads` para conservarlas, o usa `STORAGE_PROVIDER=s3` directamente.

### Paso 5: Comandos en Railway Settings

| Campo | Valor |
|-------|-------|
| Build Command | `npm run build` |
| Start Command | `npm run start` |
| Release Command | `npx prisma migrate deploy && npx prisma db seed` |

### Paso 6: Deploy

Railway detecta el push a `main` y despliega automáticamente.

## Usuarios demo (solo desarrollo local)

Las credenciales de datos de prueba **no se documentan aquí** (nunca en texto plano en un archivo versionado). Para generarlas localmente:

```bash
SEED_DEMO=true npm run prisma:seed
```

Las 5 cuentas (SUPER_ADMIN, ADMIN, 2× OPERADOR, VISUALIZADOR) de la municipalidad demo se crean con contraseñas fijas pensadas solo para desarrollo — quedan impresas en la consola al correr el seed. **Nunca configurar `SEED_DEMO=true` en un entorno con datos reales**: sin esa variable, el seed usa el modo productivo (ver sección "Instalación local"), que no crea datos de ejemplo ni contraseñas conocidas.

**Formulario ciudadano público:** `/reportar` (no requiere login)
**Consulta de estado:** `/consulta` (no requiere login)

## Estructura del proyecto

```
alerta-comunal/
├── infra/
│   └── aws/                   # Terraform completo: VPC, ALB, ASG, RDS, ElastiCache,
│                               # S3, WAF, CloudWatch, Route53, IAM, SSM, Instance Connect
├── ecosystem.config.js        # Configuración PM2 (cluster mode) para EC2
├── prisma/
│   ├── schema.prisma          # Modelos: Municipality, User, Emergency, Task, Evidence,
│   │                          # EmergencyCoAssignee, MunicipalityEmailTemplate, MunicipalityWebhook,
│   │                          # ActivityLog, AuditLog
│   ├── migrations/
│   └── seed.ts                # Admin + operadores + municipalidad demo + emergencias de ejemplo
├── public/
│   ├── uploads/                       # Imágenes subidas localmente (gitignored)
│   ├── manual-administrador.html      # Manual de uso — personal municipal
│   └── manual-usuario-publico.html    # Guía de uso — vecinos y vecinas
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/                # Login, logout, session
│   │   │   ├── emergencias/         # CRUD emergencias + estado + export CSV
│   │   │   ├── reporte-publico/     # GET (consulta por código) + POST (nuevo reporte ciudadano)
│   │   │   ├── mapa-publico/        # GET emergencias activas (público, admite ?slug=)
│   │   │   ├── municipios-publicos/ # GET municipalidades activas (público)
│   │   │   ├── dashboard/           # stats/ (KPIs snapshot) + stream/ (SSE tiempo real)
│   │   │   ├── health/              # Healthcheck para el target group del ALB
│   │   │   └── admin/               # CRUD municipalidades, usuarios, plantillas, webhook y audit-log
│   │   ├── dashboard/          # Dashboard con estadísticas en tiempo real
│   │   ├── emergencias/         # Listado, nueva, detalle, editar, reporte PDF
│   │   ├── mapa/                # Mapa interactivo interno (requiere login)
│   │   ├── mapa-publico/        # Mapa público + [slug] (sin login)
│   │   ├── reportar/            # Formulario público + [slug] (sin login)
│   │   ├── consulta/            # Consulta pública de estado por código
│   │   ├── admin/               # Panel SUPER_ADMIN/ADMIN: municipalidades, usuarios, auditoría
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── admin/               # UserForm, MunicipalityForm, toggles, delete buttons
│   │   ├── dashboard/           # DashboardClient (SSE), StatsCard, KPICards
│   │   ├── emergencies/         # EmergencyForm, EmergencyTable, EmergencyFilters, TaskList,
│   │   │                        # EvidenceGallery, EmergencyDeleteButton, LocationPicker, MiniMap
│   │   ├── layout/               # Sidebar, Header, MainLayout
│   │   ├── map/                  # MapWrapper, EmergencyMap (con MapRecenter)
│   │   └── ui/
│   ├── lib/
│   │   ├── auth.ts               # JWT / sesión (jose)
│   │   ├── audit.ts              # writeAuditLog()
│   │   ├── config.ts             # Configuración centralizada
│   │   ├── dashboard.ts
│   │   ├── email.ts              # Resend + plantillas por municipalidad
│   │   ├── webhooks.ts           # sendWebhook() — firma HMAC, guardia SSRF, sin reintentos
│   │   ├── permissions.ts        # requireAuth, requireRole, requireSuperAdmin, requireUserAdmin
│   │   ├── tenant.ts             # getMunicipalityFilter, getEmergencyScope, requireEmergencyAccess
│   │   ├── rate-limit.ts         # Redis/memoria con fallback automático
│   │   ├── generate-code.ts      # Generador de códigos EMG (server-only)
│   │   ├── storage/              # index.ts (abstracción), local.ts, s3.ts
│   │   └── validations/          # Schemas Zod
│   ├── data/chile-regions-communes.ts
│   └── types/index.ts
├── middleware.ts                 # Protección de rutas JWT (Edge runtime)
└── ...config files
```

## Notas técnicas

- **Auth:** JWT en cookies httpOnly con `jose`. Sin NextAuth.
- **Rate limiting:** `src/lib/rate-limit.ts`, dos backends intercambiables (Redis atómico o memoria in-process), transparente para los endpoints.
- **Geolocalización:** `LocationPicker` compartido entre `/reportar` y el formulario interno. Autocompletado con Google Places; geocodificación reversa (GPS y pin arrastrable) con **Google Geocoding API** como principal y Nominatim como respaldo automático si Google falla o no hay API key — Nominatim tiene cobertura de direcciones muy dispersa fuera de Santiago y puede "adivinar" con el punto indexado más cercano.
- **Mapa:** `dynamic()` con `ssr: false` solo puede usarse en Client Components (`MapWrapper.tsx`). `EmergencyMap.tsx` incluye un componente `MapRecenter` (`useMap()` + `map.setView()`) porque `MapContainer` de react-leaflet solo aplica `center`/`zoom` al montar, no en actualizaciones posteriores.
- **Prisma en cliente:** `utils.ts` no importa Prisma; `generateEmergencyCode()` vive en `generate-code.ts` (server-only).
- **Race condition en códigos:** `generateEmergencyCode()` usa `COUNT` (no atómico); los endpoints POST reintentan hasta 3 veces ante P2002.
- **Migraciones controladas:** `prisma migrate deploy` con archivos versionados en `prisma/migrations/`.
- **AuditLog permanente:** sin FK constraints, sobrevive a eliminaciones en cascada. Helper fire-and-forget en `src/lib/audit.ts`.
- **Healthcheck:** `GET /api/health` corre `SELECT 1` vía Prisma; usado como target del ALB en AWS.
- **IAM sin comodines:** los ARNs de SSM/KMS en `infra/aws/iam.tf` usan `data.aws_caller_identity.current.account_id` explícito, no `*`, para principio de mínimo privilegio.
- **WAF y body size:** `AWSManagedRulesCommonRuleSet` bloquea por defecto bodies grandes (`SizeRestrictions_BODY`); se sobreescribe a `count` porque los reportes ciudadanos con foto lo superan.

## Almacenamiento de evidencias

Dos proveedores intercambiables vía `STORAGE_PROVIDER`.

### Modo local (por defecto)

```env
STORAGE_PROVIDER=local
MAX_UPLOAD_SIZE_MB=5
```

Adecuado para desarrollo. En Railway, `public/uploads` no es persistente sin un Volume. En AWS, cada instancia del ASG tiene su propio disco — **no usar `local` en AWS**, ya que las imágenes no se compartirían entre instancias ni sobrevivirían a un instance refresh.

### Modo S3 (recomendado en producción)

```env
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.sa-east-1.amazonaws.com
S3_REGION=sa-east-1
S3_BUCKET=alertacomunal-prod-evidencias
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_URL=https://alertacomunal-prod-evidencias.s3.sa-east-1.amazonaws.com
MAX_UPLOAD_SIZE_MB=5
```

- En AWS, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` se pueden omitir: `src/lib/storage/s3.ts` cae automáticamente al IAM role de la instancia EC2.
- Fuera de AWS (o con MinIO), sí se requieren `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` y típicamente `S3_FORCE_PATH_STYLE=true`.
- El bucket debe existir antes del primer deploy (Terraform lo crea automáticamente en AWS).
- La app guarda la URL pública completa en PostgreSQL (`evidence.url`); al eliminar detecta si es local (`/...`) o S3 (`http...`) y borra del lugar correcto.

## Notificaciones por correo con Resend

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | Obligatoria solo si `EMAIL_ENABLED=true` |
| `EMAIL_FROM` | Remitente (dominio verificado en Resend). Default: `tecnico@elementalpro.cl` |
| `EMAIL_ENABLED` | `true` activa el envío |

### Correos que se envían

1. **Nuevo reporte ciudadano** — a los `ADMIN` activos de la municipalidad con `emailOnNewReport` habilitado.
2. **Asignación de emergencia** — al responsable asignado, si tiene `emailOnAssigned` habilitado.

Cada municipalidad puede personalizar asunto y cuerpo de ambas plantillas desde `/admin/municipalidades/[id]/templates` (solo SUPER_ADMIN). Si el envío falla, la emergencia se crea igual y queda registrado `EMAIL_FAILED` en el `ActivityLog`.

## Webhooks por municipalidad

Cada municipalidad puede configurar **una URL propia** (`/admin/municipalidades/[id]/webhook`, solo SUPER_ADMIN) para recibir notificaciones HTTP en su propio sistema (mesa de ayuda, Slack, ERP municipal), en paralelo al correo — no lo reemplaza.

### Eventos disponibles

| Evento | Se dispara en |
|---|---|
| `EMERGENCY_CREATED` | Al crear una emergencia (interna o ciudadana) — `POST /api/emergencias` |
| `EMERGENCY_ASSIGNED` | Al asignar o reasignar el responsable principal — `POST`/`PUT /api/emergencias[/[id]]` |
| `NEW_CITIZEN_REPORT` | Al recibir un reporte desde el formulario público — `POST /api/reporte-publico` |

Cada evento se puede activar/desactivar de forma independiente (`onEmergencyCreated`, `onAssignment`, `onNewCitizenReport`), además de un interruptor general `enabled`.

### Seguridad del payload

- La URL debe ser `https://` y no puede apuntar a un host privado/local (`localhost`, `169.254.169.254`, rangos `10.*`/`172.16-31.*`/`192.168.*`) — validado tanto al guardar como al enviar.
- Cada envío incluye el header `X-AlertaComunal-Signature: sha256=<hmac>`, un HMAC-SHA256 del cuerpo JSON crudo calculado con un secreto único por municipalidad (`MunicipalityWebhook.secret`, generado con `crypto.randomBytes(32)`), más `X-AlertaComunal-Event: <evento>`. El municipio debe verificar la firma antes de confiar en el payload.
- El secreto se puede regenerar desde la UI (invalida el anterior).
- Un solo intento por evento, timeout de 5 segundos, **sin reintentos** — si falla, se registra `WEBHOOK_FAILED` en el `ActivityLog` de la emergencia y en `/admin/auditoria`, pero la operación principal (crear/asignar/reportar) nunca se bloquea ni falla por esto.
- Botón "Enviar prueba" en la UI para verificar la integración sin esperar un evento real (`POST /api/admin/municipalidades/[id]/webhook/test`).

Implementación en `src/lib/webhooks.ts` (`sendWebhook`), modelo `MunicipalityWebhook` en `prisma/schema.prisma`.

### Ejemplo de receptor para una municipalidad sin sistema propio

El webhook necesita algo escuchando esa URL. Dos caminos según su capacidad técnica:

- **Sin código**: una herramienta de automatización tipo n8n, Pipedream o Zapier da una URL propia gratis y arma visualmente qué hacer con cada evento (avisar por Slack/WhatsApp, guardar en una planilla, etc.). No verifica la firma automáticamente, pero alcanza para uso interno de baja exigencia.
- **Con código**: un servidor mínimo que valida la firma y reenvía a donde corresponda. Ejemplo en Node/Express que reenvía a Slack:

```js
const express = require('express')
const crypto = require('crypto')

const app = express()
const WEBHOOK_SECRET = process.env.ALERTACOMUNAL_WEBHOOK_SECRET
const SLACK_URL = process.env.SLACK_INCOMING_WEBHOOK_URL

// express.raw(): necesitamos el body crudo para que la firma calce exacto.
app.use(express.raw({ type: 'application/json' }))

app.post('/webhooks/alertacomunal', async (req, res) => {
  const signature = req.headers['x-alertacomunal-signature']
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex')

  if (signature !== expected) return res.status(401).send('Firma inválida')

  const { event, emergency } = JSON.parse(req.body.toString('utf8'))
  const text = {
    EMERGENCY_CREATED: `🆕 Nueva emergencia ${emergency?.code}`,
    NEW_CITIZEN_REPORT: `📣 Reporte ciudadano ${emergency?.code}`,
    EMERGENCY_ASSIGNED: `👤 Emergencia ${emergency?.code} asignada`,
    TEST: '✅ Ping de prueba recibido',
  }[event]

  if (SLACK_URL && text) {
    await fetch(SLACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  }
  res.status(200).send('OK')
})

app.listen(3001)
```

Pasos: desplegar este servidor en cualquier lado accesible por `https://` → crear un [Incoming Webhook de Slack](https://api.slack.com/messaging/webhooks) gratis → pegar la URL del servidor en `/admin/municipalidades/[id]/webhook` y copiar el secreto generado a `ALERTACOMUNAL_WEBHOOK_SECRET` → probar con el botón "Enviar prueba". La verificación de firma no es opcional: sin ella, cualquiera que adivine la URL podría enviar "emergencias" falsas.

## Privacidad y retención de datos

- **Consentimiento**: `/reportar` exige aceptar un checkbox de tratamiento de datos antes de enviar; se guarda `consentAcceptedAt` en la emergencia.
- **PII de reportante** (`reporterName`/`reporterPhone`): oculta para el rol `VISUALIZADOR` en listado, detalle y reporte imprimible — no solo en el export CSV. El acceso de roles que sí la ven (`SUPER_ADMIN`/`ADMIN`/`OPERADOR`) queda registrado en `AuditLog` como `EMERGENCY_PII_VIEWED`.
- **Token de consulta ciudadana**: `/consulta` usa un token aleatorio (`publicToken`) generado al crear el reporte, distinto del código `EMG-YYYY-XXXX` (secuencial y por tanto enumerable). El código sigue usándose internamente (staff, correos, webhooks); el token es lo único que se le entrega al ciudadano.
- **CAPTCHA adaptativo**: `/reportar` no muestra ningún CAPTCHA por defecto. A partir del segundo envío desde la misma IP en 15 minutos, exige resolver un [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) antes de aceptar el reporte (requiere `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`; sin ellas, se omite).
- **Retención** (política, automatización pendiente): los datos del reportante (`reporterName`/`reporterPhone`) deberían anonimizarse 24 meses después de `closedAt`. Hoy no hay ningún job que lo haga — la anonimización automática requiere infraestructura de cron (no existe aún en el proyecto, ver Roadmap) y queda pendiente de implementar.

## Roadmap

### Completado

- [x] CRUD completo de emergencias con código único y reintentos ante colisión
- [x] Dashboard con KPIs operacionales en tiempo real (SSE)
- [x] Mapa interactivo interno y **mapa público ciudadano** con marcadores por prioridad
- [x] **Multi-municipalidad real**: rutas `/reportar/[slug]` y `/mapa-publico/[slug]`, endpoint `/api/municipios-publicos`, desplegable de municipalidades activas
- [x] **Recentrado automático del mapa público** al elegir municipalidad (centroide de sus emergencias)
- [x] Subida de evidencias fotográficas (local o S3) con limpieza automática al eliminar
- [x] Geolocalización precisa: Google Places Autocomplete + **Google Geocoding API** (reversa) + GPS + mini-mapa con pin arrastrable + respaldo Nominatim
- [x] Asignación automática de municipalidad por región/comuna en reportes ciudadanos
- [x] Notificaciones por correo con Resend + **plantillas configurables por municipalidad**
- [x] Preferencias de notificación por usuario (`emailOnAssigned`, `emailOnNewReport`)
- [x] Gestión de usuarios CRUD completa: crear, editar, activar/desactivar, cambiar contraseña, **eliminar** (SUPER_ADMIN)
- [x] **Eliminación de emergencias desde la UI** (SUPER_ADMIN y ADMIN)
- [x] Panel multi-municipio para SUPER_ADMIN + panel de uso por municipalidad
- [x] Panel de auditoría de seguridad permanente (`/admin/auditoria`)
- [x] Migraciones controladas (`prisma migrate deploy`), sin `db push` en producción
- [x] Exportación CSV con filtros activos, sin PII para VISUALIZADOR
- [x] Reporte imprimible/PDF por emergencia con historial y bloque de firma
- [x] Rate limiting distribuido con Redis (login, reportes públicos, mapa público, consulta)
- [x] Validación de usuario/municipalidad activa en cada request
- [x] **Manuales de uso propios** (`/manual-administrador.html`, `/manual-usuario-publico.html`) enlazados desde la página de inicio
- [x] **Infraestructura AWS completa como código** (Terraform): VPC multi-AZ, ALB + Auto Scaling Group, RDS, ElastiCache, S3, WAF, CloudWatch + SNS, IAM de mínimo privilegio, SSM Parameter Store para secretos
- [x] **Healthcheck dedicado** (`/api/health`) como target del ALB
- [x] **WAF ajustado** para no bloquear reportes ciudadanos con foto (`SizeRestrictions_BODY`)
- [x] **Webhooks configurables por municipalidad** — notificaciones HTTP firmadas (HMAC-SHA256) a sistemas externos
- [x] **Sesiones frescas**: rol/municipalidad se revalidan en cada request contra la DB, invalidadas al cambiar contraseña o rol (`sessionVersion`)
- [x] **Fail-fast de configuración**: el proceso no arranca en producción sin `JWT_SECRET`
- [x] **Seed seguro por defecto**: seed de producción y seed de demostración (`SEED_DEMO=true`) separados
- [x] **Token de consulta ciudadana aleatorio** — `/consulta` usa un token no enumerable, independiente del código `EMG-YYYY-XXXX` (secuencial, de uso interno)
- [x] **Consentimiento de tratamiento de datos** explícito en `/reportar`
- [x] **PII de reportante oculta para VISUALIZADOR** en listado, detalle y reporte imprimible (antes solo aplicaba al export CSV)
- [x] **Registro de accesos a datos sensibles** (`EMERGENCY_PII_VIEWED` en `/admin/auditoria`)
- [x] **CAPTCHA adaptativo** (Cloudflare Turnstile) en `/reportar` ante envíos repetidos desde la misma IP
- [x] **Suite de tests unitarios** (Vitest) sobre permisos, aislamiento multi-tenant, validación de archivos y el guard SSRF de webhooks — encontró y corrigió un bypass real (`https://[::1]/...` no era bloqueado por el guard SSRF)
- [x] **Smoke tests E2E** (Playwright) sobre `/login` y `/reportar`
- [x] **CI en GitHub Actions**: lint + build + tests unitarios, y un job separado que valida las migraciones de Prisma contra un Postgres efímero antes de correr los smoke tests — ambos como checks requeridos en `main`
- [x] **Verificación real de backups**: RDS con retención de 7 días + point-in-time recovery, S3 con versionado habilitado; restauración de prueba (point-in-time) confirmada íntegra

### Corto plazo (próximos sprints)

- [ ] Rotar la access key AWS usada durante el setup inicial de Terraform
- [ ] Retirar el acceso SSH/EC2 Instance Connect de depuración una vez terminadas las pruebas en producción
- [ ] Automatizar la política de retención de datos del reportante (job de anonimización + cron en EC2/Terraform — ver sección "Retención de datos")
- [ ] Monitoreo/alertas de aplicación (Sentry o similar) para detectar fallos en producción sin depender de que el cliente los reporte primero

### Largo plazo

- [ ] Integración WhatsApp Business API (notificaciones al reportante y al ADMIN)
- [ ] App móvil React Native para operadores en terreno
- [ ] Monitoreo adicional (Sentry o similar) sobre las alarmas de CloudWatch ya existentes
