import argon2 from "argon2";
import { createUserRepository } from "./auth.repository.js";
import { createSessionService } from "./session.service.js";
import { loginUserSchema, registerUserSchema } from "./auth.schemas.js";
import { toPublicUser } from "./auth.types.js";
import type {
  AuthService,
  LoginService,
  PasswordHasher,
  PasswordVerifier,
  PublicUser,
  SessionService,
  UserLookupRepository,
  UserRepository,
} from "./auth.types.js";

export interface AuthServiceDependencies {
  passwordHasher?: PasswordHasher;
  passwordVerifier?: PasswordVerifier;
  sessionService?: SessionService;
  userLookupRepository?: UserLookupRepository;
  userRepository?: UserRepository;
}

const defaultPasswordHasher: PasswordHasher = {
  hash: (password) => argon2.hash(password),
};

const defaultPasswordVerifier: PasswordVerifier = {
  verify: (passwordHash, password) => argon2.verify(passwordHash, password),
};

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export function createAuthService({
  passwordHasher = defaultPasswordHasher,
  passwordVerifier = defaultPasswordVerifier,
  sessionService = createSessionService(),
  userLookupRepository = createUserRepository(),
  userRepository = createUserRepository(),
}: AuthServiceDependencies = {}): AuthService & LoginService {
  return {
    async registerUser(input): Promise<PublicUser> {
      const values = registerUserSchema.parse(input);
      const passwordHash = await passwordHasher.hash(values.password);
      const user = await userRepository.createUser({
        fullName: values.fullName,
        email: values.email,
        passwordHash,
      });

      return toPublicUser(user);
    },

    async loginUser(input) {
      const values = loginUserSchema.parse(input);
      const user = await userLookupRepository.findUserByEmail(values.email);

      if (!user) {
        throw new InvalidCredentialsError();
      }

      const passwordMatches = await passwordVerifier.verify(
        user.passwordHash,
        values.password,
      );

      if (!passwordMatches) {
        throw new InvalidCredentialsError();
      }

      const session = await sessionService.createSession(user.id);

      return {
        user: toPublicUser(user),
        sessionToken: session.token,
        expiresAt: session.expiresAt,
      };
    },
  };
}
