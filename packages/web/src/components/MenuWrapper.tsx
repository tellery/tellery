import { ThemingVariables } from '@app/styles'
import styled from '@emotion/styled'

export const MenuWrapper = styled.div<{ width?: number }>`
  background: ${ThemingVariables.colors.gray[5]};
  box-shadow: ${ThemingVariables.boxShadows[0]};
  border-radius: 8px;
  padding: 8px;
  width: ${(props) => props.width ?? 260}px;
  display: block;
  cursor: pointer;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
`
