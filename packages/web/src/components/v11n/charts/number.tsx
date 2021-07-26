import { css } from '@emotion/css'
import { useMemo } from 'react'
import numeral from 'numeral'

import type { Chart } from './base'
import { Type } from '../types'
import { formatRecord, isNumeric } from '../utils'
import { ConfigLabel } from '../components/ConfigLabel'
import { ConfigSelect } from '../components/ConfigSelect'
import { ThemingVariables } from '@app/styles'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import { useDataRecords } from '@app/hooks/useDataRecords'

export const number: Chart<Type.NUMBER> = {
  type: Type.NUMBER,

  initializeConfig(data, cache) {
    if (cache[Type.NUMBER]) {
      return cache[Type.NUMBER]!
    }
    const field = data.fields.find(({ displayType }) => isNumeric(displayType))
    return {
      type: Type.NUMBER,

      columns: data.fields.map(({ name }) => name),
      label: field?.name || '',
      field: field?.name || ''
    }
  },

  Configuration(props) {
    const { onConfigChange } = props

    return (
      <div
        className={css`
          padding: 20px;
          width: 225px;
        `}
      >
        <ConfigLabel top={0}>Value</ConfigLabel>
        <ConfigSelect
          options={props.config.columns}
          value={props.config.field}
          onChange={(field) => {
            onConfigChange('field', field)
          }}
          placeholder="Please select"
        />
      </div>
    )
  },

  Diagram(props) {
    const records = useDataRecords(props.data)
    const displayTypes = useDataFieldsDisplayType(props.data.fields)
    const fontSize = window.innerWidth / 32
    const maxChar = (props.dimensions.width / fontSize) * 1.8
    const number = useMemo(() => {
      const num = records[0]?.[props.config.field]
      if (!props.config?.field || num === undefined || typeof num !== 'number') {
        return ''
      }
      const str = formatRecord(num, displayTypes[props.config.field])
      if (str.length - maxChar <= 0) {
        return str
      }
      const shortest = numeral(num).format('0a')
      if (maxChar <= shortest.length + 2) {
        return shortest.toUpperCase()
      }
      return numeral(num).format('0[.][0]a').toUpperCase()
    }, [displayTypes, maxChar, props.config.field, records])

    return (
      <div
        className={css`
          height: 100%;
          flex-direction: column;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        <span
          className={css`
            max-width: 100%;
            color: ${ThemingVariables.colors.text[0]};
            white-space: nowrap;
            overflow: hidden;
            line-height: 1;
          `}
          style={{ fontSize }}
        >
          {number}
        </span>
      </div>
    )
  }
}
