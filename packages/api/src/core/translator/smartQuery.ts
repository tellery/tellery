import _ from 'lodash'
import { getRepository } from 'typeorm'
import BlockEntity from '../../entities/block'
import { NotFoundError } from '../../error/error'
import { BlockType } from '../../types/block'
import {
  QueryBuilderSpec,
  QueryBuilderTranslation,
  SelectBuilder,
  SmartQueryExecution,
} from '../../types/queryBuilder'
import { Block } from '../block'
import { SmartQueryBlock } from '../block/smartQuery'
import { QueryBuilderBlock } from '../block/queryBuilder'

function match(block: Block): boolean {
  return block.getType() === BlockType.SMART_QUERY
}

/**
 * assemble sql by given context
 */
async function translate(
  block: Block,
  opts: { queryBuilderSpec: QueryBuilderSpec },
): Promise<string> {
  const { queryBuilderSpec } = opts
  const explorationBlock = block as SmartQueryBlock
  return translateSmartQuery(explorationBlock.getContent(), queryBuilderSpec)
}

async function translateSmartQuery(
  smartQuery: SmartQueryExecution,
  queryBuilderSpec: QueryBuilderSpec,
): Promise<string> {
  const { identifier, aggregation, bucketization } = queryBuilderSpec
  const { queryBuilderId, metricIds, dimensions: dimensionsRaw } = smartQuery

  const queryBuilderBlockEntity = await getRepository(BlockEntity).findOne(queryBuilderId)
  if (!queryBuilderBlockEntity) {
    throw NotFoundError.resourceNotFound(`Query Builder block ${queryBuilderId}`)
  }
  const queryBuilderBlock = Block.fromEntity(queryBuilderBlockEntity) as QueryBuilderBlock

  const { metrics: metricsById } = queryBuilderBlock.getContent()
  if (!metricsById && metricIds.length > 0) {
    throw NotFoundError.resourceNotFound(`Query Builder Block ${queryBuilderId} / metrics`)
  }

  // ignore non-existed measures
  const measures = _(metricIds)
    .map((id) => metricsById?.[id])
    .compact()
    .map((it) => assembleSelectField(it, aggregation, identifier))
    .value()

  const dimensions = dimensionsRaw.map((it) => assembleSelectField(it, bucketization, identifier))

  const selectClause = [...dimensions, ...measures].join(', ') || '*'
  const groupByClause =
    dimensions && dimensions.length > 0
      ? `GROUP BY ${_.range(1, dimensions.length + 1).join(', ')}`
      : ''
  const datetimeDimensions = dimensionsRaw
    .map((dim, index) => ({ index, dtype: _.get(dim, 'fieldType') }))
    .filter(({ dtype }) => ['DATE', 'TIME', 'TIMESTAMP'].includes(dtype))
    .map(({ index }) => index + 1)
  const orderByClause =
    datetimeDimensions.length > 0 ? `ORDER BY ${datetimeDimensions.join(', ')}` : ''

  return `SELECT ${selectClause}
FROM {{ ${queryBuilderId} }}
${groupByClause}
${orderByClause}`
}

function assembleSelectField(
  builder: SelectBuilder,
  translation: QueryBuilderTranslation,
  quote: string,
): string {
  const { name } = builder
  const quotedName = quote.replace('?', name)
  if ('rawSql' in builder) {
    return `${builder.rawSql} AS ${quotedName}`
  }
  const { fieldName, fieldType, func, args } = builder
  const quotedFieldName = quote.replace('?', fieldName)
  if (func) {
    const translatedName = [quotedFieldName, ...(args ?? [])].reduce(
      (acc, replacer) => acc.replace('?', replacer),
      translation.get(fieldType)?.get(func) ?? '?',
    )
    return `${translatedName} AS ${quotedName}`
  }
  return `${quotedFieldName} as ${quotedName}`
}

export { match, translate, translateSmartQuery }
