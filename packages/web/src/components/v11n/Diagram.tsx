import { setBlockTranscation } from '@app/context/editorTranscations'
import { useBlock } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useDimensions } from '@app/hooks/useDimensions'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { useCallback, useMemo, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useChart } from './charts'
import { Config, Data, Type } from './types'
import { throttle } from 'lodash'

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div
      role="alert"
      className={css`
        background: ${ThemingVariables.colors.negative[1]};
        padding: 20px;
        border-radius: 10px;
        height: 100%;
      `}
    >
      <p>Failed to display this diagram:</p>
      <pre>{error.message}</pre>
    </div>
  )
}

export function Diagram(props: {
  className?: string
  storyId: string
  blockId: string
  data: Data | undefined
  config: Config<Type> | undefined
  dimensions?: { width: number; height: number }
}) {
  const chart = useChart(props.config?.type ?? Type.TABLE)
  const ref = useRef<HTMLDivElement>(null)
  const nativeDimensions = useDimensions(ref, 0, !props.dimensions)
  const chartDimensions = props.dimensions ?? nativeDimensions
  const commit = useCommit()
  const { data: block } = useBlock<Editor.VisualizationBlock>(props.blockId)
  const setBlock = useCallback(
    (update: (block: WritableDraft<Editor.VisualizationBlock>) => void) => {
      const oldBlock = block
      if (oldBlock) {
        const newBlock = produce(oldBlock, throttle(update, 500))
        commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId })
      }
    },
    [block, commit, props.storyId]
  )
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
  const diagram = useMemo(() => {
    return chart && props.data ? (
      <chart.Diagram
        dimensions={chartDimensions}
        data={props.data}
        config={props.config as never}
        onConfigChange={handleConfigChange as never}
      />
    ) : null
  }, [chart, props.data, chartDimensions, props.config, handleConfigChange])

  return (
    <div ref={ref} className={props.className}>
      <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[props.config, props.data, chart]}>
        {props.config && props.data && chart ? diagram : null}
      </ErrorBoundary>
    </div>
  )
}
