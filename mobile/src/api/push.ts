import { apiFetch } from './client'

export async function registerDeviceToken(
  token: string,
  platform: 'IOS' | 'ANDROID',
): Promise<void> {
  await apiFetch('/api/mobile/device-token', {
    method: 'POST',
    body: { token, platform },
  })
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await apiFetch('/api/mobile/device-token', {
    method: 'DELETE',
    body: { token },
  })
}
