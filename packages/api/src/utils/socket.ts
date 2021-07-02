import { validate as valid } from 'class-validator'

export async function validate(payload: Object): Promise<void> {
  const errors = await valid(payload)
  if (errors.length > 0) {
    // eslint-disable-next-line
    throw errors[0]
  }
}
