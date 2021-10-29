import { ReplaySubject, Subject } from 'rxjs'

const blockSubjects: Record<string, Subject<string>> = {}
export const blockManuallyCreatedSubject = new ReplaySubject<string>(10, 500)
export const blockMountedSubject = new Subject<string>()
export const getBlockSubject = (blocKId: string) => {
  if (!blockSubjects[blocKId]) {
    blockSubjects[blocKId] = new Subject<string>()
  }
  return blockSubjects[blocKId]
}

export const informBlockOpenSideBar = (blockId: string) => {
  const subject = getBlockSubject(blockId)
  subject.next('openSideBar')
}

export const notifyBlockManuallyCreated = (blockId: string) => {
  blockManuallyCreatedSubject.next(blockId)
}

export const notifyBlockMounted = (blockId: string) => {
  blockMountedSubject.next(blockId)
}

export const urlPastedSubject = new Subject<string>()

export const notifyUrlPasted = (content: string) => {
  urlPastedSubject.next(content)
}
