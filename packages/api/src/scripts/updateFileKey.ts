import '../core/block/init'
import 'reflect-metadata'

import _ from 'lodash'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../clients/db/orm'
import BlockEntity from '../entities/block'
import { BlockType } from '../types/block'

const host = 'https://mosaic-uploads.oss-cn-hangzhou.aliyuncs.com/'
async function main() {
  await createDatabaseCon()
  const imageBlocks = await getRepository(BlockEntity)
    .createQueryBuilder('blocks')
    .where('blocks.type = :type', { type: BlockType.IMAGE })
    .getMany()

  const qs = _(imageBlocks)
    .map((q) => {
      const fileKey = _(q.content).get('fileKey')
      _.set(q, 'content.fileKey', host + fileKey)
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
