type FileInfo = {
  key: string
  hash: string
  bucket: string
  size: number
  name?: string
  ext?: string
  mimeType?: string
  imageInfo?: {
    format: string
    width: number
    height: number
    [key: string]: unknown
  }
}

export { FileInfo }
