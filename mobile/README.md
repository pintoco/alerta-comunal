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
offline/cola de sincronización, edición de tareas, creación de emergencias
desde la app.

## Push notifications (Sprint 9)

`src/notifications.ts` pide permiso y obtiene el token de push de Expo tras
el login (`AuthContext` lo registra vía `POST /api/mobile/device-token`) y lo
da de baja al cerrar sesión (`DELETE`). Tocar una notificación navega directo
al detalle de la emergencia (`src/navigation/RootNavigator.tsx`,
`useNotificationDeepLink`), usando el `emergencyId` que viaja en el payload
`data` (ver `src/lib/push.ts` en el backend).

**Requiere `eas init` antes de funcionar de verdad** — `getExpoPushTokenAsync`
necesita `expo.extra.eas.projectId` en `app.json`, que solo se puebla al
vincular el proyecto a una cuenta Expo (`npx eas init`, requiere login con
una cuenta Expo — no se hizo en este sprint, es una decisión del dueño del
proyecto, no algo que se pueda automatizar sin sus credenciales). Sin ese
vínculo, `registerForPushNotificationsAsync()` retorna `null` sin romper
nada (login/logout siguen funcionando normal, solo no llegan pushes).

## Pendiente antes de un build real (EAS)

- **`eas init`**: vincular el proyecto a una cuenta Expo (ver arriba) — es el
  primer paso, todo lo demás de EAS Build depende de esto.
- **Google Maps API key para Android**: `react-native-maps` en Android
  necesita `expo.android.config.googleMaps.apiKey` en `app.json` para
  renderizar tiles en un build de producción (en Expo Go/iOS funciona sin
  configuración adicional). No se configuró en este sprint — agregar antes
  de un build real, mismo patrón "opcional, se degrada" que ya usa
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en la app web.
- **Bundle identifier / package** (`cl.elementalpro.alertacomunal` en
  `app.json`) son provisionales — confirmar antes de publicar en las
  tiendas.
- **Cuentas de tienda**: Apple Developer Program (USD 99/año, puede requerir
  D-U-N-S si se inscribe como organización) y Google Play Console (USD 25
  pago único) — ninguna de las dos existe todavía.
- **Cuenta de demostración para revisores de Apple**: App Store exige poder
  loguearse para revisar apps con autenticación — crear un usuario
  `OPERADOR` dedicado en una municipalidad demo antes de enviar a revisión.
- **Política de privacidad**: publicada en
  `https://alertacomunal.elementalpro.cl/privacidad-app.html`
  (`public/privacidad-app.html` en el repo raíz) — usar esa URL en la ficha
  de ambas tiendas.
- Ícono/splash reales (los actuales son el placeholder del template de
  Expo) y screenshots de las pantallas reales para la ficha de tienda.
