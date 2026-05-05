# AlertaComunal

Plataforma SaaS municipal para registrar, georreferenciar, gestionar y hacer seguimiento de emergencias comunales.

## Stack tecnológico

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **UI:** React 18 + Tailwind CSS 3
- **Base de datos:** PostgreSQL + Prisma ORM
- **Autenticación:** JWT con jose (cookies httpOnly)
- **Mapas:** Leaflet + React-Leaflet + OpenStreetMap
- **Validaciones:** Zod + React Hook Form
- **Deploy:** Railway

## Funcionalidades principales

- Login seguro con roles (ADMIN, OPERADOR, VISUALIZADOR)
- Dashboard con estadísticas en tiempo real
- CRUD completo de emergencias con código automático (EMG-2026-XXXX)
- Mapa interactivo con marcadores por prioridad
- Subida de evidencias fotográficas
- Gestión de tareas por emergencia
- Formulario ciudadano público (sin login)
- Reporte imprimible por emergencia
- Historial de actividad
- Filtros avanzados de búsqueda

## Instalación local

### 1. Prerequisitos
- Node.js 18+
- PostgreSQL 14+

### 2. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/alerta-comunal.git
cd alerta-comunal
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/alertacomunal"
JWT_SECRET="genera-un-secreto-seguro-con-openssl-rand-base64-32"
APP_URL="http://localhost:3000"
```

### 4. Crear base de datos y migrar

```bash
# Crear la base de datos en PostgreSQL primero
createdb alertacomunal

# Ejecutar migraciones
npx prisma migrate dev --name init

# Generar cliente
npm run prisma:generate
```

### 5. Ejecutar seed (datos iniciales)

```bash
npm run prisma:seed
```

### 6. Crear carpeta de uploads

```bash
mkdir -p public/uploads
```

### 7. Iniciar en desarrollo

```bash
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000)

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | Cadena aleatoria de 32+ caracteres |
| `APP_URL` | URL base de la aplicación | `http://localhost:3000` |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` |

## Comandos

```bash
npm run dev           # Desarrollo con hot-reload
npm run build         # Build para producción
npm run start         # Iniciar servidor de producción
npm run lint          # Verificar código
npm run prisma:generate   # Generar cliente Prisma
npm run prisma:migrate    # Aplicar migraciones en producción
npm run prisma:seed       # Cargar datos de ejemplo
```

## Deploy en Railway

### Paso 1: Preparar el repositorio

```bash
git init
git add .
git commit -m "feat: MVP inicial AlertaComunal"
git remote add origin https://github.com/tu-usuario/alerta-comunal.git
git push -u origin main
```

### Paso 2: Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Haz clic en **New Project**
3. Selecciona **Deploy from GitHub repo**
4. Selecciona el repositorio `alerta-comunal`

### Paso 3: Agregar PostgreSQL

1. En el proyecto Railway, haz clic en **New** → **Database** → **PostgreSQL**
2. Copia la variable `DATABASE_URL` que Railway genera automáticamente

### Paso 4: Configurar variables de entorno en Railway

En la sección **Variables** de tu servicio, agrega:

```
DATABASE_URL=<copiado de PostgreSQL>
JWT_SECRET=<genera con: openssl rand -base64 32>
APP_URL=https://tu-app.railway.app
NODE_ENV=production
```

### Paso 5: Configurar comandos en Railway

En la sección **Settings** de tu servicio:

- **Build Command:** `npm run build`
- **Start Command:** `npm run start`
- **Install Command:** `npm install`

> **Nota:** El `postinstall` ejecuta `prisma generate` automáticamente.

### Paso 6: Ejecutar migraciones

En la terminal de Railway o como Release Command:

```bash
npx prisma migrate deploy && npx prisma db seed
```

O configúralo como **Release Command** en Railway Settings.

### Paso 7: Deploy

Railway detectará el push y ejecutará el deploy automáticamente. El primer deploy puede tardar 2-5 minutos.

## Usuario demo

| Campo | Valor |
|-------|-------|
| Email | `ppinto@elementalpro.cl` |
| Contraseña | `Admin123456` |
| Rol | ADMIN |

**Usuarios operadores:**
- `mgonzalez@alertacomunal.cl` / `Operador123`
- `cmartinez@alertacomunal.cl` / `Operador123`

**Formulario ciudadano público:** `/reportar` (sin login)

## Estructura del proyecto

```
alerta-comunal/
├── prisma/
│   ├── schema.prisma      # Modelos de datos
│   └── seed.ts            # Datos iniciales
├── public/
│   └── uploads/           # Imágenes subidas (gitignored)
├── src/
│   ├── app/
│   │   ├── api/           # API Routes (REST)
│   │   ├── dashboard/     # Dashboard principal
│   │   ├── emergencias/   # CRUD emergencias + detalle + reporte
│   │   ├── mapa/          # Vista de mapa
│   │   ├── reportar/      # Formulario público ciudadano
│   │   └── login/         # Autenticación
│   ├── components/
│   │   ├── dashboard/     # Componentes del dashboard
│   │   ├── emergencies/   # Formulario, tabla, filtros, tareas, evidencias
│   │   ├── layout/        # Sidebar, Header, MainLayout
│   │   ├── map/           # Mapa Leaflet
│   │   └── ui/            # Button, Modal, Alert, Loading...
│   ├── lib/
│   │   ├── auth.ts        # JWT / sesión
│   │   ├── prisma.ts      # Cliente Prisma
│   │   ├── utils.ts       # Helpers y constantes
│   │   └── validations/   # Schemas Zod
│   └── types/
│       └── index.ts       # TypeScript interfaces
├── middleware.ts           # Protección de rutas
└── ...config files
```

## Roadmap (post-MVP)

- [ ] Upload de imágenes a S3/Cloudflare R2
- [ ] Notificaciones por correo electrónico
- [ ] Gestión de usuarios (CRUD)
- [ ] Módulo de reportes estadísticos avanzados
- [ ] Integración con WhatsApp Business API
- [ ] App móvil con React Native
- [ ] Panel multi-municipio
- [ ] Exportación a Excel/PDF avanzado
- [ ] WebSockets para actualizaciones en tiempo real
