import { createLogger, format, transports } from 'winston';
import config from './config/index.ts';

const { combine, timestamp, printf, colorize, errors } = format;

const lineFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(errors({ stack: true }), timestamp(), lineFormat),
  transports: [
    // Colors only on the console so the log files stay free of ANSI codes.
    new transports.Console({
      format: combine(
        errors({ stack: true }),
        timestamp(),
        colorize(),
        lineFormat,
      ),
    }),
    new transports.File({
      filename: `${config.logDir}/error.log`,
      level: 'error',
    }),
    new transports.File({ filename: `${config.logDir}/combined.log` }),
  ],
});

export default logger;
