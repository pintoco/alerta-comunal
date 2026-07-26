import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mismos 11 labels sembrados por defecto en /api/admin/municipalidades (POST)
// y en prisma/seed-demo.ts — deben coincidir exactamente con
// EMERGENCY_TYPE_LABELS (src/lib/utils.ts) para que el backfill de
// categoryId por debajo pueda matchear el `type` legado de cada emergencia.
const DEFAULT_EMERGENCY_CATEGORIES = [
  'Incendio',
  'Inundación',
  'Caída de árbol',
  'Corte de camino',
  'Corte eléctrico',
  'Daño en vivienda',
  'Emergencia social',
  'Accidente',
  'Riesgo sanitario',
  'Infraestructura pública',
  'Otro',
]

const TYPE_TO_LABEL: Record<string, string> = {
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

/**
 * Backfill de una sola vez tras la migración `emergency_categories_operational_units`:
 * 1. Siembra las 11 categorías por defecto en cada municipalidad que aún no tenga ninguna.
 * 2. Asigna `categoryId` a cada emergencia existente (categoryId nulo, type/municipalidad
 *    no nulos) buscando la categoría de esa municipalidad cuyo label coincida con su `type` legado.
 * Idempotente — seguro de correr más de una vez. NO se ejecuta automáticamente en ningún
 * deploy/seed; correr a mano una vez después de aplicar la migración:
 *   npx tsx prisma/scripts/backfill-emergency-categories.ts
 */
async function main() {
  console.log('Iniciando backfill de categorías de emergencia...')

  const municipalities = await prisma.municipality.findMany({ select: { id: true, name: true } })

  let seededMunicipalities = 0
  for (const municipality of municipalities) {
    const existingCount = await prisma.emergencyCategory.count({
      where: { municipalityId: municipality.id },
    })
    if (existingCount > 0) continue

    await prisma.emergencyCategory.createMany({
      data: DEFAULT_EMERGENCY_CATEGORIES.map((label, order) => ({
        municipalityId: municipality.id,
        label,
        order,
      })),
    })
    seededMunicipalities++
  }
  console.log(`  Categorías sembradas en ${seededMunicipalities} municipalidad(es) (de ${municipalities.length} totales).`)

  const orphanCount = await prisma.emergency.count({
    where: { categoryId: null, municipalityId: null },
  })
  if (orphanCount > 0) {
    console.log(`  ${orphanCount} emergencia(s) sin municipalidad asignada — quedan sin categoryId (no se puede backfillear sin municipio).`)
  }

  const pending = await prisma.emergency.findMany({
    where: { categoryId: null, type: { not: null }, municipalityId: { not: null } },
    select: { id: true, type: true, municipalityId: true },
  })

  let backfilled = 0
  let unmatched = 0
  for (const emergency of pending) {
    const label = TYPE_TO_LABEL[emergency.type as string]
    const category = await prisma.emergencyCategory.findFirst({
      where: { municipalityId: emergency.municipalityId as string, label },
      select: { id: true },
    })
    if (!category) {
      unmatched++
      continue
    }
    await prisma.emergency.update({
      where: { id: emergency.id },
      data: { categoryId: category.id },
    })
    backfilled++
  }

  console.log(`  ${backfilled} emergencia(s) backfilleada(s) con categoryId.`)
  if (unmatched > 0) {
    console.log(`  ${unmatched} emergencia(s) sin categoría coincidente (quedan con categoryId nulo).`)
  }

  console.log('Backfill completado.')
}

main()
  .catch((err) => {
    console.error('Error en el backfill:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
