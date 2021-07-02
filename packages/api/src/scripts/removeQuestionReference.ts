import '../core/block/init'
import 'reflect-metadata'

import _ from 'lodash'
import { getRepository, In } from 'typeorm'

import { createDatabaseCon } from '../clients/db/orm'
import BlockEntity from '../entities/block'
import { BlockType } from '../types/block'

async function main() {
  await createDatabaseCon()
  const refQuestions = await getRepository(BlockEntity)
    .createQueryBuilder('blocks')
    .where('blocks.type = :type', { type: BlockType.QUESTION })
    .andWhere("blocks.content->'referredFromId' IS NOT NULL")
    .getMany()

  const originalSnapshotIds = _(
    await getRepository(BlockEntity).find({
      id: In(_(refQuestions).map('content.referredFromId').compact().uniq().value()),
    }),
  )
    .keyBy('id')
    .mapValues('content.snapshotId')
    .value()

  const qs = _(refQuestions)
    .map((q) => {
      const refId = _(q.content).get('referredFromId')
      _.set(q, 'content.referredFromId', undefined)
      _.set(q, 'content.snapshotId', originalSnapshotIds[refId])
      _.set(q, 'content.sql', `select * from {{${refId}}}`)
      return q
    })
    .value()

  await getRepository(BlockEntity).save(qs)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
