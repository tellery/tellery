import { useDimensions } from '@app/hooks/useDimensions'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import { useMemo, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useChart } from './charts'
import type { Config, Data, Type } from './types'

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

export const Diagram = (props: {
  className?: string
  data: Data | undefined
  config: Config<Type> | undefined
  dimensions?: { width: number; height: number }
}) => {
  const chart = useChart(props.config?.type)
  const ref = useRef<HTMLDivElement>(null)
  const nativeDimensions = useDimensions(ref, 0, !props.dimensions)
  const chartDimensions = props.dimensions ?? nativeDimensions

  const diagram = useMemo(() => {
    return chart && props.data ? (
      <chart.Diagram dimensions={chartDimensions} data={props.data} config={props.config as never} />
    ) : null
  }, [chart, props.data, chartDimensions, props.config])

  return (
    <div ref={ref} className={props.className}>
      <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[props.config, props.data, chart]}>
        {props.config && props.data && chart ? diagram : null}
      </ErrorBoundary>
    </div>
  )
}
