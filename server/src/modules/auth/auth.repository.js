import { User } from "./auth.model.js";

export const authRepository = {
  create(data) {
    return User.create(data);
  },
  findByEmail(email) {
    return User.findOne({ email });
  },
  findById(id) {
    return User.findById(id);
  },
  incrementRefreshTokenVersion(id) {
    return User.findByIdAndUpdate(id, { $inc: { refreshTokenVersion: 1 } }, { returnDocument: "after" });
  },
  updateAlertPreferences(id, alertPreferences) {
    return User.findByIdAndUpdate(
      id,
      { alertPreferences },
      { returnDocument: "after", runValidators: true }
    );
  },
};
