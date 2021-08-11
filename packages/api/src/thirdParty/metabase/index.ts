import jwt from 'jsonwebtoken'
import { getRepository } from 'typeorm'
import { URL } from 'url'

import { ThirdPartyConfigurationEntity } from '../../entities/thirdParty'
import { NotFoundError } from '../../error/error'

type MetabaseConfiguration = {
  /**
   * key: domain of metabase
   * value: secret key
   */
  secretMap: { [k: string]: string }
}

class Metabase {
  /**
   * Generate external access metabase url
   * @param site: proto:host.  e.g. https://xxxx.metabase.com
   */
  async generateToken(
    site: string,
    resource: { dashboard?: number; question?: number },
    params: unknown = {},
  ) {
    const payload = {
      resource,
      params,
      exp: Math.round(Date.now() / 1000) + 60 * 60, // 60 minute expiration
    }
    return jwt.sign(payload, await this.getSecretKeyBySite(site))
  }

  private async getSecretKeyBySite(site: string): Promise<string> {
    const tpc = await getRepository(ThirdPartyConfigurationEntity).findOne({
      where: { type: 'metabase' },
      cache: true,
    })
    if (!tpc) {
      throw NotFoundError.resourceNotFound('metabase configuration')
    }
    const url = new URL(site)
    const mc = tpc.config as MetabaseConfiguration
    const secret = mc.secretMap[url.host]
    if (!secret) {
      throw NotFoundError.resourceNotFound('missing secret key of metabase')
    }
    return secret
  }
}

const metabase = new Metabase()
export default metabase
