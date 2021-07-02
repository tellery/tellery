import bluebird from 'bluebird'
import '../core/block/init'
import 'reflect-metadata'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../clients/db/orm'
import { Block } from '../core/block'
import BlockEntity from '../entities/block'

async function main() {
  await createDatabaseCon()

  const blocks = await getRepository(BlockEntity).find()

  return bluebird.map(
    blocks,
    async (s) => {
      const b = Block.fromEntity(s)
      const model = b.toModel(s.workspaceId)

      return getRepository(BlockEntity)
        .createQueryBuilder()
        .update()
        .set({ searchableText: model.searchableText, updatedAt: b.updatedAt })
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
