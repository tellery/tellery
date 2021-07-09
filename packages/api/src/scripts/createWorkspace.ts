import 'reflect-metadata'

import { getRepository } from 'typeorm'
import config from 'config'

import { FakeManager } from '../clients/connector/fake'
import { createDatabaseCon } from '../clients/db/orm'
import { UserEntity } from '../entities/user'
import { WorkspaceEntity } from '../entities/workspace'
import connectorService from '../services/connector'
import workspaceService from '../services/workspace'
import { AuthType } from '../types/auth'
import { getIConnectorManagerFromDB } from '../clients/connector'

async function main() {
  await createDatabaseCon()

  const w = await getRepository(WorkspaceEntity).findOne()
  if (w) {
    throw new Error('already exist workspaces')
  }
  const superUser = await getRepository(UserEntity).findOne()
  if (!superUser) {
    throw new Error('there is no user here, please create a user first')
  }
  const workspaceName = process.env.CREATE_WORKSPACE_NAME || 'Default'
  const connectorUrl = process.env.CREATE_CONNECTOR_URL || 'localhost:50051'
  const workspace = await workspaceService.create(superUser.id, workspaceName)
  const connectorId = await connectorService.addConnector(
    () => new FakeManager(),
    superUser.id,
    workspace.id,
    {
      url: connectorUrl,
      authType: AuthType.NONE,
      authData: {},
      name: 'default',
    },
  )

  const newConnector = await getIConnectorManagerFromDB(connectorId)
  await newConnector.upsertProfile({
    type: 'Postgres',
    name: 'default',
    auth: {
      username: config.get<string>('postgres.username'),
      password: config.get<string>('postgres.password'),
    },
    configs: {
      Endpoint: config.get<string>('postgres.host'),
      Port: config.get<number>('postgres.port').toString(),
      Database: 'sample',
    },
  })

  return workspaceService.updateWorkspacePreferences(superUser.id, workspace.id, {
    connectorId: connectorId,
    profile: 'default',
    dbImportsTo: 'tellery',
  })
}

main()
  .then(() => {
    console.log('create workspace successfully')
    process.exit(0)
  })
  .catch((err) => {
    console.log('create workspace failed', err)
    // not throw error
    process.exit(1)
  })
