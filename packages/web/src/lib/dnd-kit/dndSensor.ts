import type {
  DistanceMeasurement,
  SensorContext,
  SensorInstance,
  SensorOptions,
  SensorProps,
  UniqueIdentifier
} from '@dnd-kit/core'
import type { Coordinates } from '@dnd-kit/core/dist/types'
import { subtract as getCoordinatesDelta } from '@dnd-kit/utilities'
import type { MouseEvent } from 'react'
import { getOwnerDocument } from '@app/utils'

export class Listeners {
  private listeners: {
    eventName: string
    handler: EventListenerOrEventListenerObject
  }[] = []

  // eslint-disable-next-line no-useless-constructor
  constructor(private target: HTMLElement | Document | Window) {}

  public add(
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | false
  ) {
    this.target.addEventListener(eventName, handler, options)
    this.listeners.push({ eventName, handler })
  }

  public removeAll() {
    this.listeners.forEach(({ eventName, handler }) => this.target.removeEventListener(eventName, handler))
  }
}

export function hasExceededDistance(delta: Coordinates, measurement: DistanceMeasurement): boolean {
  const dx = Math.abs(delta.x)
  const dy = Math.abs(delta.y)

  if (typeof measurement === 'number') {
    return Math.sqrt(dx ** 2 + dy ** 2) > measurement
  }

  if ('x' in measurement && 'y' in measurement) {
    return dx > measurement.x && dy > measurement.y
  }

  if ('x' in measurement) {
    return dx > measurement.x
  }

  if ('y' in measurement) {
    return dy > measurement.y
  }

  return false
}

export enum KeyboardCode {
  Space = 'Space',
  Down = 'ArrowDown',
  Right = 'ArrowRight',
  Left = 'ArrowLeft',
  Up = 'ArrowUp',
  Esc = 'Escape',
  Enter = 'Enter'
}

export type KeyboardCodes = {
  start: KeyboardEvent['code'][]
  cancel: KeyboardEvent['code'][]
  end: KeyboardEvent['code'][]
}

export type KeyboardCoordinateGetter = (
  event: KeyboardEvent,
  args: {
    active: UniqueIdentifier
    currentCoordinates: Coordinates
    context: SensorContext
  }
) => Coordinates | void

interface DistanceConstraint {
  distance: DistanceMeasurement
}

interface DelayConstraint {
  delay: number
  tolerance: DistanceMeasurement
}

interface EventDescriptor {
  name: keyof DocumentEventMap
  passive?: boolean
}

export interface PointerEventHandlers {
  move: EventDescriptor
  end: EventDescriptor
}

export type PointerActivationConstraint = DistanceConstraint | DelayConstraint

function isDistanceConstraint(constraint: PointerActivationConstraint): constraint is DistanceConstraint {
  return Boolean(constraint && 'distance' in constraint)
}

function isDelayConstraint(constraint: PointerActivationConstraint): constraint is DelayConstraint {
  return Boolean(constraint && 'delay' in constraint)
}

export interface AbstractPointerSensorOptions extends SensorOptions {
  activationConstraint?: PointerActivationConstraint
  onActivation?({ event }: { event: Event }): void
}

export type AbstractPointerSensorProps = SensorProps<AbstractPointerSensorOptions>

enum EventName {
  Keydown = 'keydown'
}

export function isMouseEvent(event: Event): event is globalThis.MouseEvent {
  return (window?.MouseEvent && event instanceof MouseEvent) || event.type.includes('mouse')
}

export function isTouchEvent(event: Event): event is TouchEvent {
  return window?.TouchEvent && event instanceof TouchEvent
}

export function getEventCoordinates(event: Event): Coordinates {
  if (isTouchEvent(event)) {
    if (event.touches && event.touches.length) {
      const { clientX: x, clientY: y } = event.touches[0]

      return {
        x,
        y
      }
    } else if (event.changedTouches && event.changedTouches.length) {
      const { clientX: x, clientY: y } = event.changedTouches[0]

      return {
        x,
        y
      }
    }
  }

  if (isMouseEvent(event)) {
    return {
      x: event.clientX,
      y: event.clientY
    }
  }

  return {
    x: 0,
    y: 0
  }
}

