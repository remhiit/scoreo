export type DataChangeListener = () => void

export interface DataChangeNotifier {
  notifyChanged(): void
  subscribe(listener: DataChangeListener): () => void
  runMuted<T>(fn: () => T): T
}
