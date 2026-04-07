import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
import { validateCredentials } from "../../shared/validation/socket-schemas.js";
import { AuthRepository } from "./auth.repository.js";

export class AuthService {
  constructor(private readonly authRepo: AuthRepository) {}

  async register(usernameInput: string, passwordInput: string, socketId: string) {
    const { username, password } = validateCredentials(usernameInput, passwordInput);

    const exists = this.authRepo.findByUsername(username);
    if (exists) throw new AppError("USERNAME_TAKEN", "Username already exists", 409);

    const hash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    return this.authRepo.createUser(username, hash, socketId);
  }

  async login(usernameInput: string, passwordInput: string, socketId: string) {
    const { username, password } = validateCredentials(usernameInput, passwordInput);
    const user = this.authRepo.findByUsername(username);
    if (!user) throw new AppError("AUTH_INVALID", "Invalid username or password", 401);

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new AppError("AUTH_INVALID", "Invalid username or password", 401);

    this.authRepo.updateSocket(user.id, socketId);
    return user;
  }
}
