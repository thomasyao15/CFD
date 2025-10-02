export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const currentLogLevel =
  process.env.LOG_LEVEL === "debug" ? LogLevel.DEBUG : LogLevel.INFO;

export const logger = {
  debug: (message: string, meta?: any) => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, meta !== undefined ? meta : "");
    }
  },

  info: (message: string, meta?: any) => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, meta !== undefined ? meta : "");
    }
  },

  warn: (message: string, meta?: any) => {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, meta !== undefined ? meta : "");
    }
  },

  error: (message: string, error?: any) => {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error !== undefined ? error : "");
    }
  },
};
