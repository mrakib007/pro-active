import pino, { type Logger } from "pino";
import { config, type AppConfig } from "./config.js";

export function createLogger(appConfig: AppConfig = config): Logger {
  return pino({ level: appConfig.LOG_LEVEL });
}

export const logger = createLogger();
