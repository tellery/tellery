import { env } from '../env'
import Tracker from '@openreplay/tracker'

export const tracker: Tracker | null = null
// if (env.ASAYERIO_PROJECTID) {
//   tracker = new Tracker({
//     projectKey: env.ASAYERIO_PROJECTID
//   })
//   tracker.start()
// }
