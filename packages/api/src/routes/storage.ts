import config from 'config'
import { File } from 'formidable'
import { createReadStream } from 'fs'
import { plainToClass } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { Context } from 'koa'
import Router from 'koa-router'
import storageService from '../services/storage'
import { mustGetUser } from '../utils/user'
import { validate } from '../utils/http'
import { readableStreamWrapper } from '../utils/common'
import selfhostedStorage from '../store/selfhostedStorage'

class ProvisionRequest {
  @IsDefined()
  workspaceId!: string
}

async function provision(ctx: Context) {
  const payload = plainToClass(ProvisionRequest, ctx.request.query)
  await validate(ctx, payload)
  const user = mustGetUser(ctx)
  ctx.body = await storageService.provision(user.id, payload.workspaceId)
}

class FetchRequest {
  @IsDefined()
  workspaceId!: string

  @IsDefined()
  link!: string
}
async function fetch(ctx: Context) {
  const payload = plainToClass(FetchRequest, ctx.params)
  await validate(ctx, payload)
  const { workspaceId, link } = payload

  const match = link.match(new RegExp('tellery://([0-9a-zA-Z_-]+)'))
  if (!match) {
    ctx.redirect(link)
    return
  }

  const user = mustGetUser(ctx)
  const fetchedObject = await storageService.objectProxy(user.id, workspaceId, match[1])
  if (!fetchedObject) {
    ctx.throw(404)
  }
  if (fetchedObject instanceof Buffer) {
    ctx.body = fetchedObject
  } else {
    ctx.redirect(fetchedObject)
  }
}

class UploadRequest {
  @IsDefined()
  key!: string
}
async function upload(ctx: Context) {
  const payload = plainToClass(UploadRequest, ctx.request.body)
  await validate(ctx, payload)
  if (!ctx.request.files) {
    ctx.throw(400)
  }
  const file = ctx.request.files.file as File
  const { name, size, path } = file
  const buffer = await readableStreamWrapper(createReadStream(path))
  await selfhostedStorage.putFile(payload.key, buffer, { name, size })
  ctx.body = {
    key: payload.key,
    name,
    size,
  }
}

const router = new Router()

router.get('/provision', provision)
router.get('/file/:workspaceId/:link', fetch)
if (!config.has('objectStorage.type') || config.get('objectStorage.type') === 'postgres') {
  router.post('/upload', upload)
}

export default router
