/**
 * This is the default translator, its matching priority is the lowest. It will match all that is not matched by other Translator
 */
function match(sql: string): boolean {
  return !!sql
}

/**
 * Assist param to an executable statement
 */
async function translate(sql: string): Promise<string> {
  return sql
}

export { match, translate }
