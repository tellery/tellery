import config from 'config'
import { File } from 'formidable'
import { promisify } from 'util'
import { createReadStream, unlink } from 'fs'
import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import storageService from '../services/storage'
import { mustGetUser } from '../utils/user'
import { validate } from '../utils/http'
import { readableStreamWrapper } from '../utils/stream'
import selfhostedStorage from '../store/selfhostedStorage'

class ProvisionRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  contentType!: string
}

async function provision(ctx: Context) {
  const payload = plainToClass(ProvisionRequest, ctx.request.query)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, contentType } = payload
  ctx.body = await storageService.provision(user.id, payload.workspaceId, {
    workspaceId,
    contentType,
  })
}

class GetFileRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  fileKey!: string
}
async function getFile(ctx: Context) {
  const payload = plainToClass(GetFileRequest, ctx.params)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  const { workspaceId, fileKey } = payload
  const fetchedObject = await storageService.objectProxy(user.id, workspaceId, fileKey)
  if (!fetchedObject) {
    ctx.throw(404)
  }
  if (fetchedObject instanceof Object) {
    const { content, contentType } = fetchedObject
    ctx.body = content
    ctx.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31104000',
    })
  } else {
    ctx.redirect(fetchedObject)
  }
}

class UploadRequest {
  @IsDefined()
  key!: string

  @IsDefined()
  workspaceId!: string

  @IsDefined()
  contentType!: string
}
async function upload(ctx: Context) {
  const payload = plainToClass(UploadRequest, ctx.request.body)
  await validate(ctx, payload)
  if (!ctx.request.files) {
    ctx.throw(400)
  }
  const file = ctx.request.files.file as File
  const { name, size, path } = file
  const { key, workspaceId, contentType } = payload

  const buffer = await readableStreamWrapper(createReadStream(path))
  await promisify(unlink)(path)

  await selfhostedStorage.putFile({
    key,
    workspaceId,
    content: buffer,
    contentType,
    size,
    metadata: { name: name ?? key },
  })

  ctx.body = {
    key: payload.key,
    name,
    size,
  }
}

const router = new Router()

router.get('/provision', provision)
router.get('/file/:workspaceId/:fileKey', getFile)
if (!config.has('objectStorage.type') || config.get('objectStorage.type') === 'postgres') {
  router.post('/upload', upload)
}

export default router
