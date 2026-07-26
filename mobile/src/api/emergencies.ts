import { apiFetch } from './client'
import type { EmergencyListItem, EmergencyDetail, ClosingReason } from '../types'

interface EmergenciesListResponse {
  data: EmergencyListItem[]
  total: number
}

export async function fetchMyEmergencies(userId: string): Promise<EmergencyListItem[]> {
  const params = new URLSearchParams({ assignedToId: userId, limit: '100' })
  const res = await apiFetch<EmergenciesListResponse>(`/api/emergencias?${params.toString()}`)
  return res.data
}

export async function fetchEmergency(id: string): Promise<EmergencyDetail> {
  return apiFetch<EmergencyDetail>(`/api/emergencias/${id}`)
}

export async function updateEmergencyStatus(
  id: string,
  payload: { status: string; closingNotes?: string; closingReasonId?: string | null },
): Promise<EmergencyDetail> {
  return apiFetch<EmergencyDetail>(`/api/emergencias/${id}/estado`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function fetchClosingReasons(municipalityId: string): Promise<ClosingReason[]> {
  const reasons = await apiFetch<ClosingReason[]>(
    `/api/admin/municipalidades/${municipalityId}/motivos-cierre`,
  )
  return reasons.filter((r) => r.active)
}

export async function uploadEvidence(
  emergencyId: string,
  file: { uri: string; name: string; type: string },
): Promise<void> {
  const formData = new FormData()
  // React Native's FormData acepta este shape (uri/name/type) aunque no sea
  // un Blob real — es el contrato que espera fetch en Hermes/RN, distinto al
  // FormData del navegador.
  formData.append('file', file as unknown as Blob)
  await apiFetch(`/api/emergencias/${emergencyId}/evidencias`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  })
}
