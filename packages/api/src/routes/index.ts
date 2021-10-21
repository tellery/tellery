import Router from 'koa-router'

import activities from './activity'
import connectors from './connector'
import global from './global'
import operations from './operation'
import questions from './question'
import queries from './query'
import stories from './story'
import thought from './thought'
import upload from './storage'
import users from './user'
import workspaces from './workspace'
import thirdParty from './thirdParty'
import dbt from './dbt'
import internal from './internal'
import { isSaaS } from '../utils/env'

const router = new Router({
  prefix: '/api',
})

router.use('/connectors', connectors.routes(), connectors.allowedMethods())
router.use('/connectors/dbt', dbt.routes(), dbt.allowedMethods())
router.use('/operations', operations.routes(), operations.allowedMethods())
router.use('/stories', stories.routes(), stories.allowedMethods())
router.use('/questions', questions.routes(), questions.allowedMethods())
router.use('/queries', queries.routes(), queries.allowedMethods())
router.use('/workspaces', workspaces.routes(), workspaces.allowedMethods())
router.use('/activities', activities.routes(), activities.allowedMethods())
router.use('/storage', upload.routes(), upload.allowedMethods())
router.use('/thought', thought.routes(), thought.allowedMethods())
router.use('/thirdParty', thirdParty.routes(), thirdParty.allowedMethods())
router.use('/users', users.routes(), users.allowedMethods())
router.use('', global.routes(), global.allowedMethods())
// exposes internal interfaces only for SaaS
if (isSaaS()) {
  router.use('/internal', internal.routes(), internal.allowedMethods())
}

export default router
