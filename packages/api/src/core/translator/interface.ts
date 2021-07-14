/**
 * Specific SQL actuator. Responsible to escape and perform SQL
 */
export interface ISqlTranslator {
  /**
   * Can SQL can be translated by this Translator
   */
  match(param: string): boolean

  /**
   * Assist param to an executable statement
   */
  translate(param: string): Promise<string>
}
