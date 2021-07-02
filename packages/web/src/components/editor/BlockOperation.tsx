import styled from '@emotion/styled'
import { ThemingVariables } from 'styles'

export const BlockOperation = styled.div<{ padding: number }>`
  display: flex;
  padding: ${(props) => props.padding}px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  :hover {
    background-color: ${ThemingVariables.colors.primary[5]};
  }
`
