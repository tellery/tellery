import { ThemingVariables } from '@app/styles'
import styled from '@emotion/styled'

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

  :disabled,
  [aria-disabled] {
    pointer-events: auto !important;
    cursor: not-allowed !important;
  }
`
