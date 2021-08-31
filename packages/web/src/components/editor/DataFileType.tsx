import type { Transcation } from '@app/hooks/useCommit'
import { importFromCSV } from '@app/api'
import { cloneDeep } from 'lodash'
import { customAlphabet } from 'nanoid'
import { toast } from 'react-toastify'
import { Editor, Workspace } from '@app/types'
import { getImageDimension, uploadFile } from '@app/utils/upload'
import { createTranscation, setBlockOperations, setBlockTranscation } from '../../context/editorTranscations'
import { createEmptyBlock } from '@app/helpers/blockFactory'

export enum FileType {
  CSV,
  EXCEL,
  IMAGE
}

const getFileType = (file: File) => {
  if (file.type === 'text/csv') {
    return FileType.CSV
  } else if (
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return FileType.EXCEL
  } else if (file.type.startsWith('image')) {
    return FileType.IMAGE
  }
}

const getSafeFileName = (name: string) => {
  const names = name.split('.')

  const safename = names[0]
    .replace('-', '_')
    .split('')
    .filter((char: string) => /[a-z|A-Z|0-9|_]/.test(char))
    .join('')
  return safename
}

const getSafeRandomFileName = () => {
  const customNanoId = customAlphabet('abcdefghijklmnopqrstuvwxyz', 7)
  const collectionName = `csv_${customNanoId()}`
  return collectionName
}

const File2BlockProcessers: Record<
  FileType,
  <T extends Editor.BaseBlock>(file: File, block: T, workspace: Workspace) => Promise<Omit<Transcation, 'workspaceId'>>
> = {
  [FileType.CSV]: async (file: File, block: Editor.BaseBlock, workspace: Workspace) => {
    const uploadedFile = await uploadFile(file, workspace.id)
    const collectionName = getSafeRandomFileName()

    const res = await importFromCSV({
      key: uploadedFile.key,
      collection: collectionName,
      connectorId: workspace.preferences.connectorId!,
      database: workspace.preferences.dbImportsTo!,
      profile: workspace.preferences.profile!,
      workspaceId: workspace.id
    })
    const sql = `select * from ${res.data.database}.${res.data.collection}`
    const title = `data from ${res.data.collection}`
    const dataAssetBlock = createEmptyBlock<Editor.SQLBlock>({
      type: Editor.BlockType.SQL,
      content: {
        sql,
        title: [[title]]
      },
      storyId: block.storyId,
      parentId: block.storyId
    })
    return createTranscation({
      operations: [
        {
          cmd: 'set',
          id: dataAssetBlock.id,
          path: [],
          args: dataAssetBlock,
          table: 'block'
        },
        {
          cmd: 'listBefore',
          id: block.storyId!,
          path: ['resources'],
          table: 'block',
          args: {
            id: dataAssetBlock.id
          }
        },
        ...setBlockOperations<Editor.VisualizationBlock>({
          oldBlock: cloneDeep(block),
          newBlock: {
            ...block,
            type: Editor.BlockType.Visualization,
            content: {
              queryId: dataAssetBlock.id
            }
          }
        })
      ]
    })
  },
  [FileType.EXCEL]: async (file: File, block: Editor.BaseBlock, workspace: Workspace) => {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const workbookLoaded = await workbook.xlsx.load(await file.arrayBuffer())
    const csvBuffer = await workbookLoaded.csv.writeBuffer({
      encoding: 'utf-8',
      formatterOptions: {
        delimiter: ',',
        quote: false,
        rowDelimiter: '\r\n'
      }
    })

    const csvFile = new File([csvBuffer as BlobPart], `${getSafeFileName(file.name)}.csv`, {
      type: 'text/csv'
    })

    return File2BlockProcessers[FileType.CSV](csvFile, block, workspace)
  },
  [FileType.IMAGE]: async (file: File, block: Editor.ImageBlock, workspace: Workspace) => {
    const dimensions = await getImageDimension(URL.createObjectURL(file))
    const uploadedFile = await uploadFile(file, workspace.id)
    return setBlockTranscation({
      oldBlock: cloneDeep(block),
      newBlock: {
        ...block,
        type: Editor.BlockType.Image,
        content: {
          fileKey: uploadedFile.key,
          imageInfo: dimensions
        },
        format: {
          aspectRatio: dimensions.width / dimensions.height,
          width: 1
        }
      }
    })
  }
}

export async function uploadFilesAndUpdateBlocks(files: File[], fileBlocks: Editor.BaseBlock[], workspace: Workspace) {
  const transcations: Omit<Transcation, 'workspaceId'>[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileType = getFileType(file)
    if (fileType !== undefined) {
      const processor = File2BlockProcessers[fileType!]
      const transcation = await processor(file, cloneDeep(fileBlocks[i]), workspace)
      transcations.push(transcation)
    } else {
      toast.error('unsuported file type')
    }
  }
  return transcations
}
