import bluebird from 'bluebird'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection, getRepository } from 'typeorm'
import { IConnectorManager } from '../clients/connector/interface'
import { Block, cascadeLoadBlocksByLink } from '../core/block'
import { QuestionBlock } from '../core/block/question'
import { getIPermission, IPermission } from '../core/permission'
import BlockEntity from '../entities/block'
import { BlockParentType, BlockType } from '../types/block'
import { LinkType } from '../types/link'
import { canUpdateWorkspaceData } from '../utils/permission'

export class DbtService {
  private permission: IPermission

  constructor(p: IPermission) {
    this.permission = p
  }

  async createRepo(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
  ): Promise<string> {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    return connectorManager.createRepo(profile)
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
    const exportedQuestionBlocks = await this.loadAllDbtBlockDescandant(workspaceId)
    // TODO: parse transclusion into correct dbt ref and create correct dbt name
    await connectorManager.pushRepo(profile, exportedQuestionBlocks)
  }

  async refreshWorkspace(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
  ) {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    await connectorManager.refreshWorkspace()
  }

  async updateDbtBlocks(
    connectorManager: IConnectorManager,
    operatorId: string,
    workspaceId: string,
    profile: string,
  ) {
    await canUpdateWorkspaceData(this.permission, operatorId, workspaceId)
    const [metadata, currentDbtBlocks] = await Promise.all([
      connectorManager.listDbtBlocks(profile),
      this.listCurrentDbtBlocks(workspaceId),
    ])

    const currentDbtBlocksByName = _.keyBy(
      currentDbtBlocks,
      (b) => _.get(b, 'content.name') as string,
    )
    const metadataByName = _.keyBy(metadata, 'name')

    const oldNames = _(currentDbtBlocksByName).keys()
    const newNames = _(metadataByName).keys()

    const deletedBlockIds = oldNames
      .difference(newNames.value())
      .map((name) => currentDbtBlocksByName[name].id)
      .value()

    const createdBlocks = newNames.difference(oldNames.value()).map((name) => {
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
          return block
        }
      })
      .compact()
      .value()

    await getConnection().transaction(async (t) => {
      await bluebird.all([
        t.getRepository(BlockEntity).update(deletedBlockIds, { alive: false }),
        t.getRepository(BlockEntity).insert(createdBlocks),
      ])
      await bluebird.map(modifiedBlocks, async (b) => b.save(), { concurrency: 10 })
    })
  }

  private async listCurrentDbtBlocks(workspaceId: string) {
    const models = await getRepository(BlockEntity).find({
      type: BlockType.DBT,
      workspaceId: workspaceId,
      alive: true,
    })
    return _(models).value()
  }

  private async loadAllDbtBlockDescandant(workspaceId: string): Promise<QuestionBlock[]> {
    const ids = _(await this.listCurrentDbtBlocks(workspaceId))
      .map('id')
      .value()
    return _(await cascadeLoadBlocksByLink(ids, 'backward', LinkType.QUESTION))
      .map((b) => QuestionBlock.fromEntitySafely(b))
      .value() as QuestionBlock[]
  }
}

const service = new DbtService(getIPermission())
export default service
