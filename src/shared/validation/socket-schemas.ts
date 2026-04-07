import { AppError } from "../errors/app-error.js";

export const validateCredentials = (usernameInput: string, passwordInput: string) => {
  const username = usernameInput?.trim();
  const password = passwordInput?.trim();

  if (!username || username.length < 3 || username.length > 30) {
    throw new AppError("VALIDATION_ERROR", "Username must be 3-30 characters", 422);
  }
  if (!password || password.length < 6 || password.length > 100) {
    throw new AppError("VALIDATION_ERROR", "Password must be 6-100 characters", 422);
  }

  return { username, password };
};

export const validateGroupName = (groupNameInput: string) => {
  const groupName = groupNameInput?.trim();
  if (!groupName || groupName.length < 2 || groupName.length > 60) {
    throw new AppError("VALIDATION_ERROR", "Group name must be 2-60 characters", 422);
  }
  return { groupName };
};

export const validateGroupId = (groupIdInput: string) => {
  const groupId = groupIdInput?.trim();
  if (!groupId || groupId.length < 3) {
    throw new AppError("VALIDATION_ERROR", "Invalid group id", 422);
  }
  return { groupId };
};

export const validateMessage = (groupIdInput: string, textInput: string) => {
  const { groupId } = validateGroupId(groupIdInput);
  const text = textInput?.trim();
  if (!text || text.length > 1000) {
    throw new AppError("VALIDATION_ERROR", "Message must be 1-1000 characters", 422);
  }

  return { groupId, text };
};
