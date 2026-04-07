import { AppError } from "../../shared/errors/app-error.js";
import { validateMessage } from "../../shared/validation/socket-schemas.js";
import { ChatRepository } from "./chat.repository.js";

export class ChatService {
  constructor(private readonly chatRepo: ChatRepository) {}

  sendMessage(groupIdInput: string, textInput: string, username: string) {
    const { groupId, text } = validateMessage(groupIdInput, textInput);
    if (!username) throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
    return this.chatRepo.createMessage(groupId, username, text, "chat");
  }

  getGroupSnapshot(groupId: string) {
    return {
      users: this.chatRepo.listMembers(groupId),
      history: this.chatRepo.listMessages(groupId),
    };
  }
}
