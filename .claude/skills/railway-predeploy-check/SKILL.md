---
name: railway-predeploy-check
description: Revisa si AlertaComunal está listo para desplegar en Railway, validando build, variables, Prisma, MinIO/S3, rutas públicas, roles y seguridad.
---

# Skill: Railway Predeploy Check

Antes de subir cambios a Railway, revisar cada punto. Reportar OK ✓ o FALLA ✗ con detalle.

---

## 1. Package.json

Verificar `package.json`:

- [ ] `"build": "NODE_ENV=production next build"`
- [ ] `"start": "next start"`
- [ ] `"postinstall": "prisma generate"`
- [ ] `"prisma:seed"` definido y funcional
- [ ] No hay dependencias innecesarias o duplicadas

---

## 2. Variables de entorno

Verificar que el README documente todas las variables necesarias en Railway:

**Obligatorias:**
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `APP_URL`
- [ ] `PUBLIC_DEFAULT_MUNICIPALITY_SLUG`
- [ ] `STORAGE_PROVIDER`
- [ ] `MAX_UPLOAD_SIZE_MB`

**S3/MinIO (si `STORAGE_PROVIDER=s3`):**
- [ ] `S3_ENDPOINT`
- [ ] `S3_REGION`
- [ ] `S3_BUCKET`
- [ ] `S3_ACCESS_KEY_ID`
- [ ] `S3_SECRET_ACCESS_KEY`
- [ ] `S3_FORCE_PATH_STYLE`
- [ ] `S3_PUBLIC_URL`

**Prohibida:**
- [ ] `NODE_ENV` NO debe estar como variable manual en Railway (Railway la inyecta con valor no estándar)

---

## 3. Build

Ejecutar localmente y confirmar 0 errores:

```bash
npx prisma generate
npx next build
```

- [ ] Compilación TypeScript sin errores
- [ ] Sin warnings de tipos críticos
- [ ] Todas las rutas aparecen en el output (Static / Dynamic)
- [ ] Middleware compilado correctamente

---

## 4. Prisma

Revisar `prisma/schema.prisma`:

- [ ] Todos los campos nuevos son opcionales o tienen `@default`
- [ ] No se eliminaron tablas ni columnas
- [ ] No se renombraron campos existentes
- [ ] Las relaciones están correctas (`Municipality → User`, `Municipality → Emergency`)
- [ ] Compatible con `prisma db push` (sin migraciones)

Revisar `prisma/seed.ts`:

- [ ] El seed es idempotente (se puede ejecutar N veces sin duplicar)
- [ ] Usa `upsert` para usuarios y municipalidad demo
- [ ] Crea municipalidad demo con `slug: 'demo'`
- [ ] Asigna `municipalityId` a todos los usuarios demo
- [ ] Asigna `municipalityId` a todas las emergencias demo
- [ ] No borra datos existentes

---

## 5. Seguridad

Revisar `src/app/api/auth/login/route.ts` y `src/lib/auth.ts`:

- [ ] `JWT_SECRET` obligatorio en producción (lanza error si falta)
- [ ] Cookies configuradas con `httpOnly: true`
- [ ] Cookies con `secure: true` en producción
- [ ] Cookies con `sameSite: 'lax'`
- [ ] Rate limiting activo: máximo 5 intentos por IP en 15 minutos
- [ ] Rate limit se resetea tras login exitoso
- [ ] Contraseñas hasheadas con bcrypt (nunca expuestas)
- [ ] `/api/auth/me` no expone contraseña ni campos internos

---

## 6. Roles y permisos

Verificar `src/lib/permissions.ts` y `src/lib/tenant.ts`:

- [ ] `requireAuth()` en todos los endpoints protegidos
- [ ] `requireRole(session, MANAGE_ROLES)` en POST, PUT, PATCH, DELETE
- [ ] `VISUALIZADOR` bloqueado en todas las mutaciones
- [ ] OPERADOR solo puede operar sobre su `municipalityId`
- [ ] ADMIN puede operar global
- [ ] Usuarios sin `municipalityId` (no ADMIN) reciben 403 claro

---

## 7. Multi-municipio

Verificar que el scope por municipalidad está aplicado:

