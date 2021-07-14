import { ISqlTranslator } from './interface'
import * as question from './question'
import * as dbt from './dbt'

const translators = [dbt, question]

export function getSqlTranslator(param: string): ISqlTranslator {
  for (const translator of translators) {
    if (translator.match(param)) {
      return translator
    }
  }
  return question
}
