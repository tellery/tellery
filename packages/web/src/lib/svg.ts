import { renderToStaticMarkup } from 'react-dom/server'
import svgToTinyDataUri from 'mini-svg-data-uri'
import type { FunctionComponent, SVGAttributes } from 'react'
import { css, cx } from '@emotion/css'
import { IconFontStory, IconMenuH1, IconMenuH2, IconMenuH3, IconMenuQuote } from 'assets/icons'

export function svgColorClassName(color: string, icon: FunctionComponent<SVGAttributes<SVGElement>>) {
  return cx(
    css`
      & path {
        fill: ${color};
      }
      & rect {
        stroke: ${color};
      }
      & mask rect {
        stroke: none;
      }
      & circle {
        fill: ${color};
        stroke: ${color};
      }
    `,
    icon.name === IconFontStory.name
      ? css`
          & path {
            stroke: ${color};
            fill: none;
          }
        `
      : undefined,
    icon.name === IconMenuH1.name ||
      icon.name === IconMenuH2.name ||
      icon.name === IconMenuH3.name ||
      icon.name === IconMenuQuote.name
      ? css`
          & rect {
            fill: ${color};
            stroke: none;
          }
        `
      : undefined
  )
}

export function SVG2DataURI(icon: FunctionComponent<SVGAttributes<SVGElement>>) {
  return `url("${svgToTinyDataUri(renderToStaticMarkup(icon({})!))}")`
}
