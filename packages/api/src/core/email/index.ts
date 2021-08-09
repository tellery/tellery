import config from 'config'
import { createTransport, Transporter } from 'nodemailer'
import { InvalidArgumentError } from '../../error/error'
import { isTest } from '../../utils/env'

type EmailConfig = {
  backend: 'smtp'
  tls: boolean
  username: string
  password: string
  port: number
  host: string
  from: string
}

export interface EmailSender {
  sendHtml(to: string[], title: string, htmlBody: string): Promise<void>
}

export default function emailSender(): EmailSender {
  if (isTest()) {
    return new TestEmailSender()
  }

  return new NodeMailerSender()
}

export class TestEmailSender implements EmailSender {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async sendHtml(): Promise<void> {}
}

export class NodeMailerSender implements EmailSender {
  private transporter: Transporter

  private from: string

  constructor() {
    const c = config.get<EmailConfig>('email')
    if (c.backend !== 'smtp') {
      throw new Error('unknown email backend')
    }
    this.transporter = createTransport({
      host: c.host,
      port: c.port,
      secure: c.tls, // true for 465, false for other ports
      auth: {
        user: c.username,
        pass: c.password,
      },
    })
    this.from = c.from
  }

  async sendHtml(to: string[], title: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: to.join(', '),
        subject: title,
        html,
      })
    } catch (err) {
      console.error(err)
      throw InvalidArgumentError.new('send the email failed, please check the email configuration')
    }
  }
}