export function getEventListenerTarget(element: EventTarget | null): HTMLElement | Document {
  return element instanceof HTMLElement ? element : getOwnerDocument(element)
}

const events: PointerEventHandlers = {
  move: { name: 'dragover' },
  end: { name: 'drop' }
}

export class DndSensor implements SensorInstance {
  public autoScrollEnabled = true
  private activated: boolean = false
  private initialCoordinates: Coordinates
  // eslint-disable-next-line no-undef
  private timeoutId: NodeJS.Timeout | null = null
  private listeners: Listeners
  private ownerDocument: Document
  private props: AbstractPointerSensorProps
  private events: PointerEventHandlers

  constructor(props: MouseSensorProps) {
    const { event } = props
    this.props = props
    this.events = events
    this.ownerDocument = getOwnerDocument(event.target)
    this.listeners = new Listeners(getOwnerDocument(props.event.target))
    this.initialCoordinates = getEventCoordinates(event)
    this.handleStart = this.handleStart.bind(this)
    this.handleMove = this.handleMove.bind(this)
    this.handleEnd = this.handleEnd.bind(this)
    this.handleKeydown = this.handleKeydown.bind(this)

    this.attach()
  }

  private attach() {
    const {
      events,
      props: {
        options: { activationConstraint }
      }
    } = this

    this.listeners.add(events.move.name, this.handleMove, false)
    this.listeners.add(events.end.name, this.handleEnd)

    this.ownerDocument.addEventListener(EventName.Keydown, this.handleKeydown)

    if (activationConstraint) {
      if (isDistanceConstraint(activationConstraint)) {
        return
      }

      if (isDelayConstraint(activationConstraint)) {
        this.timeoutId = setTimeout(this.handleStart, activationConstraint.delay)
        return
      }
    }

    this.handleStart()
  }

  private detach() {
    this.listeners.removeAll()
    this.ownerDocument.removeEventListener(EventName.Keydown, this.handleKeydown)

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  private handleStart() {
    const { initialCoordinates } = this
    const { onStart } = this.props

    if (initialCoordinates) {
      this.activated = true

      onStart(initialCoordinates)
    }
  }

  private handleMove(event: Event) {
    const { activated, initialCoordinates, props } = this
    const {
      onMove,
      options: { activationConstraint }
    } = props

    if (!initialCoordinates) {
      return
    }

    const coordinates = getEventCoordinates(event)
    const delta = getCoordinatesDelta(initialCoordinates, coordinates)

    if (!activated && activationConstraint) {
      // Constraint validation
      if (isDelayConstraint(activationConstraint)) {
        if (hasExceededDistance(delta, activationConstraint.tolerance)) {
          return this.handleCancel()
        }

        return
      }

      if (isDistanceConstraint(activationConstraint)) {
        if (hasExceededDistance(delta, activationConstraint.distance)) {
          return this.handleStart()
        }

        return
      }
    }

    if (event.cancelable) {
      event.preventDefault()
    }

    onMove(coordinates)
  }

  private handleEnd() {
    const { onEnd } = this.props

    this.detach()
    onEnd()
  }

  private handleCancel() {
    const { onCancel } = this.props

    this.detach()
    onCancel()
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.code === KeyboardCode.Esc) {
      this.handleCancel()
    }
  }

  static activators = [
    {
      eventName: 'onDragEnter' as const,
      handler: ({ nativeEvent: event }: MouseEvent, { onActivation }: MouseSensorOptions) => {
        if (event.button === MouseButton.RightClick) {
          return false
        }

        onActivation?.({ event })

        return true
      }
    }
  ]
}

enum MouseButton {
  RightClick = 2
}

export interface MouseSensorOptions extends AbstractPointerSensorOptions {}

export type MouseSensorProps = SensorProps<MouseSensorOptions>
