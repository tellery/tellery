import { IconCommonSub } from '@app/assets/icons'
import { setBlockTranscation } from '@app/context/editorTranscations'
import { useBlockSuspense } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { useCallback } from 'react'
import ConfigIconButton from './v11n/components/ConfigIconButton'
import { ConfigSection } from './v11n/components/ConfigSection'

export default function SideBarSmartQuery(props: { storyId: string; blockId: string }) {
  const block = useBlockSuspense<Editor.VisualizationBlock>(props.blockId)
  const smartQueryBlock = useBlockSuspense<Editor.SmartQueryBlock>(block.content?.queryId!)
  const queryBuilderBlock = useBlockSuspense<Editor.QueryBuilder>(smartQueryBlock.content?.queryBuilderId)
  const commit = useCommit()
  const setBlock = useCallback(
    (update: (block: WritableDraft<Editor.VisualizationBlock>) => void) => {
      const oldBlock = smartQueryBlock
      const newBlock = produce(oldBlock, update)
      commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId })
    },
    [smartQueryBlock, commit, props.storyId]
  )

  return (
    <>
      <ConfigSection title="Measures" border={false}>
        {smartQueryBlock.content.metricIds.map((metricId) =>
          queryBuilderBlock.content?.metrics?.[metricId] ? (
            <div
              key={metricId}
              className={css`
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-left: 6px;
              `}
            >
              <span
                className={css`
                  font-style: normal;
                  font-weight: normal;
                  font-size: 12px;
                  line-height: 14px;
                  color: ${ThemingVariables.colors.text[0]};
                `}
              >
                {queryBuilderBlock.content?.metrics?.[metricId].name}
              </span>
              <ConfigIconButton
                icon={IconCommonSub}
                className={css`
                  margin-left: 4px;
                `}
              />
            </div>
          ) : null
        )}
      </ConfigSection>
      <ConfigSection title="Dimensions">
        {smartQueryBlock.content.dimensions.map((dimension, index) => (
          <div
            key={dimension.name + index}
            className={css`
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-left: 6px;
            `}
          >
            <span
              className={css`
                font-style: normal;
                font-weight: normal;
                font-size: 12px;
                line-height: 14px;
                color: ${ThemingVariables.colors.text[0]};
              `}
            >
              {dimension.name}
            </span>
            <ConfigIconButton
              icon={IconCommonSub}
              className={css`
                margin-left: 4px;
              `}
            />
          </div>
        ))}
      </ConfigSection>
    </>
  )
}
