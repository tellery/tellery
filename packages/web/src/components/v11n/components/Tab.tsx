import { ThemingVariables } from '@app/styles'
import styled from '@emotion/styled'

export const StyledTabPanel = styled.div`
  height: 100%;
  overflow-y: auto;
`

export const SideBarTabHeader = styled.button<{ selected: boolean }>`
  font-style: normal;
  font-weight: 500;
  height: 40px;
  font-size: 12px;
  color: ${ThemingVariables.colors.text[1]};
  background: transparent;
  border: none;
  margin-left: 16px;
  padding: 0;
  cursor: pointer;
  color: ${(props) => (props.selected ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[2])};
`
