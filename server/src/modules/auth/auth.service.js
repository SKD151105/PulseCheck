import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authRepository } from "./auth.repository.js";
import { ApiError } from "../../utils/ApiError.js";

const buildToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      plan: user.plan,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      subject: user.id.toString(),
    }
  );

const serializeAuthUser = (user) => ({
  id: user.id,
  email: user.email,
  plan: user.plan,
});

export const authService = {
  async register(payload) {
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password?.trim();

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const existingUser = await authRepository.findByEmail(email);

    if (existingUser) {
      throw new ApiError(409, "Email is already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await authRepository.create({ email, password: hashedPassword });

    return {
      user: serializeAuthUser(user),
      token: buildToken(user),
    };
  },

  async login(payload) {
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password?.trim();

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new ApiError(401, "Invalid credentials");
    }

    return {
      user: serializeAuthUser(user),
      token: buildToken(user),
    };
  },

  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return serializeAuthUser(user);
  },
};
