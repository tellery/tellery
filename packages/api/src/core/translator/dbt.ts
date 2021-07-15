import _ from 'lodash'
import { InvalidArgumentError } from '../../error/error'
import { Block } from '../block'

/**
 * This is the default translator, its matching priority is the lowest. It will match all that is not matched by other Translator
 */
function match(block: Block): boolean {
  // TODO: support custom block type
  return (block.getType() as string) === 'dbt'
}

/**
 * Assist param to an executable statement
 */
function translate(block: Block): string {
  const type = _(block.content).get('type')
  if (_(['ref', 'source']).includes(type)) {
    return `${type}('${block.getInterKey()}')`
  }
  throw InvalidArgumentError.new('invalid type in dbt block content')
}

export { match, translate }
