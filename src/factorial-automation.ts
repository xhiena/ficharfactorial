import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from './config.js';
import logger from './logger.js';

export class FactorialAutomation {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;

    get currentPage(): Page | null {
        return this.page;
    }

    async initialize(): Promise<void> {
        try {
            logger.info('Initializing Playwright browser...');

            this.browser = await chromium.launch({
                headless: config.browser.headless,
                timeout: config.browser.timeout
            });

            this.context = await this.browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'
            });

            this.page = await this.context.newPage();

            // Set timeouts optimized for NAS/slower network environments
            this.page.setDefaultTimeout(config.browser.elementTimeout);
            this.page.setDefaultNavigationTimeout(config.browser.navigationTimeout);

            logger.info('Browser initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize browser:', error);
            throw error;
        }
    }

    async login(): Promise<boolean> {
        if (!this.page) {
            throw new Error('Browser not initialized. Call initialize() first.');
        }

        try {
            logger.info('Navigating to Factorial login page...');

            // Retry navigation up to 3 times for network issues
            let navigationSuccess = false;
            let attempts = 0;
            const maxAttempts = 3;

            while (!navigationSuccess && attempts < maxAttempts) {
                attempts++;
                try {
                    logger.info(`Navigation attempt ${attempts}/${maxAttempts}...`);

                    await this.page.goto(config.factorial.baseUrl, {
                        timeout: config.browser.navigationTimeout,
                        waitUntil: 'domcontentloaded' // Less strict than 'load', works better on slow networks
                    });

                    // Wait for the login page to load with extended timeout for NAS environments
                    await this.page.waitForLoadState('networkidle', { timeout: config.browser.pageTimeout });

                    navigationSuccess = true;
                    logger.info('Successfully navigated to Factorial login page');

                } catch (navError: any) {
                    if (attempts === maxAttempts) {
                        throw new Error(`Failed to navigate to Factorial after ${maxAttempts} attempts. Network issue or site unavailable. Error: ${navError.message}`);
                    }
                    logger.warn(`Navigation attempt ${attempts} failed, retrying in 5 seconds...`, navError.message);
                    await this.page.waitForTimeout(5000);
                }
            }

            // Look for email input field (try multiple selectors)
            logger.info('Looking for login form...');

            const emailSelectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[placeholder*="email" i]',
                '#email',
                '.email-input'
            ];

            let emailInput = null;
            for (const selector of emailSelectors) {
                try {
                    emailInput = await this.page.waitForSelector(selector, { timeout: 5000 });
                    if (emailInput) {
                        logger.info(`Found email input with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            if (!emailInput) {
                // Check if we're already logged in
                const isLoggedIn = await this.isLoggedIn();
                if (isLoggedIn) {
                    logger.info('Already logged in to Factorial');
                    return true;
                }

                throw new Error('Could not find email input field. The page structure might have changed.');
            }

            // Fill email
            logger.info('Filling email field...');
            await emailInput.fill(config.factorial.email);

            // Look for password input
            const passwordSelectors = [
                'input[type="password"]',
                'input[name="password"]',
                '#password',
                '.password-input'
            ];

            let passwordInput = null;
            for (const selector of passwordSelectors) {
                try {
                    passwordInput = await this.page.waitForSelector(selector, { timeout: 2000 });
                    if (passwordInput) {
                        logger.info(`Found password input with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            if (!passwordInput) {
                throw new Error('Could not find password input field');
            }

            // Fill password
            logger.info('Filling password field...');
            await passwordInput.fill(config.factorial.password);

            // Look for login/submit button
            const buttonSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Sign in")',
                'button:has-text("Login")',
                'button:has-text("Log in")',
                '.login-button',
                '.submit-button'
            ];

            let loginButton = null;
            for (const selector of buttonSelectors) {
                try {
                    loginButton = await this.page.waitForSelector(selector, { timeout: 2000 });
                    if (loginButton) {
                        logger.info(`Found login button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            if (!loginButton) {
                // Try pressing Enter as fallback
                logger.info('No login button found, trying Enter key...');
                await passwordInput.press('Enter');
            } else {
                logger.info('Clicking login button...');
                await loginButton.click();
            }

            // Wait for navigation or error
            await this.page.waitForLoadState('networkidle');

            // Check if login was successful
            const loginSuccess = await this.isLoggedIn();

            if (loginSuccess) {
                logger.info('Login successful!');
                return true;
            } else {
                // Check for error messages
                const errorSelectors = [
                    '.error-message',
                    '.alert-error',
                    '[data-testid="error"]',
                    '.login-error'
                ];

                for (const selector of errorSelectors) {
                    try {
                        const errorElement = await this.page.$(selector);
                        if (errorElement) {
                            const errorText = await errorElement.textContent();
                            logger.error(`Login failed with error: ${errorText}`);
                            throw new Error(`Login failed: ${errorText}`);
                        }
                    } catch (e) {
                        // Continue checking other selectors
                    }
                }

                logger.error('Login failed - no specific error message found');
                throw new Error('Login failed - please check credentials');
            }

        } catch (error) {
            logger.error('Login failed:', error);
            throw error;
        }
    }

    async isLoggedIn(): Promise<boolean> {
        if (!this.page) return false;

        try {
            // Check for common indicators of being logged in
            const loggedInIndicators = [
                '.dashboard',
                '.user-menu',
                '[data-testid="user-avatar"]',
                '.navigation-menu',
                'nav[role="navigation"]'
            ];

            for (const selector of loggedInIndicators) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        logger.debug(`Found logged-in indicator: ${selector}`);
                        return true;
                    }
                } catch (e) {
                    // Continue checking other indicators
                }
            }

            // Check if we're still on the login page
            const currentUrl = this.page.url();
            if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
                return false;
            }

            // If we're on the main app domain and not on login page, assume logged in
            if (currentUrl.includes('factorialhr.com') && !currentUrl.includes('/login')) {
                return true;
            }

            return false;
        } catch (error) {
            logger.debug('Error checking login status:', error);
            return false;
        }
    }

    async navigateToTimeTracking(): Promise<void> {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }

        try {
            logger.info('Navigating to time tracking section...');

            // Common selectors for time tracking navigation
            const timeTrackingSelectors = [
                'a[href*="time"]',
                'a[href*="attendance"]',
                'nav a:has-text("Time")',
                'nav a:has-text("Attendance")',
                '[data-testid="time-tracking"]',
                '.menu-time',
                '.sidebar a:has-text("Time")'
            ];

            let found = false;
            for (const selector of timeTrackingSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        logger.info(`Found time tracking link with selector: ${selector}`);
                        await element.click();
                        await this.page.waitForLoadState('networkidle');
                        found = true;
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            if (!found) {
                // Try direct URL navigation - start with the correct Factorial URLs
                const timeUrls = [
                    '/attendance/clock-in',
                    '/attendance/',
                    '/attendance',
                    '/time',
                    '/time-tracking'
                ];

                for (const url of timeUrls) {
                    try {
                        logger.info(`Trying direct navigation to: ${config.factorial.baseUrl}${url}`);
                        await this.page.goto(`${config.factorial.baseUrl}${url}`, {
                            timeout: config.browser.pageTimeout,
                            waitUntil: 'load'
                        });
                        await this.page.waitForLoadState('load', { timeout: config.browser.pageTimeout });
                        await this.page.waitForTimeout(2000);

                        // Check if we ended up on a valid page (not 404)
                        const pageTitle = await this.page.title();
                        const currentUrl = this.page.url();

                        if (!pageTitle.toLowerCase().includes('error') &&
                            !pageTitle.toLowerCase().includes('404') &&
                            !currentUrl.includes('/login')) {
                            found = true;
                            logger.info(`Successfully navigated to: ${currentUrl}`);
                            break;
                        }
                    } catch (e) {
                        logger.debug(`Failed to navigate to ${url}:`, e);
                    }
                }
            } if (!found) {
                throw new Error('Could not navigate to time tracking section. Please check the Factorial interface.');
            }

            logger.info('Successfully navigated to time tracking section');
        } catch (error) {
            logger.error('Failed to navigate to time tracking:', error);
            throw error;
        }
    }

    async cleanup(): Promise<void> {
        try {
            logger.info('Cleaning up browser resources...');

            if (this.page) {
                await this.page.close();
            }

            if (this.context) {
                await this.context.close();
            }

            if (this.browser) {
                await this.browser.close();
            }

            logger.info('Browser cleanup completed');
        } catch (error) {
            logger.error('Error during cleanup:', error);
        }
    }
}