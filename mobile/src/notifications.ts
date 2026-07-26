import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Notificación recibida con la app en foreground: se muestra igual (banner +
// aparece en la lista), sin sonido — no hay urgencia de audio distinta a la
// del resto de la app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export interface RegisteredPushToken {
  token: string
  platform: 'IOS' | 'ANDROID'
}

/**
 * Pide permiso de notificaciones y obtiene el token de push de Expo.
 * Requiere que el proyecto esté vinculado a una cuenta/proyecto Expo
 * (`eas init`, que puebla expo.extra.eas.projectId en app.json) — todavía no
 * hecho en este proyecto. Sin ese vínculo, o en un simulador/emulador (no
 * reciben push reales), retorna null en vez de lanzar — el login no debe
 * fallar solo porque el push no pudo activarse.
 */
export async function registerForPushNotificationsAsync(): Promise<RegisteredPushToken | null> {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  if (!projectId) {
    console.warn(
      'Falta expo.extra.eas.projectId en app.json — corre "eas init" antes de habilitar push en producción.',
    )
    return null
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
  return { token: data, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' }
}
