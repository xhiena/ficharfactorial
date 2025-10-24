#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { FactorialAutomation } from './factorial-automation.js';
import { TimeTracker, WorkEntry } from './time-tracker.js';
import { config, validateConfig } from './config.js';
import logger from './logger.js';

const program = new Command();

program
    .name('factorial-time-tracker')
    .description('Automate time tracking in Factorial HR')
    .version('1.0.0')
    .option('--verbose', 'Enable verbose logging')
    .hook('preAction', (thisCommand) => {
        const options = thisCommand.opts();
        if (options.verbose) {
            process.env.LOG_LEVEL = 'debug';
        }
    });

program
    .command('login')
    .description('Test login to Factorial')
    .action(async () => {
        console.log(chalk.blue('🚀 Testing Factorial login...'));

        const automation = new FactorialAutomation();

        try {
            validateConfig();
            await automation.initialize();

            const loginSuccess = await automation.login();

            if (loginSuccess) {
                console.log(chalk.green('✅ Login successful!'));
            } else {
                console.log(chalk.red('❌ Login failed'));
                process.exit(1);
            }

        } catch (error) {
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        } finally {
            await automation.cleanup();
        }
    });

program
    .command('log-today')
    .description('Log work hours for today')
    .option('-s, --start <time>', 'Start time (HH:MM)', config.workHours.defaultStartTime)
    .option('-e, --end <time>', 'End time (HH:MM)', config.workHours.defaultEndTime)
    .option('-b, --break <minutes>', 'Break time in minutes', config.workHours.defaultBreakMinutes.toString())
    .option('-d, --description <text>', 'Work description')
    .action(async (options) => {
        console.log(chalk.blue('🕐 Logging today\'s work hours...'));

        const automation = new FactorialAutomation();

        try {
            validateConfig();
            await automation.initialize();

            const loginSuccess = await automation.login();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            await automation.navigateToTimeTracking();

            const page = automation.currentPage;
            if (!page) {
                throw new Error('Page not initialized');
            }

            const timeTracker = new TimeTracker(page);
            const today = new Date().toISOString().split('T')[0]!;

            const entry: WorkEntry = {
                date: today,
                startTime: options.start,
                endTime: options.end,
                breakMinutes: parseInt(options.break),
                description: options.description || `Work day - ${today}`
            };

            const success = await timeTracker.logWorkHours(entry);

            if (success) {
                console.log(chalk.green('✅ Work hours logged successfully!'));
                console.log(chalk.gray(`   Date: ${entry.date}`));
                console.log(chalk.gray(`   Time: ${entry.startTime} - ${entry.endTime}`));
                console.log(chalk.gray(`   Break: ${entry.breakMinutes} minutes`));
            } else {
                console.log(chalk.red('❌ Failed to log work hours'));
                process.exit(1);
            }

        } catch (error) {
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        } finally {
            await automation.cleanup();
        }
    });

