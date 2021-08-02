import { renderToStaticMarkup } from 'react-dom/server'
import svgToTinyDataUri from 'mini-svg-data-uri'
import type { FunctionComponent, SVGAttributes } from 'react'

export function SVG2DataURI(icon: FunctionComponent<SVGAttributes<SVGElement>>, color?: string) {
  return `url("${svgToTinyDataUri(renderToStaticMarkup(icon({})!).replace('currentColor', color || 'currentColor'))}")`
}
