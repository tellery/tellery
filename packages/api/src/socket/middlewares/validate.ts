import { Socket } from 'socket.io'
import { getIPermission, IPermission } from '../../core/permission'

import { InvalidArgumentError } from '../../error/error'
import { canGetWorkspaceData } from '../../utils/permission'

let ipv: IPermission

function getIPV() {
  if (!ipv) {
    ipv = getIPermission()
  }
  return ipv
}

/**
 * validate params of socket connection
 * 1. throw error when there is no workspaceId or userId in query body
 * 2. throw error if the user is not in the workspace
 */
export default async function validate(socket: Socket, next: (err?: any) => void) {
  try {
    const { workspaceId, userId } = socket.handshake.query
    const wid = workspaceId as string
    const uid = userId as string
    if (!wid || !uid) {
      throw InvalidArgumentError.new('must set workspaceId and userId')
    }
    await canGetWorkspaceData(getIPV(), uid, wid)
    return next()
  } catch (err) {
    return next(err)
  }
}
