import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface Config {
    factorial: {
        email: string;
        password: string;
        baseUrl: string;
    };
    browser: {
        headless: boolean;
        timeout: number;
        pageTimeout: number;
        navigationTimeout: number;
        elementTimeout: number;
    };
    workHours: {
        defaultHours: number;
        defaultStartTime: string;
        defaultEndTime: string;
        defaultBreakMinutes: number;
    };
    logging: {
        level: string;
        logFile: string;
    };
}

export const config: Config = {
    factorial: {
        email: process.env.FACTORIAL_EMAIL || '',
        password: process.env.FACTORIAL_PASSWORD || '',
        baseUrl: 'https://app.factorialhr.com'
    },
    browser: {
        headless: process.env.HEADLESS !== 'false',
        timeout: parseInt(process.env.BROWSER_TIMEOUT || '60000'),
        pageTimeout: parseInt(process.env.PAGE_TIMEOUT || '30000'),
        navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '60000'),
        elementTimeout: parseInt(process.env.ELEMENT_TIMEOUT || '20000')
    },
    workHours: {
        defaultHours: parseInt(process.env.DEFAULT_WORK_HOURS || '8'),
        defaultStartTime: process.env.DEFAULT_START_TIME || '09:00',
        defaultEndTime: process.env.DEFAULT_END_TIME || '17:00',
        defaultBreakMinutes: parseInt(process.env.DEFAULT_BREAK_MINUTES || '60')
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        logFile: process.env.LOG_FILE || 'logs/factorial-automation.log'
    }
};

export function validateConfig(): void {
    const errors: string[] = [];

    if (!config.factorial.email) {
        errors.push('FACTORIAL_EMAIL is required');
    }

    if (!config.factorial.password) {
        errors.push('FACTORIAL_PASSWORD is required');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
}