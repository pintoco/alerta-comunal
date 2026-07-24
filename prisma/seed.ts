/**
 * Punto de entrada de `prisma db seed`. Seguro por defecto: sin SEED_DEMO=true
 * corre el seed productivo (no crea datos de ejemplo ni contraseñas conocidas).
 * SEED_DEMO=true está pensado solo para desarrollo local.
 */
const useDemo = process.env.SEED_DEMO === 'true'

async function run() {
  const seed = useDemo
    ? (await import('./seed-demo')).default
    : (await import('./seed-production')).default
  await seed()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
