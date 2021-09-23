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
import { usePrevious } from '@app/hooks'
import { useBlockSuspense, useQuerySnapshot } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { useCallback, useEffect, useState } from 'react'
import IconButton from './kit/IconButton'
import { charts, useChart } from './v11n/charts'
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

const dimentionRange = {
  [Type.TABLE]: [0, Infinity],
  [Type.COMBO]: [1, 2],
  [Type.LINE]: [1, 2],
  [Type.BAR]: [1, 2],
  [Type.AREA]: [1, 2],
  [Type.PIE]: [1, 1],
  [Type.SCATTER]: [1, 3],
  [Type.NUMBER]: [0, 1]
}

const measureRange = {
  [Type.TABLE]: [0, Infinity],
  [Type.COMBO]: [1, Infinity],
  [Type.LINE]: [1, Infinity],
  [Type.BAR]: [1, Infinity],
  [Type.AREA]: [1, Infinity],
  [Type.PIE]: [1, 1],
  [Type.SCATTER]: [2, Infinity],
  [Type.NUMBER]: [1, 1]
}

export default function SideBarVisualization<T extends Type = Type>(props: { storyId: string; blockId: string }) {
  const block = useBlockSuspense<Editor.VisualizationBlock>(props.blockId)
  const config = block.content?.visualization
  const chart = useChart(config?.type || Type.TABLE)
  const queryBlock = useBlockSuspense<Editor.QueryBlock | Editor.SmartQueryBlock>(block.content?.queryId!)
  const snapshot = useQuerySnapshot(props.storyId, queryBlock.id)
  const dimentions =
    queryBlock.type === Editor.BlockType.SmartQuery
      ? (queryBlock as Editor.SmartQueryBlock).content.dimensions
      : undefined
  const metrics =
    queryBlock.type === Editor.BlockType.SmartQuery
      ? (queryBlock as Editor.SmartQueryBlock).content.metricIds
      : undefined

  const commit = useCommit()
  const setBlock = useCallback(
    (update: (block: WritableDraft<Editor.VisualizationBlock>) => void) => {
      const oldBlock = block
      const newBlock = produce(oldBlock, update)
      commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId })
    },
    [block, commit, props.storyId]
  )
  const [cache, setCache] = useState<{ [T in Type]?: Config<T> }>({})
  useEffect(() => {
    setCache({})
  }, [snapshot?.data?.fields])
  useEffect(() => {
    setCache((old) => (config ? { ...old, [config.type]: config } : old))
  }, [config])
  const handleConfigChange = useCallback(
    (
      key1: keyof Config<Type>,
      value1: Config<Type>[keyof Config<Type>],
      key2: keyof Config<Type>,
      value2: Config<Type>[keyof Config<Type>],
      key3: keyof Config<Type>,
      value3: Config<Type>[keyof Config<Type>]
    ) => {
      setBlock((draft) => {
        if (draft.content?.visualization) {
          if (key1) {
            draft.content.visualization[key1] = value1
          }
          if (key2) {
            draft.content.visualization[key2] = value2
          }
          if (key3) {
            draft.content.visualization[key3] = value3
          }
        }
      })
    },
    [setBlock]
  )
  const previousSnapshot = usePrevious(snapshot)
  useEffect(() => {
    if (snapshot && !previousSnapshot) {
      setBlock((draft) => {
        if (draft.content) {
          draft.content.visualization = charts[Type.TABLE].initializeConfig(snapshot.data, {})
        }
      })
    }
  }, [previousSnapshot, setBlock, snapshot])

  return (
    <>
      <div
        className={css`
          padding: 14px 8px 0;
        `}
      >
        {Object.values(Type).map((t) => (
          <IconButton
            key={t}
            icon={icons[t]}
            color={
              t === config?.type
                ? ThemingVariables.colors.text[0]
                : (!dimentions ||
                    (dimentionRange[t][0] <= dimentions.length && dimentions.length <= dimentionRange[t][1])) &&
                  (!metrics || (measureRange[t][0] <= metrics.length && metrics.length <= measureRange[t][1]))
                ? ThemingVariables.colors.text[0]
                : ThemingVariables.colors.gray[0]
            }
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
                if (draft.content) {
                  draft.content.visualization = snapshot?.data
                    ? (charts[t].initializeConfig(snapshot.data, cache) as Config<T>)
                    : undefined
                }
              })
            }}
          />
        ))}
      </div>
      {config && chart && chart.type === config.type && snapshot?.data ? (
        <chart.Configuration
          data={snapshot.data}
          config={config as never}
          onConfigChange={handleConfigChange as never}
        />
      ) : null}
    </>
  )
}
