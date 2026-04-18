import { authService } from "./auth.service.js";

export const authController = {
  async register(req, res) {
    const data = await authService.register(req.body);
    res.status(201).json(data);
  },

  async login(req, res) {
    const data = await authService.login(req.body);
    res.json(data);
  },

  async me(req, res) {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ user });
  },
};
