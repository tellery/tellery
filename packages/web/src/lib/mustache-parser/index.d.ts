interface ParseReturnType {
  name: string
  params: { [k: string]: string }
  alias?: string
}
export default {
  SyntaxError: unknown,
  parse: (input: string, options: any) => ParseReturnType
}
