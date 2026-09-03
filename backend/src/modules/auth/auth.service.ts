import argon2 from "argon2";
import { createUserRepository } from "./auth.repository.js";
import { registerUserSchema } from "./auth.schemas.js";
import type {
  AuthService,
  PasswordHasher,
  PublicUser,
  UserRepository,
} from "./auth.types.js";

export interface AuthServiceDependencies {
  passwordHasher?: PasswordHasher;
  userRepository?: UserRepository;
}

const defaultPasswordHasher: PasswordHasher = {
  hash: (password) => argon2.hash(password),
};

export function createAuthService({
  passwordHasher = defaultPasswordHasher,
  userRepository = createUserRepository(),
}: AuthServiceDependencies = {}): AuthService {
  return {
    async registerUser(input): Promise<PublicUser> {
      const values = registerUserSchema.parse(input);
      const passwordHash = await passwordHasher.hash(values.password);
      const user = await userRepository.createUser({
        fullName: values.fullName,
        email: values.email,
        passwordHash,
      });

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
      };
    },
  };
}
