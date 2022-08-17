import elements from '../../periodic-table-data'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ params }) => {
  const element = elements.find((el) => el.name.toLowerCase() === params.slug)

  if (element) return { element }
}
