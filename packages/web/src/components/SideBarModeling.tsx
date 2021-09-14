import { IconCommonAdd, IconCommonSub } from '@app/assets/icons'
import { setBlockTranscation } from '@app/context/editorTranscations'
import { useBlock, useBlockSuspense, useSnapshot } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { Editor, Metric } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { css } from '@emotion/css'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { useCallback, useMemo } from 'react'
import { MetricConigCreator } from './QueryBuilderConfig'
import ConfigIconButton from './v11n/components/ConfigIconButton'
import { ConfigInput } from './v11n/components/ConfigInput'
import { ConfigPopoverWithTabs } from './v11n/components/ConfigPopoverWithTabs'
import { ConfigSection } from './v11n/components/ConfigSection'

export default function SideBarModeling(props: { storyId: string; blockId: string }) {
  const block = useBlockSuspense<Editor.VisualizationBlock>(props.blockId)
  const { data: queryBlock } = useBlock<Editor.QueryBlock>(block.content?.queryId!)
  const snapshot = useSnapshot(queryBlock?.content?.snapshotId)
  const commit = useCommit()
  const setBlock = useCallback(
    (update: (block: WritableDraft<Editor.VisualizationBlock>) => void) => {
      if (!queryBlock) {
        return
      }
      const oldBlock = queryBlock
      const newBlock = produce(oldBlock, update)
      commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId })
    },
    [queryBlock, commit, props.storyId]
  )
  const fields = useMemo(
    () =>
      snapshot?.data.fields
        .filter((field) => field.sqlType)
        .map((field) => ({ name: field.name, type: field.sqlType! })),
    [snapshot?.data.fields]
  )
  const metrics =
    queryBlock?.type === Editor.BlockType.QueryBuilder ? (queryBlock as Editor.QueryBuilder).content?.metrics || {} : {}

  return (
    <>
      <ConfigSection
        title="Metrics"
        border="bottom"
        right={
          <ConfigPopoverWithTabs
            tabs={['Aggregated metric', 'Custom SQL metric']}
            content={[
              ({ onClose }) => (
                <ConfigSection>
                  {fields ? (
                    <MetricConigCreator
                      fields={fields}
                      metrics={metrics}
                      onCreate={(ms) => {
                        setBlock((draft) => {
                          if (draft.content) {
                            ;(draft as Editor.QueryBuilder).content!.metrics = {
                              ...metrics,
                              ...ms.reduce<{ [id: string]: Metric }>((obj, m) => {
                                const id = blockIdGenerator()
                                obj[id] = m
                                return obj
                              }, {})
                            }
                          }
                        })
                        onClose()
                      }}
                    />
                  ) : null}
                </ConfigSection>
              ),
              () => <ConfigSection>2</ConfigSection>
            ]}
          >
            <ConfigIconButton icon={IconCommonAdd} />
          </ConfigPopoverWithTabs>
        }
      >
        {Object.entries(metrics).map(([metricId, metric]) => (
          <div
            key={metricId}
            className={css`
              height: 32px;
              display: flex;
              align-items: center;
            `}
          >
            <ConfigInput
              value={metric.name}
              onChange={(name) => {
                setBlock((draft) => {
                  if ((draft as Editor.QueryBuilder).content?.metrics?.[metricId]) {
                    ;(draft as Editor.QueryBuilder).content!.metrics![metricId].name = name
                  }
                })
              }}
              className={css`
                flex: 1;
                font-style: normal;
                font-weight: normal;
                font-size: 12px;
                line-height: 14px;
                color: ${ThemingVariables.colors.text[0]};
              `}
            />
            <ConfigIconButton
              icon={IconCommonSub}
              onClick={() => {
                setBlock((draft) => {
                  if ((draft as Editor.QueryBuilder).content?.metrics) {
                    delete (draft as Editor.QueryBuilder).content!.metrics![metricId]
                  }
                })
              }}
              className={css`
                flex-shrink: 0;
              `}
            />
          </div>
        ))}
      </ConfigSection>
    </>
  )
}
