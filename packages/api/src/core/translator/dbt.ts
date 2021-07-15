import _ from 'lodash'
import { InvalidArgumentError } from '../../error/error'
import { Block } from '../block'

/**
 * Only match DBT Blocks
 */
function match(block: Block): boolean {
  // TODO: support custom block type
  return (block.getType() as string) === 'dbt'
}

/**
 * Assist param to an executable statement
 * There are two references in DBT, which are `ref` and `source`, which are now stored in the content of DBT Block.
 * If something references DBT Block, we convert the {{$dbtBlockId}} to ref('xxx') or source('xxx')
 */
function translate(block: Block): string {
  const type = _(block.content).get('type')
  if (_(['ref', 'source']).includes(type)) {
    return `${type}('${block.getInterKey()}')`
  }
  throw InvalidArgumentError.new('invalid type in dbt block content')
}

export { match, translate }
