import { css } from '@emotion/css'
import React from 'react'

export const CircularLoading = ({ size, color, scale = 0.5 }: { size: number; color: string; scale?: number }) => {
  return (
    <div
      style={{ '--size': `${size}px`, '--color': color, '--scale': scale } as React.CSSProperties}
      className={css`
        display: inline-block;
        position: relative;
        width: var(--size);
        height: var(--size);
        flex-shrink: 0;
        div {
          box-sizing: border-box;
          display: block;
          position: absolute;
          width: calc(var(--size) * var(--scale));
          height: calc(var(--size) * var(--scale));
          border-width: calc(var(--size) / 12);
          border-style: solid;
          border-radius: 50%;
          left: 0;
          margin: auto;
          top: 0;
          right: 0;
          bottom: 0;
          animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          border-color: var(--color) transparent transparent transparent;
        }
        div:nth-child(1) {
          animation-delay: -0.45s;
        }
        div:nth-child(2) {
          animation-delay: -0.3s;
        }
        div:nth-child(3) {
          animation-delay: -0.15s;
        }
        @keyframes lds-ring {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}
    >
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}
