type FileBody = {
  workspaceId: string
  key: string
  contentType: string
  content: Buffer
  size: number
  metadata: Record<string, string | number | boolean>
}

export { FileBody }
