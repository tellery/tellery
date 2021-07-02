import { BlockDTO } from './block'
import { StoryDTO } from './story'

export enum ActivityResourceType {
  BLOCK = 'block',
  STORY = 'story',
  QUESTION = 'question',
  WORKSPACE = 'workspace',
  GROUP = 'group',
}

export enum ActivityCommandType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
}

export type ActivityDTO = {
  id: string
  workspaceId: string
  resourceId: string
  resourceType: ActivityResourceType
  resourceCmd: ActivityCommandType
  edits: ActivityEditDTO[]
  startTimestamp: number
}

export type ActivityEditDTO = {
  resourceId: string
  workspaceId: string
  resourceType: ActivityResourceType
  operatorId: string
  cmd: string
  // activity type
  type: string
  timestamp: number
  before?: BlockDTO | StoryDTO
  after?: BlockDTO | StoryDTO
}
