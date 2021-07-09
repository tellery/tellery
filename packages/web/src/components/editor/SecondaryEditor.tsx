import { css } from '@emotion/css'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { atom, useAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { IconCommonClose } from 'assets/icons'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { ThemingVariables } from 'styles'
import { DRAG_HANDLE_WIDTH } from '../../utils'
import { StoryEditor } from './StoryEditor'
import Icon from '../kit/Icon'

export const secondaryStoryIdState = atom<string | null>(null)

const _SecondaryEditor = () => {
  const [animating, setAnimating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [storyId, setStoryId] = useAtom(secondaryStoryIdState)
  const open = !!storyId
  const [resizeConfig, setResizeConfig] = useLocalStorage('SecondaryEditorConfig', {
    x: -400,
    docked: false
  })

  const x = useMotionValue(resizeConfig.x)
  const width = useTransform(x, (x) => {
    return Math.abs(x + 0.5 * DRAG_HANDLE_WIDTH)
  })

  useEffect(() => {
    const unsubscribe = x.onChange((x) => {
      if (!x) return
      setResizeConfig((config) => ({ ...config, x: x }))
    })
    return () => {
      unsubscribe()
    }
  }, [setResizeConfig, x])

  return (
    <>
      <motion.div
        initial={{ width: 0 }}
        animate={{
          width: open ? width.get() : 0
        }}
        transition={dragging ? { type: 'spring', duration: 0 } : { type: 'just' }}
        className={css`
          position: relative;
          height: 100%;
        `}
      >
        {open && (
          <motion.div
            title="drag to resize"
            dragMomentum={false}
            dragConstraints={{
              left: -700,
              right: -400
            }}
            drag={'x'}
            whileDrag={{ backgroundColor: ThemingVariables.colors.gray[1], opacity: 1 }}
            dragElastic={false}
            onDrag={() => {
              setDragging(true)
            }}
            onDragEnd={() => {
              setDragging(false)
            }}
            style={{ x: x }}
            whileHover={{
              backgroundColor: ThemingVariables.colors.gray[1],
              opacity: 1
            }}
            className={css`
              position: absolute;
              cursor: col-resize;
              top: 0;
              right: -${DRAG_HANDLE_WIDTH}px;
              height: 100%;
              z-index: 1000;
              width: ${DRAG_HANDLE_WIDTH}px;
              opacity: 0;
              display: block;
            `}

            // display: open && !animating ? 'block' : 'none'
          />
        )}

        <motion.div
          initial={{ translateX: width.get() }}
          animate={{
            translateX: open ? 0 : width.get()
          }}
          transition={{ type: 'just' }}
          style={{
            width: width
          }}
          className={css`
            position: absolute;
            right: 0;
            top: 0;
            height: 100%;
            border-left: 1px solid ${ThemingVariables.colors.gray[1]};
          `}
          onAnimationStart={() => setAnimating(true)}
          onAnimationComplete={() => setAnimating(false)}
        >
          <div
            className={css`
              height: 100%;
              display: flex;
              flex-direction: column;
            `}
          >
            <div
              className={css`
                padding: 12px;
                font-style: normal;
                font-weight: 500;
                font-size: 12px;
                line-height: 15px;
                color: ${ThemingVariables.colors.text[0]};
                box-shadow: 0px 1px 0px ${ThemingVariables.colors.gray[1]};
                z-index: 1;
                display: flex;
                align-items: center;
                flex: 0 0 44px;
              `}
            >
              <Icon
                icon={IconCommonClose}
                color={ThemingVariables.colors.text[0]}
                className={css`
                  cursor: pointer;
                  margin-right: 4px;
                  cursor: pointer;
                `}
                onClick={() => {
                  setStoryId(null)
                }}
              />
            </div>

            <div
              className={css`
                flex: 1;
                overflow-y: hidden;
              `}
            >
              {open && !animating && (
                <div
                  className={css`
                    padding: 10px 0 0 10px;
                    height: 100%;
                    > div {
                      margin-bottom: 10px;
                    }
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                  `}
                >
                  <div
                    className={css`
                      flex: 1 0;
                      position: relative;
                      height: 100%;
                      overflow: hidden;
                    `}
                  >
                    {storyId && (
                      <StoryEditor
                        storyId={storyId}
                        key={storyId}
                        className={css`
                          padding: 0 50px;
                        `}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

// export const SecondaryEditor = dynamic(() => Promise.resolve(_SecondaryEditor), {
//   ssr: false
// })

export const SecondaryEditor = _SecondaryEditor
