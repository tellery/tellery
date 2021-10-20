export function isTest() {
  return process.env.NODE_ENV === 'test'
}

export function isAnonymous() {
  return !!process.env.ANONYMOUS
}

export function isSaaS() {
  return process.env.DEPLOY_MODE === 'SaaS'
}
