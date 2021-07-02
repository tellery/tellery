import '../core/block/init'
import 'reflect-metadata'

import _ from 'lodash'
import { getRepository, In } from 'typeorm'

import { createDatabaseCon } from '../clients/db/orm'
import BlockEntity from '../entities/block'
import { BlockType } from '../types/block'

async function main() {
  await createDatabaseCon()

  const questions = _(
    await getRepository(BlockEntity).find({
      where: { type: BlockType.QUESTION },
    }),
  )
    .filter((q) => !!_(q.content).get('referredFromId'))
    .value()

  const rids = _(questions).map('content.referredFromId').compact().uniq().value()
  const existBlockIds = _(
    await getRepository(BlockEntity).find({
      select: ['id'],
      where: { id: In(rids) },
    }),
  )
    .map('id')
    .value()

  const notExistBlockIds = _.difference(rids, existBlockIds)

  const invalidQuestions = _(questions)
    .filter((q) => notExistBlockIds.includes(_(q.content).get('referredFromId')))
    .value()
  const qs = _(invalidQuestions)
    .map((q) => {
      _.set(q, 'content.referredFromId', undefined)
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
