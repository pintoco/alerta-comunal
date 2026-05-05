import { PrismaClient, UserRole, EmergencyType, Priority, EmergencyStatus, ReportOrigin, TaskStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  const adminPassword = await bcrypt.hash('Admin123456', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'ppinto@elementalpro.cl' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'ppinto@elementalpro.cl',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  const opPassword = await bcrypt.hash('Operador123', 10)

  const operador1 = await prisma.user.upsert({
    where: { email: 'mgonzalez@alertacomunal.cl' },
    update: {},
    create: {
      name: 'María González',
      email: 'mgonzalez@alertacomunal.cl',
      password: opPassword,
      role: UserRole.OPERADOR,
    },
  })

  const operador2 = await prisma.user.upsert({
    where: { email: 'cmartinez@alertacomunal.cl' },
    update: {},
    create: {
      name: 'Carlos Martínez',
      email: 'cmartinez@alertacomunal.cl',
      password: opPassword,
      role: UserRole.OPERADOR,
    },
  })

  await prisma.user.upsert({
    where: { email: 'visualizador@alertacomunal.cl' },
    update: {},
    create: {
      name: 'Visualizador Demo',
      email: 'visualizador@alertacomunal.cl',
      password: opPassword,
      role: UserRole.VISUALIZADOR,
    },
  })

  const emergenciesData = [
    {
      code: 'EMG-2026-0001',
      title: 'Incendio en edificio residencial',
      description: 'Se reporta incendio en tercer piso de edificio residencial. Humo visible desde la calle. Vecinos evacuados preventivamente.',
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
    },
    {
      code: 'EMG-2026-0002',
      title: 'Inundación en sector Las Flores',
      description: 'Desbordamiento de canal causa inundación en calles del sector. Varios vehículos varados. Se requiere maquinaria para despejar.',
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
    },
    {
      code: 'EMG-2026-0003',
      title: 'Caída de árbol en vía pública',
      description: 'Árbol de gran tamaño cayó sobre la calzada durante madrugada bloqueando el tránsito vehicular completo.',
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
    },
    {
      code: 'EMG-2026-0004',
      title: 'Corte eléctrico masivo sector sur',
      description: 'Corte de suministro eléctrico afecta a más de 200 viviendas del sector sur. Se coordinó con empresa distribuidora.',
      type: EmergencyType.CORTE_ELECTRICO,
      priority: Priority.ALTA,
      status: EmergencyStatus.RESUELTA,
      address: 'Sector Sur, Manzanas 12-18',
      sector: 'Sur',
      latitude: -33.472,
      longitude: -70.66,
      origin: ReportOrigin.INTERNO,
      assignedToId: operador1.id,
    },
    {
      code: 'EMG-2026-0005',
      title: 'Daño en vivienda por lluvia',
      description: 'Colapso parcial de techo en vivienda social. Familia con 3 menores afectada, requirió traslado temporal.',
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
      closingNotes: 'Se coordinó con SEREMI de Vivienda para traslado temporal. Techado provisional instalado por municipio.',
    },
  ]

  for (const emergencyData of emergenciesData) {
    const existing = await prisma.emergency.findUnique({ where: { code: emergencyData.code } })
    if (existing) continue

    const emergency = await prisma.emergency.create({ data: emergencyData as any })

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

  console.log('Seed completado:')
  console.log('  - Admin: ppinto@elementalpro.cl / Admin123456')
  console.log('  - Operador 1: mgonzalez@alertacomunal.cl / Operador123')
  console.log('  - Operador 2: cmartinez@alertacomunal.cl / Operador123')
  console.log('  - 5 emergencias de ejemplo creadas')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
