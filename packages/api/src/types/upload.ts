type ProvisionBody = {
  url: string
  key: string
  form: Record<string, string>
  expiresIn: number
}

export { ProvisionBody }
