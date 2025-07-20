interface ActiveChat {
  userId: string;
  cashierId: string;
  chatId: string;
}

class ChatSessionManager {
  private userToChatMap = new Map<string, ActiveChat>(); // userId → session
  private chatToCashierMap = new Map<string, string>(); // chatId → cashierId
  private cashierToChatsMap = new Map<string, Set<string>>(); // cashierId → set<chatId>

  setSession(userId: string, cashierId: string, chatId: string) {
    this.userToChatMap.set(userId, { userId, cashierId, chatId });
    this.chatToCashierMap.set(chatId, cashierId);

    if (!this.cashierToChatsMap.has(cashierId)) {
      this.cashierToChatsMap.set(cashierId, new Set());
    }
    this.cashierToChatsMap.get(cashierId)?.add(chatId);
  }

  getSessionByUser(userId: string): ActiveChat | undefined {
    return this.userToChatMap.get(userId);
  }

  getCashierByChat(chatId: string): string | undefined {
    return this.chatToCashierMap.get(chatId);
  }

  getChatsByCashier(cashierId: string): string[] {
    return Array.from(this.cashierToChatsMap.get(cashierId) || []);
  }

  removeSession(userId: string) {
    const session = this.userToChatMap.get(userId);
    if (!session) return;

    this.userToChatMap.delete(userId);
    this.chatToCashierMap.delete(session.chatId);
    this.cashierToChatsMap.get(session.cashierId)?.delete(session.chatId);
  }
}

const chatSessionManager = new ChatSessionManager();
export default chatSessionManager;
