import { IconCommonArrowLeft } from '@app/assets/icons'
import {
  useConnectorsList,
  useConnectorsListProfiles,
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
  const { data: profiles } = useConnectorsListProfiles(connector?.id)
  const profile = useMemo(
    () => profiles?.find((p) => p.name === workspace?.preferences.profile),
    [profiles, workspace?.preferences.profile]
  )

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
          <h3
            className={css`
              margin: 0;
            `}
          >
            DBT
          </h3>
          <p>Use dbt and tellery to manage your data model</p>
          <FormButton
            variant={profile?.configs['Public Key'] ? 'secondary' : 'primary'}
            onClick={() => {
              setIntegration(Integration.DBT)
            }}
          >
            {profile?.configs['Public Key'] ? 'View' : 'Connect'}
          </FormButton>
        </div>
      )}
      {integration === Integration.DBT ? (
        <DBTIntegration connectorId={connector.id} onClose={() => setIntegration(undefined)} />
      ) : null}
    </div>
  ) : null
}

function DBTIntegration(props: { connectorId: string; onClose: () => void }) {
  const { data: workspace } = useWorkspaceDetail()
  const { data: profiles, refetch } = useConnectorsListProfiles(props.connectorId)
  const profile = useMemo(
    () => profiles?.find((p) => p.name === workspace?.preferences.profile),
    [profiles, workspace?.preferences.profile]
  )
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
    <>
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
          DBT
        </h2>
        {profile?.configs['Public Key'] ? (
          <span
            className={css`
              float: right;
              font-weight: 600;
              font-size: 14px;
              line-height: 16px;
              color: ${ThemingVariables.colors.primary[1]};
              cursor: pointer;
            `}
            onClick={() => {
              if (confirm('Revoke DBT?')) {
                handleRevokeKeyPair.execute()
              }
            }}
          >
            Revoke
          </span>
        ) : null}
      </div>
      <FormLabel>Project name</FormLabel>
      <FormInput {...register('configs.Dbt Project Name')} disabled={!!profile?.configs['Dbt Project Name']} />
      <FormLabel
        className={css`
          margin-top: 16px;
        `}
      >
        Git url
      </FormLabel>
      <FormInput {...register('configs.Git Url')} disabled={!!profile?.configs['Git Url']} />
      {profile?.configs['Public Key'] ? (
        <>
          <FormLabel
            className={css`
              margin-top: 16px;
            `}
          >
            Public key
          </FormLabel>
          <FormInput {...register('configs.Public Key')} disabled={!!profile?.configs['Public Key']} />
          <div
            className={css`
              margin-top: 16px;
              display: flex;
            `}
          >
            <FormButton
              variant="secondary"
              className={css`
                margin-right: 16px;
                width: 70px;
              `}
              onClick={handlePushRepo.execute}
              loading={handlePullRepo.status === 'pending' || handlePushRepo.status === 'pending'}
            >
              Push
            </FormButton>
            <FormButton
              variant="secondary"
              className={css`
                margin-right: 16px;
                width: 70px;
              `}
              onClick={handlePullRepo.execute}
              loading={handlePullRepo.status === 'pending' || handlePushRepo.status === 'pending'}
            >
              Pull
            </FormButton>
            <div
              className={css`
                flex: 1;
              `}
            />
            <FormButton
              variant="primary"
              disabled={!profile?.configs['Public Key']}
              onClick={() => {
                if (profile?.configs['Public Key']) {
                  copy(profile.configs['Public Key'] as string)
                  toast.success('Public key copied')
                }
              }}
            >
              Copy public key
            </FormButton>
          </div>
        </>
      ) : (
        <FormButton
          variant="primary"
          onClick={handleGenerateKeyPair.execute}
          loading={handleGenerateKeyPair.status === 'pending'}
          className={css`
            margin-top: 16px;
          `}
        >
          Compile
        </FormButton>
      )}
    </>
  )
}
