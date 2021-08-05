import bluebird from 'bluebird'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection, getRepository, In } from 'typeorm'
import { IConnectorManager } from '../clients/connector/interface'
import { Block, cascadeLoadBlocksByLink } from '../core/block'
import { DbtBlock } from '../core/block/dbt'
import { QuestionBlock } from '../core/block/question'
import { getIPermission, IPermission } from '../core/permission'
import { extractPartialQueries } from '../core/translator'
import BlockEntity from '../entities/block'
import { LinkEntity } from '../entities/link'
import { BlockParentType, BlockType } from '../types/block'
import { DbtMetadata, ExportedBlockMetadata } from '../types/dbt'
import { LinkType } from '../types/link'
import { canUpdateWorkspaceData } from '../utils/permission'

export class DbtService {
  private permission: IPermission

  constructor(p: IPermission) {
    this.permission = p
  }

  async generateKeyPair(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
  ): Promise<string> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    return connectorManager.generateKeyPair(profile)
  }

  async pullRepo(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
  ) {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    return connectorManager.pullRepo(profile)
  }

  async pushRepo(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
  ) {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    const exportedQuestionBlocks = await this.loadAllDbtBlockDescendent(workspaceId)
    await connectorManager.pushRepo(profile, exportedQuestionBlocks)
  }

  async updateDbtBlocks(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
  ) {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)

    const metadata = await connectorManager.listDbtBlocks(profile)
    console.log('metadata: ', metadata)
    await this.updateDbtBlocksByMetadata(workspaceId, operatorId, metadata)
  }

  async listCurrentDbtBlocks(workspaceId: string) {
    const models = await getRepository(BlockEntity).find({
      type: BlockType.DBT,
      workspaceId: workspaceId,
      alive: true,
    })
    return _(models).value()
  }

  /**
   * Recursively load all descendent of dbt blocks
   * that is, for a question block, if any of its ancestor (of transclusion) linked from dbt blocks, it should appear here.
   * exposes only for test
   */
  async loadAllDbtBlockDescendent(workspaceId: string): Promise<ExportedBlockMetadata[]> {
    const dbtBlocks = _(await this.listCurrentDbtBlocks(workspaceId))
      .map(Block.fromEntity)
      .value()

    if (dbtBlocks.length === 0) {
      return []
    }

    const blocks = _(
      await cascadeLoadBlocksByLink(_(dbtBlocks).map('id').value(), 'backward', LinkType.QUESTION),
    )
      .map((b) => QuestionBlock.fromEntitySafely(b))
      .compact()
      .value() as QuestionBlock[]

    // load story blocks for fulfilling name
    const storyIds = _(blocks).map('storyId').uniq().value()
    const models = await getRepository(BlockEntity).find({ id: In(storyIds) })
    const storiesByKey = _(models).map(Block.fromEntitySafely).keyBy('id').value()

    const totalBlocksByKey = _([...dbtBlocks, ...blocks])
      .keyBy('id')
      .value()

    // translate name first, it would be used later for dbt reference naming
    const translatedDbtNames = _(blocks)
      .keyBy('id')
      .mapValues((b) => {
        const storyTitle = storiesByKey[b.storyId]?.getPlainText()
        const blockTitle = b.getPlainText() ?? b.id
        return (storyTitle ? `${storyTitle}-${blockTitle}` : blockTitle)
          .replace(' ', '_')
          .toLowerCase()
      })
      .value()

    return _(blocks)
      .map((b) => {
        const originalSql = b.getSql()
        const partialQueries = extractPartialQueries(originalSql)

        // convert transclusion to dbt reference
        const translatedSql = _.zip(
          [{ endIndex: 0 }, ...partialQueries],
          [...partialQueries, { startIndex: originalSql.length, blockId: undefined }],
        )
          .map(([i, j]) => ({
            start: i!.endIndex,
            end: j!.startIndex,
            blockId: j!.blockId,
          }))
          .map(({ start, end, blockId }) => {
            // end
            if (!blockId) {
              return originalSql.substring(start, end)
            }
            const refBlock = totalBlocksByKey[blockId]
            let name: string
            if (!refBlock) {
              name = `tellery_transclusion.${blockId}`
            } else {
              if (refBlock.getType() === BlockType.DBT) {
                name = (refBlock as DbtBlock).getRef()
              } else {
                name = `{{ ref('${translatedDbtNames[refBlock.id]}') }}`
              }
            }
            return originalSql.substring(start, end) + name
          })
          .join('')
        return {
          name: translatedDbtNames[b.id],
          sql: translatedSql,
        }
      })
      .value()
  }

  /**
   * Update current dbt blocks by given metadata (distinct by uniqId)
   * if will create new dbt blocks, update current dbt blocks if the content has changed, and remove dbt blocks if its uniq id does not appear in given metadata
   * exposes only for test
   *
   * @param workspaceId
   * @param operatorId
   * @param metadata
   */
  async updateDbtBlocksByMetadata(
    workspaceId: string,
    operatorId: string,
    metadata: DbtMetadata[],
  ) {
    const currentDbtBlocksByName = _.keyBy(
      await this.listCurrentDbtBlocks(workspaceId),
      (b) => _.get(b, 'content.name') as string,
    )
    const metadataByName = _.keyBy(metadata, 'name')

    const oldNames = _(currentDbtBlocksByName).keys()
    const newNames = _(metadataByName).keys()

    const deletedBlockIds = oldNames
      .difference(newNames.value())
      .map((name) => currentDbtBlocksByName[name].id)
      .value()

    const createdBlocks = newNames
      .difference(oldNames.value())
      .map((name) => {
        const rawMetadata = metadataByName[name]
        return Block.fromArgs({
          id: nanoid(),
          type: BlockType.DBT,
          parentId: workspaceId,
          parentTable: BlockParentType.WORKSPACE,
          storyId: workspaceId,
          content: {
            ...rawMetadata,
            title: [[`dbt:${rawMetadata.name}`]],
          },
          alive: true,
          version: 0,
          format: {},
          children: [],
          createdById: operatorId,
          lastEditedById: operatorId,
        }).toModel(workspaceId)
      })
      .value()

    const modifiedBlocks = newNames
      .intersection(oldNames.value())
      .map((name) => {
        const block = currentDbtBlocksByName[name]
        const newMeta = metadataByName[name]
        const oldMeta = _.get(block, 'content')
        if (_.isEqual(newMeta, oldMeta)) {
          return null
        } else {
          _.set(block, 'content', newMeta)
          _.set(block, 'lastEditedById', operatorId)
          return block
        }
      })
      .compact()
      .value()

    await getConnection().transaction(async (t) => {
      if (deletedBlockIds.length > 0) {
        await Promise.all([
          t.getRepository(BlockEntity).update(deletedBlockIds, { alive: false }),
          t
            .getRepository(LinkEntity)
            .update({ targetBlockId: In(deletedBlockIds) }, { targetAlive: false }),
        ])
      }
      if (createdBlocks.length > 0) {
        await t.getRepository(BlockEntity).insert(createdBlocks)
      }
      await bluebird.map(modifiedBlocks, async (b) => b.save(), { concurrency: 10 })
    })
  }
}

const service = new DbtService(getIPermission())
export default service
