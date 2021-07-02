import type { Transcation } from '@app/hooks/useCommit'
import { importFromCSV } from 'api'
import { cloneDeep } from 'lodash'
import { customAlphabet } from 'nanoid'
import { toast } from 'react-toastify'
import { Editor, Workspace } from 'types'
import { fileLoader } from 'utils'
import { getImageDimension, uploadFile } from 'utils/upload'
import { setBlockTranscation } from '../../context/editorTranscations'

export enum DataFileType {
  CSV,
  EXCEL,
  IMAGE
}

const getFileType = (file: File) => {
  if (file.type === 'text/csv') {
    console.log('file', file.type)
    return DataFileType.CSV
  } else if (
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return DataFileType.EXCEL
  } else if (file.type.startsWith('image')) {
    return DataFileType.IMAGE
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

const getSafeRandomFileName = (name: string) => {
  const customNanoId = customAlphabet('abcdef', 3)
  const collectionName = `${getSafeFileName(name)}_${customNanoId()}`
  return collectionName
}

const File2BlockProcessers: Record<
  DataFileType,
  (file: File, block: Editor.Block, workspace: Workspace) => Promise<Omit<Transcation, 'workspaceId'>>
> = {
  [DataFileType.CSV]: async (file: File, block: Editor.Block, workspace: Workspace) => {
    const uploadedFile = await uploadFile(file, workspace.id)
    const fileUrl = fileLoader({ src: uploadedFile.key, type: 'OTHER' })
    const collectionName = getSafeRandomFileName(file.name)

    const res = await importFromCSV({
      url: fileUrl,
      collection: collectionName,
      connectorId: workspace.preferences.connectorId!,
      database: workspace.preferences.dbImportsTo!,
      profile: workspace.preferences.profile!,
      workspaceId: workspace.id
    })
    const sql = `select * from ${res.data.database}.${res.data.collection}`
    const title = `data from ${res.data.collection}`
    return setBlockTranscation({
      oldBlock: cloneDeep(block),
      newBlock: {
        ...block,
        type: Editor.BlockType.Question,
        content: {
          sql,
          title: [[title]]
        }
      }
    })
  },
  [DataFileType.EXCEL]: async (file: File, block: Editor.Block, workspace: Workspace) => {
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

    return File2BlockProcessers[DataFileType.CSV](csvFile, block, workspace)
  },
  [DataFileType.IMAGE]: async (file: File, block: Editor.Block, workspace: Workspace) => {
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

export async function uploadFilesAndUpdateBlocks(files: FileList, fileBlocks: Editor.Block[], workspace: Workspace) {
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
