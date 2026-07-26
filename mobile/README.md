# AlertaComunal — Operador (app móvil)

App Expo/React Native para operadores en terreno. Consume la misma API REST
de `alertacomunal` (repo raíz) — no duplica lógica de negocio, solo agrega
autenticación por token y pantallas nativas. Ver el plan completo (Sprint 7,
8, 9) en el historial de conversación / plan de trabajo del proyecto.

## Requisitos

- Sprint 7 (backend) debe estar desplegado — la app depende de que
  `POST /api/auth/login` acepte `X-Client-Type: mobile` y de que
  `getSession()`/`middleware.ts` acepten `Authorization: Bearer`.
- Node.js, Expo Go (para probar en un dispositivo físico sin build nativo) o
  un emulador Android/simulador iOS.

## Configuración

```bash
cd mobile
cp .env.example .env
npm install
```

`EXPO_PUBLIC_API_URL` en `.env` apunta a la API. Por defecto usa producción
(`https://alertacomunal.elementalpro.cl`). Para probar contra un backend
local (`npm run dev` en la raíz del repo), usa la IP LAN de tu máquina, no
`localhost` — el dispositivo/emulador no resuelve el localhost de tu PC.

## Correr

```bash
npm start        # abre Expo Dev Tools, escanea el QR con Expo Go
npm run android   # requiere Android Studio/emulador
npm run ios       # requiere macOS + Xcode
```

## Alcance del MVP (Sprint 8)

Login, "Mis emergencias" (`assignedToId=session.id`), detalle con mapa,
cambio de estado (con motivo de cierre obligatorio si es CERRADA), subida de
evidencia desde cámara o galería. **Fuera de alcance a propósito**: modo
offline/cola de sincronización, notificaciones push (Sprint 9), edición de
tareas, creación de emergencias desde la app.

## Pendiente antes de un build real (EAS)

- **Google Maps API key para Android**: `react-native-maps` en Android
  necesita `expo.android.config.googleMaps.apiKey` en `app.json` para
  renderizar tiles en un build de producción (en Expo Go/iOS funciona sin
  configuración adicional). No se configuró en este sprint — agregar antes
  de un build real, mismo patrón "opcional, se degrada" que ya usa
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en la app web.
- **Bundle identifier / package** (`cl.elementalpro.alertacomunal` en
  `app.json`) son provisionales — confirmar antes de publicar en las
  tiendas.
- Push notifications, ícono/splash reales y publicación en tiendas: Sprint 9.
