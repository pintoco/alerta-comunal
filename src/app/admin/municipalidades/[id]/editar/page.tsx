import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import MunicipalityForm from '@/components/admin/MunicipalityForm'

export const dynamic = 'force-dynamic'

export default async function EditarMunicipalidadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { id } = await params

  const municipality = await prisma.municipality.findUnique({ where: { id } })
  if (!municipality) notFound()

  return (
    <MainLayout>
      <div className="max-w-xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin" className="hover:text-blue-600">Administración</Link>
            <span>›</span>
            <Link href="/admin/municipalidades" className="hover:text-blue-600">Municipalidades</Link>
            <span>›</span>
            <Link href={`/admin/municipalidades/${id}`} className="hover:text-blue-600">{municipality.name}</Link>
            <span>›</span>
            <span>Editar</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Editar municipalidad</h1>
          <p className="text-gray-500 text-sm mt-1">{municipality.name}</p>
        </div>
        <div className="card p-6">
          <MunicipalityForm
            mode="edit"
            initialData={{
              id: municipality.id,
              name: municipality.name,
              slug: municipality.slug,
              region: municipality.region,
              commune: municipality.commune,
              active: municipality.active,
            }}
          />
        </div>
      </div>
    </MainLayout>
  )
}
