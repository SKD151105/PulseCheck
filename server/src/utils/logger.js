const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const activeLevel = levels[(process.env.LOG_LEVEL || "info").toLowerCase()] ?? levels.info;

const serializeMeta = (meta) => {
  if (!meta) {
    return "";
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [unserializable-meta]";
  }
};

const write = (level, message, meta) => {
  if (levels[level] > activeLevel) {
    return;
  }

  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${serializeMeta(meta)}`;
  const writer = level === "error" ? console.error : console.log;
  writer(line);
};

export const logger = {
  error(message, meta) {
    write("error", message, meta);
  },
  warn(message, meta) {
    write("warn", message, meta);
  },
  info(message, meta) {
    write("info", message, meta);
  },
  debug(message, meta) {
    write("debug", message, meta);
  },
};
