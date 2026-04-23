import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authRepository } from "./auth.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import { logger } from "../../utils/logger.js";

const buildAccessToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      plan: user.plan,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
      subject: user.id.toString(),
    }
  );

const buildRefreshToken = (user, rememberMe = true) =>
  jwt.sign(
    {
      tokenVersion: user.refreshTokenVersion ?? 0,
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: rememberMe ? "30d" : "1d",
      subject: user.id.toString(),
    }
  );

const buildAuthResponse = (user, rememberMe = true) => ({
  user: serializeAuthUser(user),
  token: buildAccessToken(user),
  refreshToken: buildRefreshToken(user, rememberMe),
  rememberMe,
});

const serializeAuthUser = (user) => ({
  id: user.id,
  email: user.email,
  plan: user.plan,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionCancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
  subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
  alertPreferences: {
    enabled: user.alertPreferences?.enabled ?? true,
    email: user.alertPreferences?.email || "",
  },
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
      logger.warn("Registration blocked for duplicate email", { email });
      throw new ApiError(409, "Email is already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await authRepository.create({ email, password: hashedPassword });
    logger.info("User registered", { userId: user.id, email: user.email });

    return buildAuthResponse(user, true);
  },

  async login(payload) {
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password?.trim();

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await authRepository.findByEmail(email);

    if (!user) {
      logger.warn("Login failed: user not found", { email });
      throw new ApiError(401, "Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      logger.warn("Login failed: invalid password", { userId: user.id, email: user.email });
      throw new ApiError(401, "Invalid credentials");
    }

    logger.info("User logged in", { userId: user.id, email: user.email });

    return buildAuthResponse(user, payload.rememberMe !== false);
  },

  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      logger.warn("Current user lookup failed", { userId });
      throw new ApiError(404, "User not found");
    }

    return serializeAuthUser(user);
  },

  async refreshSession(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(401, "Refresh token required");
    }

    let payload;

    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await authRepository.findById(payload.sub);

    if (!user || payload.tokenVersion !== (user.refreshTokenVersion ?? 0)) {
      throw new ApiError(401, "Invalid refresh token");
    }

    return {
      user: serializeAuthUser(user),
      token: buildAccessToken(user),
    };
  },

  async logout(userId) {
    if (userId) {
      await authRepository.incrementRefreshTokenVersion(userId);
    }
  },
};
