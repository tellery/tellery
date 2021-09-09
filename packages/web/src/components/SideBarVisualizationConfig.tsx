import {
  IconVisualizationTable,
  IconVisualizationCombo,
  IconVisualizationLine,
  IconVisualizationBar,
  IconVisualizationArea,
  IconVisualizationPie,
  IconVisualizationScatter,
  IconVisualizationNumber
} from '@app/assets/icons'
import { setBlockTranscation } from '@app/context/editorTranscations'
import { useBlock, useBlockSuspense, useSnapshot } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { useCallback, useEffect, useState } from 'react'
import IconButton from './kit/IconButton'
import { charts } from './v11n/charts'
import { Config, Type } from './v11n/types'

const icons = {
  [Type.TABLE]: IconVisualizationTable,
  [Type.COMBO]: IconVisualizationCombo,
  [Type.LINE]: IconVisualizationLine,
  [Type.BAR]: IconVisualizationBar,
  [Type.AREA]: IconVisualizationArea,
  [Type.PIE]: IconVisualizationPie,
  [Type.SCATTER]: IconVisualizationScatter,
  [Type.NUMBER]: IconVisualizationNumber
}

export default function SideBarVisualizationConfig<T extends Type = Type>(props: { storyId: string; blockId: string }) {
  const block = useBlockSuspense<Editor.VisualizationBlock>(props.blockId)
  const { data: queryBlock } = useBlock<Editor.QueryBlock>(block.content?.queryId!)
  const snapshot = useSnapshot(queryBlock?.content?.snapshotId)
  const commit = useCommit()
  const config = block?.content?.visualization
  const [cache, setCache] = useState<{ [T in Type]?: Config<T> }>({})
  useEffect(() => {
    setCache({})
  }, [snapshot?.data?.fields])
  useEffect(() => {
    setCache((old) => (config ? { ...old, [config.type]: config } : old))
  }, [config])
  const setBlock = useCallback(
    (update: (block: WritableDraft<Editor.VisualizationBlock>) => void) => {
      const oldBlock = block
      const newBlock = produce(oldBlock, update)
      commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId })
    },
    [block, commit, props.storyId]
  )

  return (
    <div
      className={css`
        padding: 14px 8px;
      `}
    >
      {Object.values(Type).map((t) => (
        <IconButton
          key={t}
          icon={icons[t]}
          color={t === config?.type ? ThemingVariables.colors.primary[1] : ThemingVariables.colors.gray[0]}
          className={css`
            margin: 2px;
            border-radius: 8px;
            height: 32px;
            width: 32px;
            background: ${t === config?.type ? ThemingVariables.colors.primary[4] : undefined};
            display: inline-flex;
            align-items: center;
            justify-content: center;
          `}
          onClick={() => {
            if (t === config?.type) {
              return
            }
            setBlock((draft) => {
              if (draft?.content) {
                draft.content.visualization = snapshot?.data
                  ? (charts[t].initializeConfig(snapshot.data, cache) as Config<T>)
                  : undefined
              }
            })
          }}
        />
      ))}
    </div>
  )
}
