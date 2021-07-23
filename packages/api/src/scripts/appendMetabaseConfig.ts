import 'reflect-metadata'

import _ from 'lodash'
import { getRepository } from 'typeorm'

import { createDatabaseCon } from '../clients/db/orm'
import { ThirdPartyConfigurationEntity } from '../entities/thirdParty'

async function main() {
  await createDatabaseCon()
  const host = process.env.METABASE_HOST
  const secretKey = process.env.METABASE_SECRET_KEY
  if (!host || !secretKey) {
    throw new Error('missing METABASE_HOST or METABASE_SECRET_KEY')
  }

  let tpc = await getRepository(ThirdPartyConfigurationEntity).findOne({ type: 'metabase' })
  if (!tpc) {
    tpc = new ThirdPartyConfigurationEntity()
    tpc.type = 'metabase'
    tpc.config = { secretMap: {} }
  }

  _.set(tpc, ['config', 'secretMap', host], secretKey)

  await tpc.save()
}

main()
  .then(() => {
    console.log('append metabase configuration successfully')
    process.exit(0)
  })
  .catch((err) => {
    console.log('append metabase configuration failed', err)
    process.exit(1)
  })
