/// <reference types="@welldone-software/why-did-you-render" />
/// <reference types="resize-observer-browser" />
/// <reference types="vite/client" />
/* Use this file to declare any custom file extensions for importing */
/* Use this folder to also add/extend a package d.ts file, if needed. */
import type React from 'react'
import type katex from '@types/katex'
/* CSS MODULES */
declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}
declare module '*.module.scss' {
  const classes: { [key: string]: string }
  export default classes
}
declare module '*.module.sass' {
  const classes: { [key: string]: string }
  export default classes
}
declare module '*.module.less' {
  const classes: { [key: string]: string }
  export default classes
}
declare module '*.module.styl' {
  const classes: { [key: string]: string }
  export default classes
}

/* CSS */
declare module '*.css'
declare module '*.scss'
declare module '*.sass'
declare module '*.less'
declare module '*.styl'

/* IMAGES */
// declare module '*.svg' {
//   const ref: string
//   export default ref
// }

declare module '*.bmp' {
  const ref: string
  export default ref
}
declare module '*.gif' {
  const ref: string
  export default ref
}
declare module '*.jpg' {
  const ref: string
  export default ref
}
declare module '*.jpeg' {
  const ref: string
  export default ref
}
declare module '*.png' {
  const ref: string
  export default ref
}

declare module 'katex/dist/katex.mjs' {
  export default katex
}

/* CUSTOM: ADD YOUR OWN HERE */

declare global {
  declare module '*.svg?component' {
    const content: React.ForwardRefExoticComponent<React.SVGAttributes<SVGElement>>
    export default content
  }

  interface ImportMeta {
    env: {
      GITHUB_AUTH_TOKEN: string
      NODE_ENV: 'development' | 'production'
      PORT?: string
      PWD: string
      VITE_WS_URI?: string
      VITE_SENTRY_DSN?: string
    }
  }
}
