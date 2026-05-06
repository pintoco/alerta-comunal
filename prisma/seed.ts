import {
  PrismaClient,
  UserRole,
  EmergencyType,
  Priority,
  EmergencyStatus,
  ReportOrigin,
  TaskStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // Municipalidad demo (idempotente por slug único)
  const municipality = await prisma.municipality.upsert({
    where: { slug: 'demo' },
    update: { name: 'Municipalidad Demo', active: true },
    create: {
      name: 'Municipalidad Demo',
      slug: 'demo',
      region: 'Región Demo',
      commune: 'Comuna Demo',
      active: true,
    },
  })
  console.log(`  ✓ Municipalidad: ${municipality.name} (${municipality.slug})`)

  // Usuarios (upsert — no duplica, actualiza municipalityId si ya existe)
  const adminPassword = await bcrypt.hash('Admin123456', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'ppinto@elementalpro.cl' },
    update: { municipalityId: municipality.id },
    create: {
      name: 'Administrador',
      email: 'ppinto@elementalpro.cl',
      password: adminPassword,
      role: UserRole.ADMIN,
      municipalityId: municipality.id,
    },
  })

  const opPassword = await bcrypt.hash('Operador123', 10)

  const operador1 = await prisma.user.upsert({
    where: { email: 'mgonzalez@alertacomunal.cl' },
    update: { municipalityId: municipality.id },
    create: {
      name: 'María González',
      email: 'mgonzalez@alertacomunal.cl',
      password: opPassword,
      role: UserRole.OPERADOR,
      municipalityId: municipality.id,
    },
  })

  const operador2 = await prisma.user.upsert({
    where: { email: 'cmartinez@alertacomunal.cl' },
    update: { municipalityId: municipality.id },
    create: {
      name: 'Carlos Martínez',
      email: 'cmartinez@alertacomunal.cl',
      password: opPassword,
      role: UserRole.OPERADOR,
      municipalityId: municipality.id,
    },
  })

  const vizPassword = await bcrypt.hash('Visualizador123', 10)
  await prisma.user.upsert({
    where: { email: 'visualizador@alertacomunal.cl' },
    update: { municipalityId: municipality.id },
    create: {
      name: 'Visualizador Demo',
      email: 'visualizador@alertacomunal.cl',
      password: vizPassword,
      role: UserRole.VISUALIZADOR,
      municipalityId: municipality.id,
    },
  })

  console.log('  ✓ 4 usuarios creados/actualizados')

  // Emergencias de ejemplo (solo crea si no existen por código)
  const emergenciesData = [
    {
      code: 'EMG-2026-0001',
      title: 'Incendio en edificio residencial',
      description:
        'Se reporta incendio en tercer piso de edificio residencial. Humo visible desde la calle. Vecinos evacuados preventivamente.',
      type: EmergencyType.INCENDIO,
      priority: Priority.CRITICA,
      status: EmergencyStatus.EN_ATENCION,
      address: "Av. O'Higgins 1245, Piso 3",
      sector: 'Centro',
      latitude: -33.4569,
      longitude: -70.6483,
      reporterName: 'Juan Pérez',
      reporterPhone: '+56912345678',
      origin: ReportOrigin.CIUDADANO,
      assignedToId: operador1.id,
      municipalityId: municipality.id,
    },
    {
      code: 'EMG-2026-0002',
      title: 'Inundación en sector Las Flores',
      description:
        'Desbordamiento de canal causa inundación en calles del sector. Varios vehículos varados. Se requiere maquinaria para despejar.',
      type: EmergencyType.INUNDACION,
      priority: Priority.ALTA,
      status: EmergencyStatus.EN_ATENCION,
      address: 'Calle Las Flores 340',
      sector: 'Las Flores',
      latitude: -33.465,
      longitude: -70.655,
      reporterName: 'Ana Rodríguez',
      reporterPhone: '+56987654321',
      origin: ReportOrigin.CIUDADANO,
      assignedToId: operador2.id,
      municipalityId: municipality.id,
    },
    {
      code: 'EMG-2026-0003',
      title: 'Caída de árbol en vía pública',
      description:
        'Árbol de gran tamaño cayó sobre la calzada durante madrugada bloqueando el tránsito vehicular completo.',
      type: EmergencyType.CAIDA_ARBOL,
      priority: Priority.MEDIA,
      status: EmergencyStatus.NUEVA,
      address: 'Calle Los Aromos 890',
      sector: 'Norte',
      latitude: -33.448,
      longitude: -70.642,
      reporterName: 'Pedro Silva',
      reporterPhone: '+56911223344',
      origin: ReportOrigin.CIUDADANO,
      municipalityId: municipality.id,
    },
    {
      code: 'EMG-2026-0004',
      title: 'Corte eléctrico masivo sector sur',
      description:
        'Corte de suministro eléctrico afecta a más de 200 viviendas del sector sur. Se coordinó con empresa distribuidora.',
      type: EmergencyType.CORTE_ELECTRICO,
      priority: Priority.ALTA,
      status: EmergencyStatus.RESUELTA,
      address: 'Sector Sur, Manzanas 12-18',
      sector: 'Sur',
      latitude: -33.472,
      longitude: -70.66,
      origin: ReportOrigin.INTERNO,
      assignedToId: operador1.id,
      municipalityId: municipality.id,
    },
    {
      code: 'EMG-2026-0005',
      title: 'Daño en vivienda por lluvia',
      description:
        'Colapso parcial de techo en vivienda social. Familia con 3 menores afectada, requirió traslado temporal.',
      type: EmergencyType.DANO_VIVIENDA,
      priority: Priority.ALTA,
      status: EmergencyStatus.CERRADA,
      address: 'Villa Los Pinos, Casa 45',
      sector: 'Poniente',
      latitude: -33.46,
      longitude: -70.67,
      reporterName: 'Carmen López',
      reporterPhone: '+56955667788',
      origin: ReportOrigin.CIUDADANO,
      assignedToId: operador2.id,
      closedAt: new Date(),
      closingNotes:
        'Se coordinó con SEREMI de Vivienda para traslado temporal. Techado provisional instalado por municipio.',
      municipalityId: municipality.id,
    },
  ]

  let created = 0
  for (const emergencyData of emergenciesData) {
    const existing = await prisma.emergency.findUnique({ where: { code: emergencyData.code } })
    if (existing) continue

    const emergency = await prisma.emergency.create({ data: emergencyData as any })
    created++

    if (emergency.code === 'EMG-2026-0001') {
      await prisma.task.createMany({
        data: [
          {
            emergencyId: emergency.id,
            title: 'Coordinar con bomberos',
            description: 'Contactar cuartel de bomberos más cercano',
            status: TaskStatus.COMPLETADA,
            assignedToId: operador1.id,
          },
          {
            emergencyId: emergency.id,
            title: 'Evacuar edificio',
            description: 'Coordinar evacuación de todos los pisos',
            status: TaskStatus.EN_PROCESO,
            assignedToId: operador1.id,
          },
          {
            emergencyId: emergency.id,
            title: 'Notificar a SAMU',
            description: 'Informar a SAMU por posibles personas heridas',
            status: TaskStatus.PENDIENTE,
          },
        ],
      })
    }

    await prisma.activityLog.create({
      data: {
        emergencyId: emergency.id,
        userId: admin.id,
        action: 'CREATED',
        description: `Emergencia ${emergency.code} registrada en el sistema`,
      },
    })

    if (emergency.status !== EmergencyStatus.NUEVA) {
      await prisma.activityLog.create({
        data: {
          emergencyId: emergency.id,
          userId: admin.id,
          action: 'STATUS_CHANGED',
          description: `Estado cambiado a: ${emergency.status}`,
        },
      })
    }
  }

  console.log(`  ✓ ${created} emergencias creadas (${5 - created} ya existían)`)
  console.log('')
  console.log('Seed completado. Credenciales demo:')
  console.log('  ADMIN      ppinto@elementalpro.cl         / Admin123456')
  console.log('  OPERADOR   mgonzalez@alertacomunal.cl     / Operador123')
  console.log('  OPERADOR   cmartinez@alertacomunal.cl     / Operador123')
  console.log('  VISUALIZADOR visualizador@alertacomunal.cl / Visualizador123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
