import _ from 'lodash'
import { getRepository } from 'typeorm'
import BlockEntity from '../../entities/block'
import { NotFoundError } from '../../error/error'
import { BlockType } from '../../types/block'
import {
  ExplorationExecution,
  MetricSpec,
  MetricTranslation,
  SelectBuilder,
} from '../../types/metric'
import { Block } from '../block'
import { ExplorationBlock } from '../block/exploration'
import { MetricBlock } from '../block/metric'

function match(block: Block): boolean {
  return block.getType() === BlockType.EXPLORATION
}

/**
 * assemble sql by given context
 */
async function translate(block: Block, opts: { metricSpec: MetricSpec }): Promise<string> {
  const { metricSpec } = opts
  const explorationBlock = block as ExplorationBlock
  return translateExplorationToSql(explorationBlock.getContent(), metricSpec)
}

async function translateExplorationToSql(
  exploration: ExplorationExecution,
  metricSpec: MetricSpec,
): Promise<string> {
  const { metricId, measurementIds, dimensions: dimensionsRaw } = exploration

  const metricBlockEntity = await getRepository(BlockEntity).findOne(metricId)
  if (!metricBlockEntity) {
    throw NotFoundError.resourceNotFound(`Metric block ${metricId}`)
  }
  const metricBlock = Block.fromEntity(metricBlockEntity) as MetricBlock

  const { measurements: measurementsById } = metricBlock.getContent()
  if (!measurementsById && measurementIds.length > 0) {
    throw NotFoundError.resourceNotFound(`Metric block ${metricId} / measures`)
  }

  // ignore non-existed measures
  const measures = _(measurementIds)
    .map((id) => measurementsById?.[id])
    .compact()
    .map((it) => assembleSelectField(it, metricSpec.aggregation, metricSpec.identifier))
    .value()

  const dimensions = dimensionsRaw.map((it) =>
    assembleSelectField(it, metricSpec.bucketization, metricSpec.identifier),
  )

  return `SELECT ${dimensions.join(', ')}, ${measures.join(', ')}
FROM {{ ${metricId} }}
GROUP BY ${_.range(1, dimensions.length + 1).join(', ')}`
}

function assembleSelectField(
  builder: SelectBuilder,
  translation: MetricTranslation,
  quote: string,
): string {
  const { name } = builder
  const quotedName = quote.replace('?', name)
  if ('rawSql' in builder) {
    return `${builder.rawSql} AS ${quotedName}`
  }
  const { fieldName, type, func, args } = builder
  const quotedFieldName = quote.replace('?', fieldName)
  if (func) {
    const translatedName = [quotedFieldName, ...(args ?? [])].reduce(
      (acc, replacer) => acc.replace('?', replacer),
      translation.get(type)?.get(func) ?? '?',
    )
    return `${translatedName} AS ${quotedName}`
  }
  return `${quotedFieldName} as ${quotedName}`
}

export { match, translate, translateExplorationToSql }
