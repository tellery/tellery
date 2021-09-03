import 'reflect-metadata'

import { getRepository } from 'typeorm'
import { nanoid } from 'nanoid'
import * as _ from 'lodash'

import { createDatabaseCon } from '../clients/db/orm'
import { UserEntity } from '../entities/user'
import { WorkspaceEntity } from '../entities/workspace'
import BlockEntity from '../entities/block'
import { BlockParentType, BlockType } from '../types/block'
import { WorkspaceViewEntity } from '../entities/workspaceView'
import { SnapshotEntity } from '../entities/snapshot'
import { readonlyForWorkspace } from '../types/permission'

async function main() {
  await createDatabaseCon()

  const b = await getRepository(BlockEntity).findOne()
  if (b) {
    throw new Error('already exist blocks')
  }

  const superUser = await getRepository(UserEntity).findOne()
  if (!superUser) {
    throw new Error('there is no user here, please create a user first')
  }

  const workspace = await getRepository(WorkspaceEntity).findOne()
  if (!workspace) {
    throw new Error('there is no workspace here, please create a workspace first')
  }

  const story = new BlockEntity()
  const storyId = nanoid()

  const question = new BlockEntity()
  const questionId = nanoid()

  const visualization = new BlockEntity()
  const visualizationId = nanoid()

  const snapshot = new SnapshotEntity()
  const snapshotId = nanoid()

  // create a workspace view (for pinned list)
  const workspaceView = new WorkspaceViewEntity()

  Object.assign(story, {
    id: storyId,
    workspaceId: workspace.id,
    interKey: storyId,
    parentId: workspace.id,
    parentTable: BlockParentType.WORKSPACE,
    searchableText: 'Welcome to Tellery',
    storyId,
    content: {
      title: [['Welcome to Tellery']],
    },
    type: BlockType.STORY,
    children: [visualizationId],
    resources: [questionId],
    permissions: readonlyForWorkspace(superUser.id),
    createdById: superUser.id,
    lastEditedById: superUser.id,
    alive: true,
  })

  Object.assign(question, {
    id: questionId,
    workspaceId: workspace.id,
    interKey: questionId,
    parentId: story.id,
    parentTable: BlockParentType.BLOCK,
    searchableText: 'Iris sample data',
    storyId,
    content: {
      title: [['Iris sample data']],
      sql: 'select * from iris_data',
      snapshotId,
    },
    permissions: readonlyForWorkspace(superUser.id),
    createdById: superUser.id,
    lastEditedById: superUser.id,
    type: BlockType.SQL,
    children: [],
    resources: [],
    alive: true,
  })

  Object.assign(visualization, {
    id: visualizationId,
    workspaceId: workspace.id,
    interKey: visualizationId,
    parentId: story.id,
    parentTable: BlockParentType.BLOCK,
    storyId,
    content: {
      queryId: questionId,
      visualization: {
        keys: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'variety'],
        type: 'Pie',
        slices: [
          { key: 'Virginica', color: 0, title: 'Virginica' },
          { key: 'Versicolor', color: 1, title: 'Versicolor' },
          { key: 'Setosa', color: 2, title: 'Setosa' },
        ],
        dimension: 'variety',
        showTotal: true,
        showLegend: true,
        measurement: 'sepal_length',
        minPercentage: 1,
      },
    },
    permissions: readonlyForWorkspace(superUser.id),
    createdById: superUser.id,
    lastEditedById: superUser.id,
    format: { width: 0.7, aspectRatio: 1.7777777777777777 },
    type: BlockType.VISUALIZATION,
    children: [],
    resources: [],
    alive: true,
  })

  Object.assign(snapshot, {
    id: snapshotId,
    questionId,
    sql: _.get(question, 'content.sql'),
    data: {
      records: [
        [5.1, 3.5, 1.4, 0.2, 'Setosa'],
        [4.9, 3, 1.4, 0.2, 'Setosa'],
        [4.7, 3.2, 1.3, 0.2, 'Setosa'],
        [4.6, 3.1, 1.5, 0.2, 'Setosa'],
        [5, 3.6, 1.4, 0.2, 'Setosa'],
        [5.4, 3.9, 1.7, 0.4, 'Setosa'],
        [4.6, 3.4, 1.4, 0.3, 'Setosa'],
        [5, 3.4, 1.5, 0.2, 'Setosa'],
        [4.4, 2.9, 1.4, 0.2, 'Setosa'],
        [4.9, 3.1, 1.5, 0.1, 'Setosa'],
        [5.4, 3.7, 1.5, 0.2, 'Setosa'],
        [4.8, 3.4, 1.6, 0.2, 'Setosa'],
        [4.8, 3, 1.4, 0.1, 'Setosa'],
        [4.3, 3, 1.1, 0.1, 'Setosa'],
        [5.8, 4, 1.2, 0.2, 'Setosa'],
        [5.7, 4.4, 1.5, 0.4, 'Setosa'],
        [5.4, 3.9, 1.3, 0.4, 'Setosa'],
        [5.1, 3.5, 1.4, 0.3, 'Setosa'],
        [5.7, 3.8, 1.7, 0.3, 'Setosa'],
        [5.1, 3.8, 1.5, 0.3, 'Setosa'],
        [5.4, 3.4, 1.7, 0.2, 'Setosa'],
        [5.1, 3.7, 1.5, 0.4, 'Setosa'],
        [4.6, 3.6, 1, 0.2, 'Setosa'],
        [5.1, 3.3, 1.7, 0.5, 'Setosa'],
        [4.8, 3.4, 1.9, 0.2, 'Setosa'],
        [5, 3, 1.6, 0.2, 'Setosa'],
        [5, 3.4, 1.6, 0.4, 'Setosa'],
        [5.2, 3.5, 1.5, 0.2, 'Setosa'],
        [5.2, 3.4, 1.4, 0.2, 'Setosa'],
        [4.7, 3.2, 1.6, 0.2, 'Setosa'],
        [4.8, 3.1, 1.6, 0.2, 'Setosa'],
        [5.4, 3.4, 1.5, 0.4, 'Setosa'],
        [5.2, 4.1, 1.5, 0.1, 'Setosa'],
        [5.5, 4.2, 1.4, 0.2, 'Setosa'],
        [4.9, 3.1, 1.5, 0.2, 'Setosa'],
        [5, 3.2, 1.2, 0.2, 'Setosa'],
        [5.5, 3.5, 1.3, 0.2, 'Setosa'],
        [4.9, 3.6, 1.4, 0.1, 'Setosa'],
        [4.4, 3, 1.3, 0.2, 'Setosa'],
        [5.1, 3.4, 1.5, 0.2, 'Setosa'],
        [5, 3.5, 1.3, 0.3, 'Setosa'],
        [4.5, 2.3, 1.3, 0.3, 'Setosa'],
        [4.4, 3.2, 1.3, 0.2, 'Setosa'],
        [5, 3.5, 1.6, 0.6, 'Setosa'],
        [5.1, 3.8, 1.9, 0.4, 'Setosa'],
        [4.8, 3, 1.4, 0.3, 'Setosa'],
        [5.1, 3.8, 1.6, 0.2, 'Setosa'],
        [4.6, 3.2, 1.4, 0.2, 'Setosa'],
        [5.3, 3.7, 1.5, 0.2, 'Setosa'],
        [5, 3.3, 1.4, 0.2, 'Setosa'],
        [7, 3.2, 4.7, 1.4, 'Versicolor'],
        [6.4, 3.2, 4.5, 1.5, 'Versicolor'],
        [6.9, 3.1, 4.9, 1.5, 'Versicolor'],
        [5.5, 2.3, 4, 1.3, 'Versicolor'],
        [6.5, 2.8, 4.6, 1.5, 'Versicolor'],
        [5.7, 2.8, 4.5, 1.3, 'Versicolor'],
        [6.3, 3.3, 4.7, 1.6, 'Versicolor'],
        [4.9, 2.4, 3.3, 1, 'Versicolor'],
        [6.6, 2.9, 4.6, 1.3, 'Versicolor'],
        [5.2, 2.7, 3.9, 1.4, 'Versicolor'],
        [5, 2, 3.5, 1, 'Versicolor'],
        [5.9, 3, 4.2, 1.5, 'Versicolor'],
        [6, 2.2, 4, 1, 'Versicolor'],
        [6.1, 2.9, 4.7, 1.4, 'Versicolor'],
        [5.6, 2.9, 3.6, 1.3, 'Versicolor'],
        [6.7, 3.1, 4.4, 1.4, 'Versicolor'],
        [5.6, 3, 4.5, 1.5, 'Versicolor'],
        [5.8, 2.7, 4.1, 1, 'Versicolor'],
        [6.2, 2.2, 4.5, 1.5, 'Versicolor'],
        [5.6, 2.5, 3.9, 1.1, 'Versicolor'],
        [5.9, 3.2, 4.8, 1.8, 'Versicolor'],
        [6.1, 2.8, 4, 1.3, 'Versicolor'],
        [6.3, 2.5, 4.9, 1.5, 'Versicolor'],
        [6.1, 2.8, 4.7, 1.2, 'Versicolor'],
        [6.4, 2.9, 4.3, 1.3, 'Versicolor'],
        [6.6, 3, 4.4, 1.4, 'Versicolor'],
        [6.8, 2.8, 4.8, 1.4, 'Versicolor'],
        [6.7, 3, 5, 1.7, 'Versicolor'],
        [6, 2.9, 4.5, 1.5, 'Versicolor'],
        [5.7, 2.6, 3.5, 1, 'Versicolor'],
        [5.5, 2.4, 3.8, 1.1, 'Versicolor'],
        [5.5, 2.4, 3.7, 1, 'Versicolor'],
        [5.8, 2.7, 3.9, 1.2, 'Versicolor'],
        [6, 2.7, 5.1, 1.6, 'Versicolor'],
        [5.4, 3, 4.5, 1.5, 'Versicolor'],
        [6, 3.4, 4.5, 1.6, 'Versicolor'],
        [6.7, 3.1, 4.7, 1.5, 'Versicolor'],
        [6.3, 2.3, 4.4, 1.3, 'Versicolor'],
        [5.6, 3, 4.1, 1.3, 'Versicolor'],
        [5.5, 2.5, 4, 1.3, 'Versicolor'],
        [5.5, 2.6, 4.4, 1.2, 'Versicolor'],
        [6.1, 3, 4.6, 1.4, 'Versicolor'],
        [5.8, 2.6, 4, 1.2, 'Versicolor'],
        [5, 2.3, 3.3, 1, 'Versicolor'],
        [5.6, 2.7, 4.2, 1.3, 'Versicolor'],
        [5.7, 3, 4.2, 1.2, 'Versicolor'],
        [5.7, 2.9, 4.2, 1.3, 'Versicolor'],
        [6.2, 2.9, 4.3, 1.3, 'Versicolor'],
        [5.1, 2.5, 3, 1.1, 'Versicolor'],
        [5.7, 2.8, 4.1, 1.3, 'Versicolor'],
        [6.3, 3.3, 6, 2.5, 'Virginica'],
        [5.8, 2.7, 5.1, 1.9, 'Virginica'],
        [7.1, 3, 5.9, 2.1, 'Virginica'],
        [6.3, 2.9, 5.6, 1.8, 'Virginica'],
        [6.5, 3, 5.8, 2.2, 'Virginica'],
        [7.6, 3, 6.6, 2.1, 'Virginica'],
        [4.9, 2.5, 4.5, 1.7, 'Virginica'],
        [7.3, 2.9, 6.3, 1.8, 'Virginica'],
        [6.7, 2.5, 5.8, 1.8, 'Virginica'],
        [7.2, 3.6, 6.1, 2.5, 'Virginica'],
        [6.5, 3.2, 5.1, 2, 'Virginica'],
        [6.4, 2.7, 5.3, 1.9, 'Virginica'],
        [6.8, 3, 5.5, 2.1, 'Virginica'],
        [5.7, 2.5, 5, 2, 'Virginica'],
        [5.8, 2.8, 5.1, 2.4, 'Virginica'],
        [6.4, 3.2, 5.3, 2.3, 'Virginica'],
        [6.5, 3, 5.5, 1.8, 'Virginica'],
        [7.7, 3.8, 6.7, 2.2, 'Virginica'],
        [7.7, 2.6, 6.9, 2.3, 'Virginica'],
        [6, 2.2, 5, 1.5, 'Virginica'],
        [6.9, 3.2, 5.7, 2.3, 'Virginica'],
        [5.6, 2.8, 4.9, 2, 'Virginica'],
        [7.7, 2.8, 6.7, 2, 'Virginica'],
        [6.3, 2.7, 4.9, 1.8, 'Virginica'],
        [6.7, 3.3, 5.7, 2.1, 'Virginica'],
        [7.2, 3.2, 6, 1.8, 'Virginica'],
        [6.2, 2.8, 4.8, 1.8, 'Virginica'],
        [6.1, 3, 4.9, 1.8, 'Virginica'],
        [6.4, 2.8, 5.6, 2.1, 'Virginica'],
        [7.2, 3, 5.8, 1.6, 'Virginica'],
        [7.4, 2.8, 6.1, 1.9, 'Virginica'],
        [7.9, 3.8, 6.4, 2, 'Virginica'],
        [6.4, 2.8, 5.6, 2.2, 'Virginica'],
        [6.3, 2.8, 5.1, 1.5, 'Virginica'],
        [6.1, 2.6, 5.6, 1.4, 'Virginica'],
        [7.7, 3, 6.1, 2.3, 'Virginica'],
        [6.3, 3.4, 5.6, 2.4, 'Virginica'],
        [6.4, 3.1, 5.5, 1.8, 'Virginica'],
        [6, 3, 4.8, 1.8, 'Virginica'],
        [6.9, 3.1, 5.4, 2.1, 'Virginica'],
        [6.7, 3.1, 5.6, 2.4, 'Virginica'],
        [6.9, 3.1, 5.1, 2.3, 'Virginica'],
        [5.8, 2.7, 5.1, 1.9, 'Virginica'],
        [6.8, 3.2, 5.9, 2.3, 'Virginica'],
        [6.7, 3.3, 5.7, 2.5, 'Virginica'],
        [6.7, 3, 5.2, 2.3, 'Virginica'],
        [6.3, 2.5, 5, 1.9, 'Virginica'],
        [6.5, 3, 5.2, 2, 'Virginica'],
        [6.2, 3.4, 5.4, 2.3, 'Virginica'],
        [5.9, 3, 5.1, 1.8, 'Virginica'],
      ],
      fields: [
        {
          name: 'sepal_length',
          displayType: 'FLOAT',
          sqlType: 'DOUBLE',
        },
        {
          name: 'sepal_width',
          displayType: 'FLOAT',
          sqlType: 'DOUBLE',
        },
        {
          name: 'petal_length',
          displayType: 'FLOAT',
          sqlType: 'DOUBLE',
        },
        {
          name: 'petal_width',
          displayType: 'FLOAT',
          sqlType: 'DOUBLE',
        },
        {
          name: 'variety',
          displayType: 'STRING',
          sqlType: 'VARCHAR',
        },
      ],
      truncated: false,
    },
    alive: true,
  })

  Object.assign(workspaceView, {
    userId: superUser.id,
    workspaceId: workspace.id,
    pinnedList: [storyId],
  })

  await getRepository(BlockEntity).save([story, question])
  await getRepository(SnapshotEntity).save([snapshot])
  await getRepository(WorkspaceViewEntity).save([workspaceView])
}

main()
  .then(() => {
    console.log('initialize story successfully')
    process.exit(0)
  })
  .catch((err) => {
    console.log('initialize story failed', err)
    // not throw error
    process.exit(1)
  })
