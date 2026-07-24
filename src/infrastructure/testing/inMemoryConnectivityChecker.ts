import type { ConnectivityChecker } from '../../domain/port/connectivityChecker'

export class InMemoryConnectivityChecker implements ConnectivityChecker {
  private online = true

  setOnline(online: boolean): void {
    this.online = online
  }

  isOnline(): boolean {
    return this.online
  }
}
