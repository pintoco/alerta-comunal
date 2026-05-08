import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import MunicipalityForm from '@/components/admin/MunicipalityForm'

export default async function NuevaMunicipalidadPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  return (
    <MainLayout>
      <div className="max-w-xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin" className="hover:text-blue-600">Administración</Link>
            <span>›</span>
            <Link href="/admin/municipalidades" className="hover:text-blue-600">Municipalidades</Link>
            <span>›</span>
            <span>Nueva</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva municipalidad</h1>
          <p className="text-gray-500 text-sm mt-1">Registrar una nueva municipalidad en la plataforma</p>
        </div>
        <div className="card p-6">
          <MunicipalityForm mode="create" />
        </div>
      </div>
    </MainLayout>
  )
}
