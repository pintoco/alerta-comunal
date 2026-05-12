import { Resend } from 'resend'
import { emailConfig, appUrl } from './config'

// ── Inline labels (no importa utils para evitar bundling en cliente) ──────────
const TYPE_LABELS: Record<string, string> = {
  INCENDIO: 'Incendio',
  INUNDACION: 'Inundación',
  CAIDA_ARBOL: 'Caída de árbol',
  CORTE_CAMINO: 'Corte de camino',
  CORTE_ELECTRICO: 'Corte eléctrico',
  DANO_VIVIENDA: 'Daño en vivienda',
  EMERGENCIA_SOCIAL: 'Emergencia social',
  ACCIDENTE: 'Accidente',
  RIESGO_SANITARIO: 'Riesgo sanitario',
  INFRAESTRUCTURA_PUBLICA: 'Infraestructura pública',
  OTRO: 'Otro',
}

const PRIORITY_LABELS: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

const STATUS_LABELS: Record<string, string> = {
  NUEVA: 'Nueva',
  EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  DESCARTADA: 'Descartada',
}

function toLabel(map: Record<string, string>, key: string): string {
  return map[key] ?? key
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailRow(fieldLabel: string, value: string | null | undefined): string {
  if (!value) return ''
  return `<tr>
    <td style="padding:7px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:38%;vertical-align:top">${esc(fieldLabel)}</td>
    <td style="padding:7px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:13px">${esc(value)}</td>
  </tr>`
}

function emailHeader(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:600px">
<tr><td style="background:#1e293b;padding:20px 24px">
  <p style="color:#fff;font-size:18px;font-weight:bold;margin:0">AlertaComunal</p>
  <p style="color:#94a3b8;font-size:12px;margin:4px 0 0">Sistema de Gestión de Emergencias Municipales</p>
</td></tr>`
}

function emailFooter(): string {
  return `<tr><td style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0">
  <p style="color:#94a3b8;font-size:11px;margin:0">Este correo fue generado automáticamente por AlertaComunal. No responda a este mensaje.</p>
</td></tr>
</table></td></tr></table></body></html>`
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface EmailResult {
  success: boolean
  error?: string
}

export function isEmailEnabled(): boolean {
  return emailConfig.enabled
}

export async function sendEmail(params: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}): Promise<EmailResult> {
  if (!isEmailEnabled()) return { success: true }

  if (!emailConfig.apiKey) {
    const msg = '[email] RESEND_API_KEY no configurada. Correo no enviado.'
    console.error(msg)
    return { success: false, error: msg }
  }

  try {
    const resend = new Resend(emailConfig.apiKey)
    const { error } = await resend.emails.send({
      from: emailConfig.from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ── Template: nuevo reporte ciudadano al administrador municipal ──────────────

export interface NewReportEmailData {
  id: string
  code: string
  type: string
  priority: string
  status: string
  region?: string | null
  commune?: string | null
  address: string
  sector?: string | null
  reporterName?: string | null
  reporterPhone?: string | null
  description: string
  createdAt: Date
  municipalityName?: string | null
}

export async function sendMunicipalityNewReportEmail(
  to: string[],
  data: NewReportEmailData,
): Promise<EmailResult> {
  if (!to.length) return { success: false, error: 'Sin destinatarios' }

  const link = `${appUrl}/emergencias/${data.id}`
  const created = data.createdAt.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const munName = data.municipalityName ? `<strong>${esc(data.municipalityName)}</strong>` : 'la municipalidad'

  const html = `${emailHeader()}
<tr><td style="padding:24px">
  <h2 style="color:#1e293b;margin:0 0 4px;font-size:18px">Nuevo reporte ciudadano recibido</h2>
  <p style="color:#64748b;font-size:13px;margin:0 0 20px">Se ha registrado un nuevo reporte en ${munName}.</p>

  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin-bottom:20px">
    <p style="color:#1d4ed8;font-size:11px;font-weight:bold;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px">Código de seguimiento</p>
    <p style="color:#1e40af;font-size:22px;font-weight:bold;font-family:monospace;margin:0">${esc(data.code)}</p>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${emailRow('Tipo', toLabel(TYPE_LABELS, data.type))}
    ${emailRow('Prioridad', toLabel(PRIORITY_LABELS, data.priority))}
    ${emailRow('Estado', toLabel(STATUS_LABELS, data.status))}
    ${emailRow('Región', data.region)}
    ${emailRow('Comuna', data.commune)}
    ${emailRow('Dirección', data.address)}
    ${emailRow('Sector', data.sector)}
    ${emailRow('Reportante', data.reporterName)}
    ${emailRow('Teléfono', data.reporterPhone)}
    ${emailRow('Fecha', created)}
  </table>

  <div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:12px 16px;margin:20px 0;border-radius:0 6px 6px 0">
    <p style="color:#64748b;font-size:12px;font-weight:bold;margin:0 0 4px;text-transform:uppercase">Descripción</p>
    <p style="color:#1e293b;font-size:13px;margin:0">${esc(data.description)}</p>
  </div>

  <div style="margin-top:24px">
    <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold">Ver emergencia →</a>
  </div>
</td></tr>
${emailFooter()}`

  const text = [
    'NUEVO REPORTE CIUDADANO — AlertaComunal',
    `Código: ${data.code}`,
    `Tipo: ${toLabel(TYPE_LABELS, data.type)}`,
    `Prioridad: ${toLabel(PRIORITY_LABELS, data.priority)}`,
    `Estado: ${toLabel(STATUS_LABELS, data.status)}`,
    data.region ? `Región: ${data.region}` : '',
    data.commune ? `Comuna: ${data.commune}` : '',
    `Dirección: ${data.address}`,
    data.sector ? `Sector: ${data.sector}` : '',
    data.reporterName ? `Reportante: ${data.reporterName}` : '',
    data.reporterPhone ? `Teléfono: ${data.reporterPhone}` : '',
    `Descripción: ${data.description}`,
    `Fecha: ${created}`,
    `Ver emergencia: ${link}`,
    'Este correo fue generado automáticamente por AlertaComunal.',
  ]
    .filter(Boolean)
    .join('\n')

  return sendEmail({ to, subject: `Nuevo reporte ciudadano — ${data.code}`, html, text })
}

// ── Template: emergencia asignada al usuario responsable ─────────────────────

export interface AssignmentEmailData {
  id: string
  code: string
  type: string
  priority: string
  status: string
  region?: string | null
  commune?: string | null
  address: string
  sector?: string | null
  description: string
  assignedByName?: string | null
}

export async function sendEmergencyAssignmentEmail(
  to: string,
  data: AssignmentEmailData,
): Promise<EmailResult> {
  const link = `${appUrl}/emergencias/${data.id}`
  const byLine = data.assignedByName
    ? `<strong>${esc(data.assignedByName)}</strong> te ha asignado una emergencia para su atención.`
    : 'Tienes una emergencia asignada para su atención.'

  const html = `${emailHeader()}
<tr><td style="padding:24px">
  <h2 style="color:#1e293b;margin:0 0 4px;font-size:18px">Se te ha asignado una emergencia</h2>
  <p style="color:#64748b;font-size:13px;margin:0 0 20px">${byLine}</p>

  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin-bottom:20px">
    <p style="color:#1d4ed8;font-size:11px;font-weight:bold;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px">Código de emergencia</p>
    <p style="color:#1e40af;font-size:22px;font-weight:bold;font-family:monospace;margin:0">${esc(data.code)}</p>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${emailRow('Tipo', toLabel(TYPE_LABELS, data.type))}
    ${emailRow('Prioridad', toLabel(PRIORITY_LABELS, data.priority))}
    ${emailRow('Estado', toLabel(STATUS_LABELS, data.status))}
    ${emailRow('Región', data.region)}
    ${emailRow('Comuna', data.commune)}
    ${emailRow('Dirección', data.address)}
    ${emailRow('Sector', data.sector)}
  </table>

  <div style="background:#f8fafc;border-left:3px solid #f59e0b;padding:12px 16px;margin:20px 0;border-radius:0 6px 6px 0">
    <p style="color:#64748b;font-size:12px;font-weight:bold;margin:0 0 4px;text-transform:uppercase">Descripción</p>
    <p style="color:#1e293b;font-size:13px;margin:0">${esc(data.description)}</p>
  </div>

  <div style="margin-top:24px">
    <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold">Ver y gestionar emergencia →</a>
  </div>
</td></tr>
${emailFooter()}`

  const text = [
    'EMERGENCIA ASIGNADA — AlertaComunal',
    data.assignedByName ? `Asignado por: ${data.assignedByName}` : '',
    `Código: ${data.code}`,
    `Tipo: ${toLabel(TYPE_LABELS, data.type)}`,
    `Prioridad: ${toLabel(PRIORITY_LABELS, data.priority)}`,
    `Estado: ${toLabel(STATUS_LABELS, data.status)}`,
    data.region ? `Región: ${data.region}` : '',
    data.commune ? `Comuna: ${data.commune}` : '',
    `Dirección: ${data.address}`,
    `Descripción: ${data.description}`,
    `Ver emergencia: ${link}`,
    'Este correo fue generado automáticamente por AlertaComunal.',
  ]
    .filter(Boolean)
    .join('\n')

  return sendEmail({ to, subject: `Emergencia asignada — ${data.code}`, html, text })
}
