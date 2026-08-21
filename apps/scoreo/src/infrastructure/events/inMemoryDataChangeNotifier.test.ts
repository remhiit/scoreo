import { describe, expect, it, vi } from 'vitest'
import { InMemoryDataChangeNotifier } from './inMemoryDataChangeNotifier'

describe('InMemoryDataChangeNotifier', () => {
  it('calls subscribed listeners on notifyChanged', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    notifier.subscribe(listener)

    notifier.notifyChanged()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('supports multiple listeners', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listenerA = vi.fn()
    const listenerB = vi.fn()
    notifier.subscribe(listenerA)
    notifier.subscribe(listenerB)

    notifier.notifyChanged()

    expect(listenerA).toHaveBeenCalledTimes(1)
    expect(listenerB).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe stops further notifications', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    const unsubscribe = notifier.subscribe(listener)

    unsubscribe()
    notifier.notifyChanged()

    expect(listener).not.toHaveBeenCalled()
  })

  it('runMuted suppresses notifications raised inside it', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    notifier.subscribe(listener)

    notifier.runMuted(() => {
      notifier.notifyChanged()
    })

    expect(listener).not.toHaveBeenCalled()
  })

  it('runMuted returns the wrapped function result', () => {
    const notifier = new InMemoryDataChangeNotifier()

    const result = notifier.runMuted(() => 42)

    expect(result).toBe(42)
  })

  it('notifications resume once runMuted returns', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    notifier.subscribe(listener)

    notifier.runMuted(() => {
      notifier.notifyChanged()
    })
    notifier.notifyChanged()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('supports nested runMuted calls, only resuming after the outermost returns', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    notifier.subscribe(listener)

    notifier.runMuted(() => {
      notifier.runMuted(() => {
        notifier.notifyChanged()
      })
      notifier.notifyChanged()
    })
    notifier.notifyChanged()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('runMuted still unmutes when the wrapped function throws', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    notifier.subscribe(listener)

    expect(() =>
      notifier.runMuted(() => {
        throw new Error('boom')
      }),
    ).toThrow('boom')

    notifier.notifyChanged()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
