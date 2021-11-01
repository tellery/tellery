import { Subject } from 'rxjs'

export const transcationApplied$ = new Subject<{ id: string; success: boolean }>()

export const notifyTranscationApplied = (transcationId: string, success: boolean) => {
  transcationApplied$.next({ id: transcationId, success })
}
export const waitForTranscationApplied = (transcationId: string) => {
  return new Promise((resolve, reject) => {
    const subscription = transcationApplied$.subscribe(({ id, success }) => {
      if (id === transcationId) {
        if (success) {
          resolve(true)
        } else {
          reject(new Error())
        }
        subscription.unsubscribe()
      }
    })
  })
}
