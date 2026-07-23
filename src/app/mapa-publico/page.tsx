import MapaPublicoView from './MapaPublicoView'
import { municipalityConfig } from '@/lib/config'

export default function MapaPublicoPage() {
  return <MapaPublicoView defaultSlug={municipalityConfig.defaultSlug} />
}
