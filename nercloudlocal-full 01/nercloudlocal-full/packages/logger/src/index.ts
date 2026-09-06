type Meta = Record<string, unknown>;

function write(level: string, message: string, meta?: Meta) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {})
  };
  const output = JSON.stringify(payload);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  info: (message: string, meta?: Meta) => write("info", message, meta),
  warn: (message: string, meta?: Meta) => write("warn", message, meta),
  error: (message: string, meta?: Meta) => write("error", message, meta),
  debug: (message: string, meta?: Meta) => {
    if (process.env.NODE_ENV !== "production") write("debug", message, meta);
  }
};
