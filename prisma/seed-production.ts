import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

/**
 * Seed productivo: no crea municipalidad demo, usuarios de prueba ni
 * emergencias de ejemplo. Solo garantiza que exista un SUPER_ADMIN de
 * arranque — con contraseña aleatoria, impresa una única vez — si todavía
 * no hay ninguno. Es el modo por defecto (ver prisma/seed.ts): un deploy
 * real que no active SEED_DEMO=true nunca termina con contraseñas conocidas.
 */
export default async function seedProduction() {
  console.log('Iniciando seed productivo (sin datos de demostración)...')

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
    select: { id: true, email: true },
  })

  if (existingSuperAdmin) {
    console.log(`  ✓ Ya existe un SUPER_ADMIN (${existingSuperAdmin.email}). No se crea ninguno.`)
    await prisma.$disconnect()
    return
  }

  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@alertacomunal.cl'
  const password = crypto.randomBytes(16).toString('base64url') // ~22 chars, alfanumérico + -_
  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name: 'Super Administrador',
      email,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      municipalityId: null,
      active: true,
    },
  })

  console.log('')
  console.log('  ✓ SUPER_ADMIN de arranque creado:')
  console.log(`      Email:      ${email}`)
  console.log(`      Contraseña: ${password}`)
  console.log('')
  console.log('  ⚠ Esta contraseña no se guarda en ningún log ni archivo — cópiala ahora')
  console.log('    a tu gestor de contraseñas. No se volverá a mostrar.')

  await prisma.$disconnect()
}
