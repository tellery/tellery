import type { Data } from '@app/components/v11n/types'
import { formatRecord } from '@app/components/v11n/utils'
import { env } from '@app/env'
import isUrl from 'is-url'
import Papa from 'papaparse'
import { QueryClient } from 'react-query'
import { customAlphabet } from 'nanoid'
import { Editor } from '@app/types'
import { mergeTokens } from '@app/components/editor'
export const DRAG_HANDLE_WIDTH = 4

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const blockIdGenerator = customAlphabet(alphabet, 21)

export enum TELLERY_MIME_TYPES {
  BLOCKS = 'text/tellery-blocks-fragment-v1',
  BLOCK_REF = 'text/tellery-block-ref-v1',
  TOKEN = 'text/tellery-tokens-v1',
  MONACO = 'vscode-editor-data'
}

export const BLOCK_ID_REGX = /\{\{([a-z|A-Z|0-9|_|-]+)\}\}/

const STORY_BLOCK_REGEX = new RegExp(
  `${window.location.protocol}//${window.location.host}/story/([a-z|A-Z|0-9|_|-]+)(?:#([a-z|A-Z|0-9|_|-]+))?`
)

export const isBlockId = (text: string) => text.match(BLOCK_ID_REGX)

export const parseTelleryUrl = (url: string) => {
  if (STORY_BLOCK_REGEX.test(url)) {
    const matches = STORY_BLOCK_REGEX.exec(url)!
    const storyId = matches[1]
    const blockId = matches[2]
    return {
      storyId,
      blockId
    }
  }
}

export const DEFAULT_TIPPY_DELAY: [number, number] = [500, 250]

export const DEFAULT_TITLE = 'Untitled'
export const FIRST_LINE_OR_LAST_LINE_THERESHOLD = 10
export const WS_URI = env.WEB_SOCKET_URI

export const addPrefixToBlockTitle = (tokens: Editor.Token[] | undefined | null, prefix: string) => {
  if (!tokens || tokens.length === 0) {
    return mergeTokens([[prefix], [DEFAULT_TITLE]]) as Editor.Token[]
  } else {
    return mergeTokens([[prefix], ...tokens])
  }
}

export const fileLoader = ({ src, workspaceId }: { src: string; workspaceId?: string }) => {
  if (src.startsWith('http')) {
    return `${src}`
  }
  return `/api/storage/file/${workspaceId}/${src}`
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // suspense: true,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchIntervalInBackground: false,
      refetchInterval: false
    }
  }
})
export function snapshotToCSV(snpshot: Data) {
  return new TextEncoder().encode(
    Papa.unparse({
      fields: snpshot.fields.map((field) => field.name),
      data: snpshot.records.map((records) =>
        records.map((record, index) => formatRecord(record, snpshot.fields[index].displayType))
      )
    })
  )
}

export function getOwnerDocument(target: Event['target']) {
  return target instanceof HTMLElement ? target.ownerDocument : document
}

export enum TelleryGlyph {
  BI_LINK = '\ue000',
  FORMULA = '\ue001',
  EQUATION = '\ue002'
}

export { isUrl }
