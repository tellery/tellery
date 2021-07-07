type ProvisionRequest = {
  workspaceId: string
  contentType: string
}

type ProvisionBody = {
  url: string
  key: string
  form: Record<string, string>
  expiresIn: number
}

export { ProvisionRequest, ProvisionBody }
