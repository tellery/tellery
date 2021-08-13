/* eslint-disable @typescript-eslint/ban-types */
import { validate as valid } from 'class-validator'

export async function validate(payload: object): Promise<void> {
  const errors = await valid(payload)
  if (errors.length > 0) {
    // eslint-disable-next-line
    throw errors[0]
  }
}
