import _ from 'lodash'
import { createQueryBuilder, EntityManager, getRepository } from 'typeorm'
import { LinkEntity } from '../../entities/link'

import { LinkType } from '../../types/link'
import { isLinkToken, LinkToken, tag, Token } from '../../types/token'
import { cascadeUpdateBlocks } from '../block'
import { Entity } from '../common'

/**
 * inline reference token: ['any string', [['r', 's/b/q', 'nanoid']]]
 * @param input: [['any string', [['r', 's/b/q', 'nanoid']]]]
 */
export function getLinksFromToken(input: Token[]): Link[] {
  try {
    return (_(input).filter((x) => isLinkToken(x)) as _.Collection<LinkToken>).reduce(
      (acc: Link[], token: LinkToken) => {
        // token[1] => [['r', 's' ,'sid']]
        // ref => ['r', 's', 'sid']
        const ref: string[] = _(token[1]).find((mark: any[]) => mark[0] === tag.Reference) ?? []
        if (_(ref).isEmpty() || ref.length < 3) {
          return acc
        }
        const type = ref[1]
        switch (type) {
          case tag.Story:
          case tag.Block:
            acc.push({
              blockId: ref[2],
              type: LinkType.BLOCK,
            })
            break
          default:
            console.error('unknown link type', type)
        }
        return acc
      },
      [],
    )
  } catch (e) {
    return []
  }
}

export async function updateSourceLinkAlive(
  manager: EntityManager,
  sourceBlockId: string,
  sourceAlive = true,
) {
  const updateClause = createQueryBuilder(LinkEntity, 'links').update().set({ sourceAlive })

  await cascadeUpdateBlocks(manager, sourceBlockId, updateClause, 'sourceBlockId')
}

export async function updateTargetLinkAlive(
  manager: EntityManager,
  targetBlockId: string,
  targetAlive = true,
) {
  const updateClause = createQueryBuilder(LinkEntity, 'links').update().set({ targetAlive })

  await cascadeUpdateBlocks(manager, targetBlockId, updateClause, 'targetBlockId')
}

export async function loadLinkEntitiesByStoryIds(
  ids: string[],
  options: { loadAll?: boolean; manager?: EntityManager } = {},
) {
  const { loadAll, manager } = options
  const subQuery = loadAll ? '' : 'AND links.targetAlive = true AND links.sourceAlive = true'
  return (manager ? manager.getRepository(LinkEntity) : getRepository(LinkEntity))
    .createQueryBuilder('links')
    .innerJoinAndSelect('links.sourceBlock', 'sourceBlock')
    .innerJoinAndSelect('links.targetBlock', 'targetBlock')
    .where(`sourceBlock.storyId IN (:...ids) ${subQuery}`, { ids })
    .orWhere(`targetBlock.storyId IN (:...ids) ${subQuery}`, { ids })
    .getMany()
}

export async function loadLinkEntitiesByBlockIds(
  ids: string[],
  options: { loadAll?: boolean; manager?: EntityManager } = {},
) {
  const { loadAll, manager } = options
  const subQuery = loadAll ? '' : 'AND links.targetAlive = true AND links.sourceAlive = true'
  return (manager ? manager.getRepository(LinkEntity) : getRepository(LinkEntity))
    .createQueryBuilder('links')
    .innerJoinAndSelect('links.sourceBlock', 'sourceBlock')
    .innerJoinAndSelect('links.targetBlock', 'targetBlock')
    .where(`links.sourceBlockId IN (:...ids) ${subQuery}`, { ids })
    .orWhere(`links.targetBlockId IN (:...ids) ${subQuery}`, { ids })
    .getMany()
}

export type LinkedEntities = { questions: Entity[]; stories: Entity[]; blocks: Entity[] }

export type Link = {
  blockId: string
  type: LinkType
}

export type LinkWithStoryId = {
  storyId: string
  blockId: string
  type: LinkType
}
