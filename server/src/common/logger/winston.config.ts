// common/logger/winston.config.ts
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

const getLogsDir = (): string => {
  const appLogsDir = path.join(process.cwd(), 'logs');

  if (process.env.NODE_ENV === 'production') {
    try {
      if (!fs.existsSync(appLogsDir)) {
        fs.mkdirSync(appLogsDir, { recursive: true });
      }
      const testFile = path.join(appLogsDir, '.test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return appLogsDir;
    } catch {
      console.warn('Cannot write to /app/logs, using /tmp/logs');
      const tmpLogsDir = path.join('/tmp', 'logs');
      if (!fs.existsSync(tmpLogsDir)) {
        fs.mkdirSync(tmpLogsDir, { recursive: true });
      }
      return tmpLogsDir;
    }
  }

  return appLogsDir;
};

const logsDir = getLogsDir();

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  }),
);

export const winstonConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console - inchangée, garde le format coloré natif
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info',
    }),
    // Fichier unique - tous niveaux <= level confondus (info, warn, error, ...)
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: process.env.LOG_LEVEL || 'info',
    }),
  ],
};
