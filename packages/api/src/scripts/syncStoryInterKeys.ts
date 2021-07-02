import bluebird from 'bluebird'
import '../core/block/init'
import 'reflect-metadata'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../clients/db/orm'
import { Block } from '../core/block'
import BlockEntity from '../entities/block'
import { BlockType } from '../types/block'
import { md5 } from '../utils/helper'

async function main() {
  await createDatabaseCon()

  const stories = await getRepository(BlockEntity).find({ type: BlockType.STORY, alive: true })

  return bluebird.map(
    stories,
    async (s) => {
      const b = Block.fromEntity(s)
      const title = b.getPlainText() ?? ''

      const interKey = md5(title)
      return getRepository(BlockEntity)
        .createQueryBuilder()
        .update()
        .set({ interKey, updatedAt: b.updatedAt })
        .where('id = :id', { id: b.id })
        .execute()
    },
    { concurrency: 5 },
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
