import pino from "pino";

import { NODE_ENV } from "./env";

const logger = pino({
  level: "debug",
});

/**
 * A simple logger abstraction that can be used to log messages in the console.
 *
 * You could interface with a logging service like Sentry or LogRocket here.
 */
export class Logger {
  static dev(...args: any[]) {
    if (NODE_ENV === "development") {
      logger.debug(args);
    }
  }
  static devError(...args: any[]) {
    if (NODE_ENV === "development") {
      logger.error(args);
    }
  }
  static log(...args: any[]) {
    logger.info(args);
  }
  static warn(...args: any[]) {
    logger.warn(args);
  }
  static info(...args: any[]) {
    logger.info(args);
  }
  static error(...args: any[]) {
    logger.error(args);
  }
}
