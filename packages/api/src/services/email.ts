import bluebird from 'bluebird'
import * as Eta from 'eta'
import fs from 'fs'
import _ from 'lodash'

import emailSender, { EmailSender } from '../core/email'
import { InternalError, NotFoundError } from '../error/error'
import { absoluteURI, getSecretKey } from '../utils/common'
import { decrypt, encrypt } from '../utils/crypto'
import { EmailCodePayload } from '../utils/email'

export class EmailService {
  private sender: EmailSender

  private templates: { [k: string]: string }

  private secretKey: string

  constructor(sender: EmailSender) {
    this.sender = sender
    this.secretKey = getSecretKey()
    this.templates = {}
    this.loadTemplatesSync()
  }

  /**
   *
   * @returns code
   */
  async sendConfirmationEmail(userId: string, address: string): Promise<string> {
    const key = 'verification.html'

    const code = this.makeVerificationCode(userId)
    const link = absoluteURI(`/confirm?code=${encodeURIComponent(code)}`)
    const html = await this.render(key, { link })

    await this.sender.sendHtml([address], `[Tellery] Please verify you Email Address`, html)
    return code
  }

  /**
   * @param each if the mails are sent one by one
   * @returns
   */
  async sendInvitationEmails(
    inviterName: string,
    inviteeInfos: { userId: string; email: string }[],
    workspace: string,
  ): Promise<{ email: string; inviteLink: string }[]> {
    const key = 'invitation.html'
    const title = `[Tellery] ${inviterName} invited you to ${workspace}`
    const sendFunc = async ({ userId, email }: { userId: string; email: string }) => {
      const code = this.makeVerificationCode(userId)
      const link = absoluteURI(`/confirm?code=${encodeURIComponent(code)}`)
      const html = await this.render(key, { link, workspace })
      try {
        await this.sender.sendHtml([email], title, html)
      } catch (err) {
        console.log(err)
      }
      return { email, inviteLink: link }
    }
    return bluebird.map(inviteeInfos, sendFunc)
  }

  private loadTemplatesSync() {
    const dir = `${__dirname}/../assets/templates`

    const files = fs.readdirSync(dir)
    _(files).forEach((f) => {
      this.templates[f] = fs.readFileSync(`${dir}/${f}`).toString()
    })
  }

  async render(template: string, value: { [k: string]: any }): Promise<string> {
    const t = this.templates[template]
    if (!t) {
      throw NotFoundError.resourceNotFound(`template: ${template}`)
    }
    const res = await Eta.render(t, value, { tags: ['{{', '}}'] })
    if (!res) {
      throw InternalError.new(`render ${template} failed`)
    }
    return res
  }

  private makeVerificationCode(userId: string, expire = 3600000): string {
    const payload: EmailCodePayload = {
      userId,
      expiresAt: _.now() + expire, // 1 hour
      type: 'confirm',
    }
    return encrypt(JSON.stringify(payload), this.secretKey)
  }

  parseCode(code: string): EmailCodePayload {
    return JSON.parse(decrypt(code, this.secretKey)) as EmailCodePayload
  }
}

const service = new EmailService(emailSender())
export default service
