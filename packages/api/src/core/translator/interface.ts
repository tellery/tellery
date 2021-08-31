import { Block } from '../block'

/**
 * Specific SQL actuator. Responsible to escape and perform SQL
 */
export interface ISqlTranslator {
  /**
   * Can SQL can be translated by this Translator
   */
  match(block: Block): boolean

  /**
   * Assist param to an executable statement
   */
  translate(block: Block, opts: Record<string, unknown>): Promise<string>
}
