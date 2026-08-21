import type { DataChangeListener, DataChangeNotifier } from '../../domain/port/dataChangeNotifier'

export class InMemoryDataChangeNotifier implements DataChangeNotifier {
  private readonly listeners = new Set<DataChangeListener>()
  private muteDepth = 0

  notifyChanged(): void {
    if (this.muteDepth > 0) return
    for (const listener of this.listeners) listener()
  }

  subscribe(listener: DataChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  runMuted<T>(fn: () => T): T {
    this.muteDepth += 1
    try {
      return fn()
    } finally {
      this.muteDepth -= 1
    }
  }
}
