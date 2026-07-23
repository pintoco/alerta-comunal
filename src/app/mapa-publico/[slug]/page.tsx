import MapaPublicoView from '../MapaPublicoView'

export default async function MapaPublicoPorMunicipalidadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <MapaPublicoView municipalitySlug={slug} />
}
