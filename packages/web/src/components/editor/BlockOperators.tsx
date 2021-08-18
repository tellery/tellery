import { css } from '@emotion/css'
import { motion } from 'framer-motion'
import type { User } from '@app/hooks/api'
import React from 'react'
import { useBlockOperators } from './hooks/useStoryOperatorsProvider'
import Avatar from '../Avatar'

export const OperatorsAvatar: React.FC<{ blockId: string }> = ({ blockId }) => {
  const operators = useBlockOperators(blockId)
  return (
    <div
      className={css`
        position: absolute;
        left: 0;
        transform: translateX(-120px);
        width: 60px;
        top: 0;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        transition: opacity 0.35s;
      `}
    >
      {operators.slice(0, 3).map((operator) => {
        if (!operator) return null
        return <Operator key={operator.id} operator={operator} />
      })}
    </div>
  )
}

const spring = {
  type: 'spring',
  stiffness: 500,
  damping: 30
}

export const Operator = (props: { operator: User }) => {
  return (
    <motion.div
      layoutId={props?.operator.id}
      className={css`
        flex-shrink: 0;
        height: 30px;
        width: 30px;
        border-radius: 100%;
        overflow: hidden;
      `}
      transition={spring}
    >
      <Avatar
        src={props.operator.avatar}
        name={props.operator.name}
        size={30}
        className={css`
          height: 100%;
          width: 100%;
        `}
      />
    </motion.div>
  )
}
