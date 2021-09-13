import { ThemingVariables } from '@app/styles'
import styled from '@emotion/styled'

const ConfigIconButton = styled.button`
  width: 32px;
  height: 32px;
  padding: 6px;
  border-radius: 4px;
  outline: none;
  border: none;
  background-color: transparent;
  :hover {
    cursor: pointer;
    background-color: ${ThemingVariables.colors.primary[5]};
  }
`

export default ConfigIconButton
