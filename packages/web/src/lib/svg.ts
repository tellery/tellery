import { renderToStaticMarkup } from 'react-dom/server'
import svgToTinyDataUri from 'mini-svg-data-uri'
import type { FunctionComponent, SVGAttributes } from 'react'

export function SVG2DataURI(icon: FunctionComponent<SVGAttributes<SVGElement>>) {
  return `url("${svgToTinyDataUri(renderToStaticMarkup(icon({})!))}")`
}
