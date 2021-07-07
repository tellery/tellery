import 'reflect-metadata'
import { getConnection, getRepository } from 'typeorm'

import { createDatabaseCon } from '../clients/db/orm'
import { UserEntity } from '../entities/user'
import { WorkspaceEntity } from '../entities/workspace'
import workspaceService from '../services/workspace'

async function main() {
  await createDatabaseCon()

  return getConnection().transaction(async (t) => {
    const workspace = await getRepository(WorkspaceEntity).findOne()
    if (workspace) {
      throw new Error('already exist workspaces')
    }
    const superUser = await getRepository(UserEntity).findOne()
    if (!superUser) {
      throw new Error('there is no user here, please create a user first')
    }
    const workspaceName = process.env.CREATE_WORKSPACE_NAME || 'Default'
    return workspaceService.create(superUser.id, workspaceName)
  })
}

main()
  .then(() => {
    console.log('create workspace successfully')
    process.exit(0)
  })
  .catch((err) => {
    console.log('create workspace failed', err)
    process.exit(1)
  })