program
    .command('log-week')
    .description('Log work hours for the current week (Mon-Fri)')
    .option('-s, --start <time>', 'Start time (HH:MM)', config.workHours.defaultStartTime)
    .option('-e, --end <time>', 'End time (HH:MM)', config.workHours.defaultEndTime)
    .option('-b, --break <minutes>', 'Break time in minutes', config.workHours.defaultBreakMinutes.toString())
    .action(async (options) => {
        console.log(chalk.blue('📅 Logging work hours for the current week...'));

        const automation = new FactorialAutomation();

        try {
            validateConfig();
            await automation.initialize();

            const loginSuccess = await automation.login();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            await automation.navigateToTimeTracking();

            const page = automation.currentPage;
            if (!page) {
                throw new Error('Page not initialized');
            }

            const timeTracker = new TimeTracker(page);
            const weekEntries = await timeTracker.getCurrentWeekEntries();

            // Update entries with provided options
            const updatedEntries = weekEntries.map(entry => ({
                ...entry,
                startTime: options.start,
                endTime: options.end,
                breakMinutes: parseInt(options.break)
            }));

            let successCount = 0;

            for (const entry of updatedEntries) {
                console.log(chalk.yellow(`Logging ${entry.date}...`));
                const success = await timeTracker.logWorkHours(entry);

                if (success) {
                    successCount++;
                    console.log(chalk.green(`✅ ${entry.date} logged successfully`));
                } else {
                    console.log(chalk.red(`❌ Failed to log ${entry.date}`));
                }

                // Wait a bit between entries to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            console.log(chalk.blue(`\n📊 Summary: ${successCount}/${updatedEntries.length} entries logged successfully`));

        } catch (error) {
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        } finally {
            await automation.cleanup();
        }
    });

program
    .command('log-custom')
    .description('Log work hours for a specific date')
    .requiredOption('-d, --date <date>', 'Date (YYYY-MM-DD)')
    .option('-s, --start <time>', 'Start time (HH:MM)', config.workHours.defaultStartTime)
    .option('-e, --end <time>', 'End time (HH:MM)', config.workHours.defaultEndTime)
    .option('-b, --break <minutes>', 'Break time in minutes', config.workHours.defaultBreakMinutes.toString())
    .option('--description <text>', 'Work description')
    .action(async (options) => {
        console.log(chalk.blue(`🕐 Logging work hours for ${options.date}...`));

        const automation = new FactorialAutomation();

        try {
            validateConfig();
            await automation.initialize();

            const loginSuccess = await automation.login();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            await automation.navigateToTimeTracking();

            const page = automation.currentPage;
            if (!page) {
                throw new Error('Page not initialized');
            }

            const timeTracker = new TimeTracker(page);

            const entry: WorkEntry = {
                date: options.date,
                startTime: options.start,
                endTime: options.end,
                breakMinutes: parseInt(options.break),
                description: options.description || `Work day - ${options.date}`
            };

            const success = await timeTracker.logWorkHours(entry);

            if (success) {
                console.log(chalk.green('✅ Work hours logged successfully!'));
                console.log(chalk.gray(`   Date: ${entry.date}`));
                console.log(chalk.gray(`   Time: ${entry.startTime} - ${entry.endTime}`));
                console.log(chalk.gray(`   Break: ${entry.breakMinutes} minutes`));
            } else {
                console.log(chalk.red('❌ Failed to log work hours'));
                process.exit(1);
            }

        } catch (error) {
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        } finally {
            await automation.cleanup();
        }
    });

program
    .command('log-any')
    .description('Automatically log hours for any day that has missing hours')
    .action(async () => {
        console.log(chalk.blue('🔍 Scanning for any days with missing hours to log...'));

        const automation = new FactorialAutomation();

        try {
            validateConfig();

            await automation.initialize();
            
            const loginSuccess = await automation.login();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            await automation.navigateToTimeTracking();

            const page = automation.currentPage;
            if (!page) {
                throw new Error('Page not initialized');
            }

            const timeTracker = new TimeTracker(page);
            const success = await timeTracker.logAnyMissingHours();

            if (success) {
                console.log(chalk.green('✅ Successfully processed any missing hours!'));
                console.log(chalk.gray('   Note: If no missing hours were found, that means all days are properly logged.'));
            } else {
                console.log(chalk.red('❌ Failed to process missing hours'));
                process.exit(1);
            }
        } catch (error: any) {
            console.error(chalk.red('❌ Failed to process missing hours:'), error.message);
            process.exit(1);
        } finally {
            await automation.cleanup();
        }
    });

program
    .command('debug')
    .description('Debug the Factorial attendance page interface')
    .action(async () => {
        console.log(chalk.blue('🔍 Debugging Factorial attendance page...'));

        const automation = new FactorialAutomation();

        try {
            validateConfig();

            // Force headless to false for debugging
            process.env.HEADLESS = 'false';

            await automation.initialize();

            const loginSuccess = await automation.login();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            // Navigate to attendance page
            const page = automation.currentPage;
            if (!page) {
                throw new Error('Page not initialized');
            }

            console.log(chalk.yellow('Navigating to attendance page...'));

            // Try multiple attendance URLs
            const attendanceUrls = [
                'https://app.factorialhr.com/attendance/clock-in',
                'https://app.factorialhr.com/attendance/',
                'https://app.factorialhr.com/attendance',
                'https://app.factorialhr.com/time'
            ];

            let navigationSuccess = false;
            for (const url of attendanceUrls) {
                try {
                    console.log(chalk.gray(`  Trying: ${url}`));
                    await page.goto(url, { timeout: 30000 });
                    await page.waitForLoadState('load', { timeout: 30000 });
                    await page.waitForTimeout(2000);

                    const currentUrl = page.url();
                    if (!currentUrl.includes('/login')) {
                        navigationSuccess = true;
                        console.log(chalk.green(`  ✅ Successfully navigated to: ${currentUrl}`));
                        break;
                    }
                } catch (e) {
                    console.log(chalk.red(`  ❌ Failed: ${e instanceof Error ? e.message : e}`));
                }
            }

            if (!navigationSuccess) {
                throw new Error('Could not navigate to any attendance page');
            }

            await page.waitForTimeout(3000);

            const currentUrl = page.url();
            const pageTitle = await page.title();

            console.log(chalk.green(`✅ Current URL: ${currentUrl}`));
            console.log(chalk.green(`✅ Page Title: ${pageTitle}`));

            // Take a screenshot
            await page.screenshot({ path: 'logs/debug-attendance-page.png' });
            console.log(chalk.blue('📸 Screenshot saved to logs/debug-attendance-page.png'));

            // Find all buttons
            const buttons = await page.$$('button');
            console.log(chalk.yellow(`\n🔍 Found ${buttons.length} buttons on the page:`));

            for (let i = 0; i < Math.min(buttons.length, 20); i++) {
                try {
                    const text = await buttons[i]?.textContent();
                    const className = await buttons[i]?.getAttribute('class');
                    const id = await buttons[i]?.getAttribute('id');
                    const ariaLabel = await buttons[i]?.getAttribute('aria-label');

                    console.log(chalk.gray(`  ${i + 1}. "${text?.trim()}" (class: ${className}, id: ${id}, aria-label: ${ariaLabel})`));
                } catch (e) {
                    console.log(chalk.gray(`  ${i + 1}. [Error reading button]`));
                }
            }

            // Look for forms
            const forms = await page.$$('form');
            console.log(chalk.yellow(`\n📋 Found ${forms.length} forms on the page`));

            // Look for input fields
            const inputs = await page.$$('input');
            console.log(chalk.yellow(`\n📝 Found ${inputs.length} input fields:`));

            for (let i = 0; i < Math.min(inputs.length, 10); i++) {
                try {
                    const type = await inputs[i]?.getAttribute('type');
                    const name = await inputs[i]?.getAttribute('name');
                    const placeholder = await inputs[i]?.getAttribute('placeholder');

                    console.log(chalk.gray(`  ${i + 1}. type: ${type}, name: ${name}, placeholder: ${placeholder}`));
                } catch (e) {
                    console.log(chalk.gray(`  ${i + 1}. [Error reading input]`));
                }
            }

            console.log(chalk.green('\n✨ Debug complete! Check the screenshot and button list above.'));
            console.log(chalk.blue('Keep the browser open to manually inspect the page...'));
            console.log(chalk.gray('Press Ctrl+C when done.'));

            // Keep the page open for manual inspection
            await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes

        } catch (error) {
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        } finally {
            await automation.cleanup();
        }
    });

program
    .command('setup')
    .description('Setup configuration file')
    .action(() => {
        console.log(chalk.blue('🛠️  Setting up Factorial Time Tracker'));
        console.log(chalk.yellow('\n1. Copy .env.example to .env:'));
        console.log(chalk.gray('   cp .env.example .env'));
        console.log(chalk.yellow('\n2. Edit .env file with your Factorial credentials:'));
        console.log(chalk.gray('   FACTORIAL_EMAIL=your-email@example.com'));
        console.log(chalk.gray('   FACTORIAL_PASSWORD=your-password'));
        console.log(chalk.yellow('\n3. Test login:'));
        console.log(chalk.gray('   npm run dev login'));
        console.log(chalk.yellow('\n4. Debug the interface:'));
        console.log(chalk.gray('   npm run dev debug'));
        console.log(chalk.yellow('\n5. Log today\'s hours:'));
        console.log(chalk.gray('   npm run dev log-today'));
        console.log(chalk.green('\n✨ Setup complete! Edit .env and start logging hours.'));
    });// Handle errors
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

program.parse();