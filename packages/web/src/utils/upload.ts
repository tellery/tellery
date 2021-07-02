import type { FileInfo } from 'types'

export const getProvision = async (contentType: string, workspaceId: string) => {
  const res = await fetch(
    `/api/upload/provision?contentType=${encodeURIComponent(contentType)}&workspaceId=${workspaceId}`,
    {
      method: 'get'
    }
  )
  const provision = (await res.json()) as {
    url: string
    key: string
    form: Record<string, string>
    expiresIn: number
  }
  return provision
}

export const uploadFile = async (file: Blob, workspaceId: string) => {
  const provision = await getProvision(file.type, workspaceId)
  const formData = new FormData()
  for (const key in provision.form) {
    formData.append(key, provision.form[key])
  }
  formData.append('file', file)
  try {
    const res = await fetch(`${provision.url}`, {
      method: 'post',
      mode: 'cors',
      body: formData
    })
    const data = (await res.json()) as {
      file: FileInfo
    }
    return { key: `${provision.url}/${provision.key}`, imageInfo: data.file.imageInfo }
  } catch (err) {
    console.log(err)
    throw err
  }
}
