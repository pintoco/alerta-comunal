import ReportarForm from '../ReportarForm'

export default async function ReportarPorMunicipalidadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ReportarForm municipalitySlug={slug} />
}
