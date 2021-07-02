import { BlockDTO } from './block'
import { SearchResultDataDTO } from './search'
import { UserInfoDTO } from './user'

export type StorySimpleDTO = {
  id: string
  workspaceId: string
  title: string
}

export type StoryDTO = BlockDTO

export type SearchedStoryDTO = SearchResultDataDTO & {
  // key: storyId, value: story id list
  links: { [k: string]: string[] }
}

export type SearchedStoryV2DTO = {
  blocks: { [k: string]: BlockDTO }
  hints: []
  links: { [k: string]: BlockDTO[] }
  users: { [k: string]: UserInfoDTO }
}

export type StoryVisitsDTO = {
  storyId: string
  userId: string
  lastVisitTimestamp: number
}
