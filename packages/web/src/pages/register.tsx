import { useAsync } from '@app/hooks'
import { useAuth } from '@app/hooks/useAuth'
import { css } from '@emotion/css'
import { ErrorMessage } from '@hookform/error-message'
import { FormButton } from 'components/kit/FormButton'
import FormError from 'components/kit/FormError'
import FormInput from 'components/kit/FormInput'
import FormModal from 'components/kit/FormModal'
import { useForm } from 'react-hook-form'
import isEmail from 'validator/lib/isEmail'

export default function Register() {
  const auth = useAuth()
  const handleUserGenerate = useAsync(auth.generate)

  const {
    register,
    formState: { errors },
    handleSubmit,
    getValues
  } = useForm<{ email: string }>({})

  return (
    <div
      className={css`
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      `}
    >
      {handleUserGenerate.status === 'success' ? (
        <FormModal
          title="Please verify your Email"
          subtitle={`We sent you an email to proceed with the next steps. Check ${getValues().email} to verify.`}
        />
      ) : (
        <FormModal
          onSubmit={handleSubmit(handleUserGenerate.execute)}
          title="First enter your Email"
          body={
            <>
              <FormInput
                type="text"
                {...register('email', {
                  required: 'required',
                  validate: (v) => (v && isEmail(v) ? true : 'email format error')
                })}
                error={errors.email}
              />
              <ErrorMessage errors={errors} name="email" render={FormError} />
            </>
          }
          footer={
            <FormButton
              variant="primary"
              className={css`
                width: 100%;
              `}
              disabled={handleUserGenerate.status === 'pending'}
            >
              Next
            </FormButton>
          }
        />
      )}
    </div>
  )
}
