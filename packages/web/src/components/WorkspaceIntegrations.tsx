import { IconCommonArrowLeft, IconCommonArrowRight } from '@app/assets/icons'
import {
  useConnectorsList,
  useConnectorsGetProfile,
  useGenerateKeyPair,
  usePullRepo,
  usePushRepo,
  useRevokeKeyPair,
  useWorkspaceDetail
} from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import type { ProfileConfig } from '@app/types'
import { css } from '@emotion/css'
import copy from 'copy-to-clipboard'
import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'
import IconButton from './kit/IconButton'
import { toast } from 'react-toastify'
import Tippy from '@tippyjs/react'
import { useLoggedUser } from '@app/hooks/useAuth'

enum Integration {
  DBT = 'DBT'
}

export function WorkspaceIntegrations() {
  const { data: workspace } = useWorkspaceDetail()
  const [integration, setIntegration] = useState<Integration>()
  const { data: connectors } = useConnectorsList()
  const connector = useMemo(
    () => connectors?.find((c) => c.id === workspace?.preferences.connectorId),
    [connectors, workspace?.preferences.connectorId]
  )
  const { data: profile } = useConnectorsGetProfile(connector?.id)
  const user = useLoggedUser()
  const me = useMemo(() => workspace?.members.find(({ userId }) => userId === user.id), [user.id, workspace?.members])
  const disabled = me?.role !== 'admin'

  return connector ? (
    <div
      className={css`
        flex: 1;
        height: 100%;
        padding: 30px 32px 16px;
        display: flex;
        flex-direction: column;
      `}
    >
      {integration ? null : (
        <div>
          <h2
            className={css`
              font-weight: 600;
              font-size: 16px;
              line-height: 20px;
              margin: 0;
              margin-bottom: 20px;
              color: ${ThemingVariables.colors.text[0]};
            `}
          >
            Integrations
          </h2>
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
            `}
          >
            <div>
              <h3
                className={css`
                  margin: 4px 0 0 0;
                  font-weight: 500;
                  font-size: 14px;
                  line-height: 17px;
                  color: ${ThemingVariables.colors.text[0]};
                `}
              >
                dbt
              </h3>
              <p
                className={css`
                  margin: 5px 0 0 0;
                  font-size: 12px;
                  line-height: 14px;
                  color: ${ThemingVariables.colors.text[1]};
                `}
              >
                Use dbt and tellery to manage your data model
              </p>
            </div>
            {profile?.configs['Public Key'] ? (
              <IconButton
                icon={IconCommonArrowRight}
                color={ThemingVariables.colors.gray[0]}
                disabled={disabled}
                onClick={() => {
                  setIntegration(Integration.DBT)
                }}
              />
            ) : (
              <FormButton
                variant="primary"
                disabled={disabled}
                onClick={() => {
                  setIntegration(Integration.DBT)
                }}
              >
                Connect
              </FormButton>
            )}
          </div>
        </div>
      )}
      {integration === Integration.DBT ? (
        <DBTIntegration connectorId={connector.id} onClose={() => setIntegration(undefined)} />
      ) : null}
    </div>
  ) : null
}

function DBTIntegration(props: { connectorId: string; onClose: () => void }) {
  const { data: profile, refetch } = useConnectorsGetProfile(props.connectorId)
  const { register, watch, reset } = useForm<ProfileConfig>({
    defaultValues: profile,
    mode: 'onBlur'
  })
  useEffect(() => {
    reset(profile)
  }, [profile, reset])
  const handleGenerateKeyPair = useGenerateKeyPair(
    props.connectorId,
    profile,
    watch('configs.Dbt Project Name') as string | undefined,
    watch('configs.Git Url') as string | undefined
  )
  useEffect(() => {
    if (handleGenerateKeyPair.status === 'success') {
      refetch()
    }
  }, [handleGenerateKeyPair.status, refetch])
  const handleRevokeKeyPair = useRevokeKeyPair(props.connectorId, profile)
  useEffect(() => {
    if (handleRevokeKeyPair.status === 'success') {
      refetch()
      props.onClose()
    }
  }, [handleRevokeKeyPair.status, props, refetch])
  const handlePullRepo = usePullRepo(props.connectorId, profile?.name)
  const handlePushRepo = usePushRepo(props.connectorId, profile?.name)

  return (
    <div
      className={css`
        height: 100%;
        display: flex;
        flex-direction: column;
      `}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        `}
      >
        <IconButton
          icon={IconCommonArrowLeft}
          color={ThemingVariables.colors.gray[0]}
          className={css`
            cursor: pointer;
            margin-right: 10px;
          `}
          onClick={props.onClose}
        />
        <h2
          className={css`
            flex: 1;
            font-weight: 600;
            font-size: 16px;
            line-height: 20px;
            margin: 0;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          dbt
        </h2>
      </div>
      <FormLabel>Project name</FormLabel>
      <FormInput {...register('configs.Dbt Project Name')} disabled={!!profile?.configs['Dbt Project Name']} />
      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[2]};
          margin-top: 5px;
          display: block;
        `}
      >
        The name needs to be the same as the dbt project name.
      </span>
      <FormLabel
        className={css`
          margin-top: 20px;
        `}
      >
        Git URL
      </FormLabel>
      <FormInput {...register('configs.Git Url')} disabled={!!profile?.configs['Git Url']} />
      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[2]};
          margin-top: 5px;
          display: block;
        `}
      >
        Use the SSH version of your Git URL(beginning with git@).
      </span>
      {profile?.configs['Public Key'] ? (
        <>
          <FormLabel
            className={css`
              margin-top: 20px;
            `}
          >
            Public key
          </FormLabel>
          <div
            className={css`
              display: flex;
            `}
          >
            <FormInput {...register('configs.Public Key')} disabled={!!profile?.configs['Public Key']} />
            <FormButton
              variant="secondary"
              disabled={!profile?.configs['Public Key']}
              onClick={() => {
                if (profile?.configs['Public Key']) {
                  copy(profile.configs['Public Key'] as string)
                  toast.success('Public key copied')
                }
              }}
              className={css`
                margin-left: 10px;
                width: 80px;
                flex-shrink: 0;
              `}
            >
              Copy
            </FormButton>
          </div>
          <span
            className={css`
              font-size: 12px;
              line-height: 14px;
              color: ${ThemingVariables.colors.text[2]};
              margin-top: 5px;
              display: block;
            `}
          >
            Please copy the key to the “Deploy keys” in the github repository of this project.
          </span>
          <div
            className={css`
              flex: 1;
            `}
          />
          <span
            className={css`
              font-size: 12px;
              line-height: 14px;
              color: ${ThemingVariables.colors.text[2]};
              margin-bottom: 10px;
              display: block;
            `}
          >
            🔴 Because the version is not a stable dbt version, you should merge PR after push immediately to avoid
            conflicts.
          </span>
          <div
            className={css`
              width: 100%;
              display: flex;
            `}
          >
            <Tippy content="Tellery will checkout a new branch, commit all new changes, and then push it to remote, so you are in a new branch after clicking the push button.">
              <div
                className={css`
                  margin-right: 16px;
                  flex: 1;
                `}
              >
                <FormButton
                  variant="primary"
                  className={css`
                    width: 100%;
                  `}
                  onClick={handlePushRepo.execute}
                  loading={handlePushRepo.status === 'pending'}
                  disabled={handlePullRepo.status === 'pending'}
                >
                  Push
                </FormButton>
              </div>
            </Tippy>
            <Tippy content="Check out the master branch and pull all new changes.">
              <div
                className={css`
                  margin-right: 16px;
                  flex: 1;
                `}
              >
                <FormButton
                  variant="primary"
                  className={css`
                    width: 100%;
                  `}
                  onClick={handlePullRepo.execute}
                  loading={handlePullRepo.status === 'pending'}
                  disabled={handlePushRepo.status === 'pending'}
                >
                  Pull
                </FormButton>
              </div>
            </Tippy>
            <FormButton
              variant="danger"
              className={css`
                width: 80px;
                flex-shrink: 0;
              `}
              disabled={handlePushRepo.status === 'pending'}
              onClick={() => {
                if (confirm('Revoke dbt?')) {
                  handleRevokeKeyPair.execute()
                }
              }}
            >
              Revoke
            </FormButton>
          </div>
        </>
      ) : (
        <>
          <div
            className={css`
              flex: 1;
            `}
          />
          <FormButton
            variant="primary"
            onClick={handleGenerateKeyPair.execute}
            loading={handleGenerateKeyPair.status === 'pending'}
          >
            Compile
          </FormButton>
        </>
      )}
    </div>
  )
}
