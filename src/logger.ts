import winston from 'winston';
import path from 'path';
import { config } from './config.js';

// Ensure logs directory exists
import fs from 'fs';
const logDir = path.dirname(config.logging.logFile);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

export const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: config.logging.logFile,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

export default logger;