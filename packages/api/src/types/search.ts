import { BlockDTO } from './block'
import { UserInfoDTO } from './user'

export type SearchDataDTO = {
  results: SearchResultDataDTO
}

export type SearchResultDataDTO = {
  blocks?: { [k: string]: BlockDTO }
  users?: { [k: string]: UserInfoDTO }
  highlights: { [k: string]: string }
  // id list
  searchResults: string[]
}
