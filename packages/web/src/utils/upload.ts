export const getProvision = async (contentType: string, workspaceId: string) => {
  const res = await fetch(
    `/api/storage/provision?contentType=${encodeURIComponent(contentType)}&workspaceId=${workspaceId}`,
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

export const getImageDimension = (url: string) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.width, height: image.height })
    }

    image.onerror = (err) => {
      reject(err)
    }
    image.src = url
  })
}

export const uploadFile = async (file: Blob, workspaceId: string) => {
  const provision = await getProvision(file.type, workspaceId)
  const formData = new FormData()
  for (const key in provision.form) {
    formData.append(key, provision.form[key])
  }
  formData.append('file', file)

  try {
    await fetch(provision.url, {
      method: 'post',
      mode: 'cors',
      body: formData
    })

    return { key: `${provision.key}` }
  } catch (err) {
    console.log(err)
    throw err
  }
}
