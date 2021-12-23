import 'katex/dist/katex.css'
let katex: any = null

export const getKatex = async () => {
  if (katex) {
    return katex
  } else {
    // import('katex/dist/katex.css')
    // todo
    katex = (await import('katex')).default
    return katex
  }
}

export const renderEquation = async (equation: string) => {
  if (!equation) return null
  const katex = await getKatex()
  return katex.renderToString(equation, {
    throwOnError: false
  })
}
