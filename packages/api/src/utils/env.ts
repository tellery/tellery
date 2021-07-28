export function isTest() {
  return process.env.NODE_ENV === 'test'
}

export function isAnonymous() {
  return !!process.env.ANONYMOUS
}
