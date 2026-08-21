import type { ConnectivityChecker } from '../../domain/port/connectivityChecker'

export class BrowserConnectivityChecker implements ConnectivityChecker {
  isOnline(): boolean {
    return navigator.onLine
  }
}
