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
  authProvider: user.authProvider,
  profileImage: user.profileImage,
  plan: user.plan,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionCancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
  subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
  alertPreferences: {
    enabled: user.alertPreferences?.enabled ?? true,
    email: user.alertPreferences?.email || "",
  },
});

const ensureGoogleClientId = () => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, "Google OAuth is not configured");
  }
};

const verifyGoogleCredential = async (credential) => {
  ensureGoogleClientId();

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);

  if (!response.ok) {
    throw new ApiError(401, "Invalid Google credential");
  }

  const payload = await response.json();

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(401, "Google credential audience mismatch");
  }

  if (!payload.email || payload.email_verified !== "true") {
    throw new ApiError(401, "Google account email is not verified");
  }

  return payload;
};

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
    const user = await authRepository.create({
      email,
      password: hashedPassword,
      authProvider: "local",
    });
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

    if (user.authProvider === "google" || !user.password) {
      throw new ApiError(409, "This account uses Google sign-in");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      logger.warn("Login failed: invalid password", { userId: user.id, email: user.email });
      throw new ApiError(401, "Invalid credentials");
    }

    logger.info("User logged in", { userId: user.id, email: user.email });

    return buildAuthResponse(user, payload.rememberMe !== false);
  },

  async googleAuth(payload) {
    const { credential, intent = "login" } = payload || {};

    if (!credential) {
      throw new ApiError(400, "Google credential is required");
    }

    if (!["login", "register"].includes(intent)) {
      throw new ApiError(400, "Invalid Google auth intent");
    }

    const googlePayload = await verifyGoogleCredential(credential);
    const email = googlePayload.email.toLowerCase();
    const googleId = googlePayload.sub;

    let user = await authRepository.findByEmail(email);

    if (intent === "login" && !user) {
      throw new ApiError(404, "No Google account found for this email. Sign up with Google first.");
    }

    if (!user) {
      user = await authRepository.create({
        email,
        googleId,
        authProvider: "google",
        profileImage: googlePayload.picture || null,
      });
      logger.info("User registered via Google", { userId: user.id, email: user.email });
    } else if (user.authProvider !== "google") {
      throw new ApiError(409, "An account with this email already exists. Sign in with email and password.");
    } else if (user.googleId && user.googleId !== googleId) {
      throw new ApiError(409, "Google account does not match the existing user");
    }

    logger.info("User signed in with Google", { userId: user.id, email: user.email });

    return buildAuthResponse(user, true);
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