- [ ] Dashboard filtra por `municipalityId` para OPERADOR/VISUALIZADOR
- [ ] Listado de emergencias filtra por `municipalityId`
- [ ] Mapa filtra por `municipalityId`
- [ ] `GET /api/emergencias` filtra por `municipalityId`
- [ ] `GET /api/emergencias/[id]` valida acceso antes de retornar
- [ ] `PUT /api/emergencias/[id]` valida acceso antes de actualizar
- [ ] `DELETE /api/emergencias/[id]` valida acceso antes de eliminar
- [ ] `PATCH /api/emergencias/[id]/estado` valida acceso
- [ ] `GET/POST /api/emergencias/[id]/tareas` valida acceso
- [ ] `PATCH/DELETE /api/emergencias/[id]/tareas/[tareaId]` valida acceso
- [ ] `GET/POST/DELETE /api/emergencias/[id]/evidencias` valida acceso
- [ ] `/api/usuarios` filtra por `municipalityId` para no ADMIN
- [ ] JWT/Session incluye `municipalityId`

---

## 8. Storage (MinIO/S3 y local)

Revisar `src/lib/storage/index.ts`, `local.ts`, `s3.ts`:

- [ ] `STORAGE_PROVIDER=local` funciona sin variables S3
- [ ] `STORAGE_PROVIDER=s3` funciona con variables S3 configuradas
- [ ] Si faltan variables S3, el error es claro y no rompe el servidor
- [ ] Solo se aceptan: `image/jpeg`, `image/png`, `image/webp`
- [ ] Se rechazan: svg, pdf, exe, y cualquier otro tipo
- [ ] Límite de tamaño respeta `MAX_UPLOAD_SIZE_MB`
- [ ] Al eliminar evidencia, se borra también el archivo físico (local o S3)
- [ ] URLs de evidencias antiguas (`/uploads/...`) siguen funcionando

---

## 9. Rutas públicas

Verificar `/reportar` y `/consulta`:

**`/reportar`:**
- [ ] Funciona sin login
- [ ] Foto es opcional (formulario funciona sin foto)
- [ ] Crea emergencia con `status: NUEVA`, `priority: MEDIA`, `origin: CIUDADANO`
- [ ] Asigna `municipalityId` de la municipalidad demo (upsert automático)
- [ ] Genera código único (`EMG-YYYY-XXXX`)
- [ ] Retorna el código al ciudadano
- [ ] Registra en `ActivityLog`
- [ ] Si la foto falla, la emergencia igual se crea

**`/consulta`:**
- [ ] Funciona sin login
- [ ] Busca por código
- [ ] Retorna solo campos públicos: `code`, `title`, `type`, `status`, `priority`, `address`, `sector`, `origin`, `createdAt`, `occurredAt`, `closedAt`, `closingNotes`
- [ ] NO expone: usuarios internos, ActivityLog, evidencias, teléfonos internos

---

## 10. ActivityLog

Confirmar que se registra en:

- [ ] Creación de emergencia (`CREATED`)
- [ ] Cambio de estado (`STATUS_CHANGED`)
- [ ] Creación de tarea (`TASK_CREATED`)
- [ ] Cambio de estado de tarea (`TASK_STATUS_CHANGED`)
- [ ] Eliminación de tarea (`TASK_DELETED`)
- [ ] Subida de evidencia (`EVIDENCE_ADDED`)
- [ ] Eliminación de evidencia (`EVIDENCE_DELETED`)
- [ ] Reporte ciudadano recibido (`CREATED` con origen CIUDADANO)

---

## 11. Railway Settings

Confirmar configuración en el panel de Railway:

| Campo | Valor |
|-------|-------|
| Build Command | `npm run build` |
| Start Command | `npm run start` |
| Release Command | `npx prisma db push && npx prisma db seed` |

- [ ] Volume montado en `/app/public/uploads` si `STORAGE_PROVIDER=local`
- [ ] PostgreSQL conectado y `DATABASE_URL` vinculada automáticamente
- [ ] MinIO con dominio público configurado si `STORAGE_PROVIDER=s3`

---

## 12. Git

- [ ] Rama `main` está al día con los cambios
- [ ] No hay archivos sensibles commiteados (`.env`, credenciales)
- [ ] `public/uploads/` está en `.gitignore`
- [ ] `node_modules/` está en `.gitignore`
- [ ] `.next/` está en `.gitignore`

---

## Resultado final

Reportar:

```
PREDEPLOY CHECK — AlertaComunal
================================
1. Package.json       ✓ / ✗
2. Variables          ✓ / ✗
3. Build              ✓ / ✗
4. Prisma             ✓ / ✗
5. Seguridad          ✓ / ✗
6. Roles/Permisos     ✓ / ✗
7. Multi-municipio    ✓ / ✗
8. Storage            ✓ / ✗
9. Rutas públicas     ✓ / ✗
10. ActivityLog       ✓ / ✗
11. Railway Settings  ✓ / ✗
12. Git               ✓ / ✗

ESTADO: LISTO PARA DEPLOY / BLOQUEADO
Problemas encontrados: [lista]
Acciones requeridas: [lista]
```
