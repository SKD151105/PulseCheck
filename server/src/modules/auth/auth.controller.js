import { authService } from "./auth.service.js";

const isProduction = process.env.NODE_ENV === "production";
const REFRESH_COOKIE = "pulsecheck_refresh";

const setRefreshCookie = (res, token, rememberMe = true) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth",
  });
};

export const authController = {
  async register(req, res) {
    const data = await authService.register(req.body);
    setRefreshCookie(res, data.refreshToken, data.rememberMe);
    res.status(201).json({ user: data.user, token: data.token });
  },

  async login(req, res) {
    const data = await authService.login(req.body);
    setRefreshCookie(res, data.refreshToken, data.rememberMe);
    res.json({ user: data.user, token: data.token });
  },

  async google(req, res) {
    const data = await authService.googleAuth(req.body);
    setRefreshCookie(res, data.refreshToken, data.rememberMe);
    res.json({ user: data.user, token: data.token });
  },

  async me(req, res) {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ user });
  },

  async refresh(req, res) {
    const data = await authService.refreshSession(req.cookies?.[REFRESH_COOKIE]);
    res.json(data);
  },

  async logout(req, res) {
    await authService.logout(req.user?.id);
    clearRefreshCookie(res);
    res.status(204).send();
  },
};
