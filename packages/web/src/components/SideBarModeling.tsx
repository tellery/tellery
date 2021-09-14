import { IconCommonAdd } from '@app/assets/icons'
import { setBlockTranscation } from '@app/context/editorTranscations'
import { useBlock, useBlockSuspense, useSnapshot } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { Editor } from '@app/types'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { useCallback } from 'react'
import ConfigIconButton from './v11n/components/ConfigIconButton'
import { ConfigItem } from './v11n/components/ConfigItem'
import { ConfigPopoverWithTabs } from './v11n/components/ConfigPopoverWithTabs'
import { ConfigSection } from './v11n/components/ConfigSection'

export default function SideBarModeling(props: { storyId: string; blockId: string }) {
  const block = useBlockSuspense<Editor.VisualizationBlock>(props.blockId)
  const { data: queryBlock } = useBlock<Editor.QueryBlock>(block.content?.queryId!)
  const snapshot = useSnapshot(queryBlock?.content?.snapshotId)
  const commit = useCommit()
  const setBlock = useCallback(
    (update: (block: WritableDraft<Editor.VisualizationBlock>) => void) => {
      const oldBlock = block
      const newBlock = produce(oldBlock, update)
      commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId })
    },
    [block, commit, props.storyId]
  )

  return (
    <>
      <ConfigSection
        title="Metrics"
        border="bottom"
        right={
          <ConfigPopoverWithTabs
            tabs={['Aggregated metric', 'Custom SQL metric']}
            target={<ConfigIconButton icon={IconCommonAdd} />}
          >
            <ConfigSection>
              <ConfigItem label="Column">123</ConfigItem>
            </ConfigSection>
            <ConfigSection>2</ConfigSection>
          </ConfigPopoverWithTabs>
        }
      >
        3
      </ConfigSection>
    </>
  )
}
