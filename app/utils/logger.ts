import { NODE_ENV } from "./env";

/* eslint-disable no-console */
/**
 * A simple logger abstraction that can be used to log messages in the console.
 *
 * You could interface with a logging service like Sentry or LogRocket here.
 */
export class Logger {
  static dev(...args: any[]) {
    if (NODE_ENV === "development") {
      console.debug(...args);
    }
  }
  static log(...args: any[]) {
    console.log(...args);
  }
  static warn(...args: any[]) {
    console.warn(...args);
  }
  static info(...args: any[]) {
    console.info(...args);
  }
  static error(error: unknown, ...args: unknown[]) {
    console.error(JSON.stringify(error, null, 2), ...args);
  }
}
