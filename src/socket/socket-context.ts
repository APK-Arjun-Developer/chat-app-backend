export class SocketSessionStore {
  private readonly socketToUser = new Map<string, { userId: string; username: string }>();

  set(socketId: string, value: { userId: string; username: string }) {
    this.socketToUser.set(socketId, value);
  }

  get(socketId: string) {
    return this.socketToUser.get(socketId);
  }

  delete(socketId: string) {
    this.socketToUser.delete(socketId);
  }
}
