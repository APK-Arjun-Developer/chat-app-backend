import { AppError } from "../../shared/errors/app-error.js";
import { validateGroupId, validateGroupName } from "../../shared/validation/socket-schemas.js";
import { GroupRepository } from "./group.repository.js";

export class GroupService {
  constructor(private readonly groupRepo: GroupRepository) {}

  createGroup(groupNameInput: string, userId: string) {
    const { groupName } = validateGroupName(groupNameInput);
    return this.groupRepo.create(groupName, userId);
  }

  joinGroup(groupIdInput: string, userId: string) {
    const { groupId } = validateGroupId(groupIdInput);
    const group = this.groupRepo.findById(groupId);
    if (!group) throw new AppError("GROUP_NOT_FOUND", "Group not found", 404);

    const joinedNow = this.groupRepo.ensureMembership(groupId, userId);
    return { group, joinedNow };
  }

  getUserGroups(userId: string) {
    const all = this.groupRepo.findAllGroups();
    const joined = this.groupRepo.findJoinedByUser(userId);
    const joinedIds = new Set(joined.map((g) => g.id));
    const available = all.filter((g) => !joinedIds.has(g.id));
    return { available, joined };
  }
}
