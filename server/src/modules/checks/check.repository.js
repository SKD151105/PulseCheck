import { CheckLog } from "./check.model.js";

export const checkRepository = {
  create(data) {
    return CheckLog.create(data);
  },
};
