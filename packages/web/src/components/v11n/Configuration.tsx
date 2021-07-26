import { useCallback, useEffect, useState } from 'react'
import { css, cx } from '@emotion/css'

import { Config, Data, Type } from './types'
import { charts, useChart } from './charts/index'
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
import { Diagram } from './Diagram'
import { ThemingVariables } from '@app/styles'
import IconButton from '@app/components/kit/IconButton'

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

export function Configuration<T extends Type = Type>(props: {
  className?: string
  data: Data | undefined
  config: Config<T> | undefined
  onConfigChange: (config: Config<T> | undefined | ((config: Config<T> | undefined) => Config<T> | undefined)) => void
}) {
  const chart = useChart(props.config?.type || Type.TABLE)
  const { onConfigChange } = props
  const handleConfigChange = useCallback(
    (
      key1: keyof Config<Type>,
      value1: Config<Type>[keyof Config<Type>],
      key2: keyof Config<Type>,
      value2: Config<Type>[keyof Config<Type>],
      key3: keyof Config<Type>,
      value3: Config<Type>[keyof Config<Type>]
    ) => {
      onConfigChange((old) =>
        old
          ? {
              ...old,
              ...(key1
                ? {
                    [key1]: value1
                  }
                : {}),
              ...(key2
                ? {
                    [key2]: value2
                  }
                : {}),
              ...(key3
                ? {
                    [key3]: value3
                  }
                : {})
            }
          : undefined
      )
    },
    [onConfigChange]
  )
  const [cache, setCache] = useState<{ [T in Type]?: Config<T> }>({})
  useEffect(() => {
    setCache({})
  }, [props.data?.fields])
  useEffect(() => {
    setCache((old) => (props.config ? { ...old, [props.config.type]: props.config } : old))
  }, [props.config])

  return (
    <div
      className={cx(
        props.className,
        css`
          display: flex;
          overflow-y: hidden;
        `
      )}
    >
      <div
        className={css`
          flex-shrink: 0;
          overflow-y: auto;
          width: 206px;
          padding: 10px;
          overflow: hidden;
        `}
      >
        {Object.values(Type).map((t) => (
          <IconButton
            key={t}
            icon={icons[t]}
            color={t === props.config?.type ? ThemingVariables.colors.gray[5] : ThemingVariables.colors.primary[1]}
            className={css`
              margin: 5px;
              border-radius: 8px;
              height: 52px;
              width: 52px;
              background: ${ThemingVariables.colors.primary[t === props.config?.type ? 1 : 4]};
              color: ${ThemingVariables.colors.gray[t === props.config?.type ? 5 : 0]};
              display: inline-flex;
              align-items: center;
              justify-content: center;
            `}
            onClick={() => {
              onConfigChange(props.data ? (charts[t].initializeConfig(props.data, cache) as Config<T>) : undefined)
            }}
          />
        ))}
      </div>
      <div
        className={css`
          flex-shrink: 0;
          height: 100%;
          box-shadow: -1px 0px 0px ${ThemingVariables.colors.gray[1]};
        `}
      >
        {props.config && chart && chart.type === props.config.type && props.data ? (
          <chart.Configuration
            data={props.data}
            config={props.config as never}
            onConfigChange={handleConfigChange as never}
          />
        ) : null}
      </div>
      <Diagram
        className={css`
          box-shadow: -1px 0px 0px ${ThemingVariables.colors.gray[1]};
          height: 100%;
          flex: 1;
          width: 0;
          padding: 20px;
        `}
        data={props.data}
        config={props.config}
      />
    </div>
  )
}
