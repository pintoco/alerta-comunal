---
name: alerta-comunal-devops-review
description: Revisa y mejora AlertaComunal con foco en Railway, Next.js, Prisma, PostgreSQL, MinIO/S3, roles, seguridad y multi-municipio sin romper el prototipo.
---

# Skill: AlertaComunal DevOps Review

## Contexto del proyecto

AlertaComunal es una plataforma SaaS municipal para registrar, georreferenciar, gestionar y hacer seguimiento de emergencias comunales.

Stack actual:
- Next.js 15 App Router
- TypeScript
- React 18
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- JWT con jose y cookies httpOnly
- Roles: ADMIN, OPERADOR, VISUALIZADOR
- Leaflet/OpenStreetMap
- MinIO/S3 para evidencias fotográficas
- Railway para deploy
- Prisma db push actualmente en uso
- Formulario ciudadano público `/reportar`
- Consulta ciudadana pública `/consulta`
- Evidencias internas y ciudadanas
- ActivityLog
- Modelo Municipality para separación por municipalidad

## Reglas obligatorias

Antes de modificar código:

1. Revisar archivos relevantes.
2. Detectar riesgos.
3. Proponer cambios incrementales.
4. No romper Railway.
5. No hacer cambios destructivos en Prisma.
6. No eliminar tablas.
7. No renombrar columnas.
8. No cambiar `prisma db push` por migraciones sin pedirlo.
9. No agregar `NODE_ENV` como variable requerida.
10. Mantener `npm run build` funcionando.
11. Mantener MinIO/S3 funcionando.
12. Mantener fallback `STORAGE_PROVIDER=local`.
13. Mantener `/reportar` funcionando.
14. Mantener `/consulta` funcionando.
15. Mantener autenticación y roles funcionando.

## Checklist técnico obligatorio

Cada vez que se revise o mejore el proyecto, verificar:

### Railway

- `package.json` mantiene:
  - `"build": "NODE_ENV=production next build"`
  - `"start": "next start"`
  - `"postinstall": "prisma generate"`
- No se agrega `NODE_ENV` manual al README.
- Variables esperadas:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `APP_URL`
  - `PUBLIC_DEFAULT_MUNICIPALITY_SLUG`
  - `STORAGE_PROVIDER`
  - `MAX_UPLOAD_SIZE_MB`
  - `S3_ENDPOINT`
  - `S3_REGION`
  - `S3_BUCKET`
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
  - `S3_FORCE_PATH_STYLE`
  - `S3_PUBLIC_URL`

### Prisma

- No hacer cambios destructivos.
- Si se agregan campos nuevos, deben ser opcionales o tener default seguro.
- Mantener compatibilidad con `prisma db push`.
- Revisar `prisma/schema.prisma`.
- Revisar `prisma/seed.ts`.
- El seed debe ser idempotente.
- No duplicar usuarios ni municipalidades.
- No borrar datos reales.

### Seguridad

- `JWT_SECRET` obligatorio en producción.
- Cookies deben ser:
  - `httpOnly`
  - `secure` en producción
  - `sameSite: lax`
- Rate limiting activo en `/api/auth/login`.
- No exponer contraseñas.
- No exponer datos internos en endpoints públicos.
- Validar roles en backend, no solo frontend.
- `VISUALIZADOR` no puede hacer POST, PUT, PATCH o DELETE.

### Roles

- ADMIN puede hacer todo.
- OPERADOR puede gestionar emergencias de su municipalidad.
- VISUALIZADOR solo puede ver.
- Los botones deben ocultarse según rol.
- Las APIs deben bloquear según rol.

### Multi-municipio

- OPERADOR y VISUALIZADOR solo ven su `municipalityId`.
- ADMIN puede ver global.
- No filtrar solo en UI; filtrar también en queries Prisma.
- Dashboard debe respetar scope municipal.
- Listado debe respetar scope municipal.
- Mapa debe respetar scope municipal.
- Detalle, edición, tareas y evidencias deben validar acceso.
- `/reportar` debe asignar `PUBLIC_DEFAULT_MUNICIPALITY_SLUG`.
- `/consulta` no debe exponer datos sensibles.

### MinIO/S3

- Mantener proveedor en `src/lib/storage/s3.ts`.
- Mantener abstracción en `src/lib/storage/index.ts`.
- Soportar:
  - `STORAGE_PROVIDER=local`
  - `STORAGE_PROVIDER=s3`
- Validar:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- Rechazar:
  - svg
  - pdf
  - exe
  - cualquier tipo no permitido
- Máximo por defecto: 5 MB.
- Si falla S3 por configuración, entregar error claro.
- No romper build si S3 no está configurado y `STORAGE_PROVIDER=local`.

### Formularios públicos

`/reportar` debe:
- funcionar sin login
- permitir foto opcional
- usar MinIO/S3 si corresponde
- permitir geocodificación o coordenadas si están implementadas
- crear emergencia con estado `NUEVA`
- prioridad inicial `MEDIA`
- origen `CIUDADANO`
- asignar municipalidad demo

`/consulta` debe:
- funcionar sin login
- buscar por código
- no exponer usuarios internos
- no exponer ActivityLog completo
- no exponer datos sensibles

### ActivityLog

Debe registrar:
- creación de emergencia
- cambio de estado
- creación de tarea
- cambio de estado de tarea
- eliminación de tarea
- subida de evidencia
- eliminación de evidencia
- creación de reporte ciudadano

## Procedimiento al hacer una mejora

Cuando se solicite una mejora:

1. Revisar los archivos relacionados.
2. Identificar impacto en Railway.
3. Identificar impacto en Prisma.
4. Identificar impacto en permisos.
5. Implementar cambios mínimos necesarios.
6. Evitar refactors grandes innecesarios.
7. Ejecutar:
   - `npx prisma generate`
   - `npm run build`
8. Si se modificó Prisma:
   - indicar si requiere `npx prisma db push`
9. Entregar resumen final:
   - archivos modificados
   - cambios realizados
   - variables nuevas
   - comandos para probar
   - riesgos pendientes

## Comandos de prueba recomendados

```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run build