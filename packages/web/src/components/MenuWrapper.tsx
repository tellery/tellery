import { ThemingVariables } from '@app/styles'
import styled from '@emotion/styled'

export const MenuWrapper = styled.div`
  background: ${ThemingVariables.colors.gray[5]};
  box-shadow: ${ThemingVariables.boxShadows[0]};
  border-radius: 8px;
  padding: 8px;
  width: 260px;
  display: block;
  cursor: pointer;
`
