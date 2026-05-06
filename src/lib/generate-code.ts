import { prisma } from './prisma'

/**
 * Genera el siguiente código EMG-YYYY-XXXX basándose en el count actual del año.
 *
 * RACE CONDITION CONOCIDA: si dos emergencias se crean en paralelo pueden obtener
 * el mismo count y, por tanto, el mismo código. La constraint @unique en `code`
 * hace que Prisma lance P2002 en la segunda escritura.
 *
 * La solución se maneja en la capa de llamada: la ruta POST captura P2002 en el
 * campo `code` y reintenta hasta 3 veces, re-ejecutando esta función. En cada
 * reintento el count ya habrá aumentado (la primera escritura fue exitosa), por
 * lo que el segundo intento obtiene un código diferente.
 */
export async function generateEmergencyCode(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.emergency.count({
    where: { code: { startsWith: `EMG-${year}-` } },
  })
  return `EMG-${year}-${String(count + 1).padStart(4, '0')}`
}
