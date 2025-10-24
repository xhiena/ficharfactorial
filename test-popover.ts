import { FactorialAutomation } from './factorial-automation.js';
import { config, validateConfig } from './config.js';
import logger from './logger.js';

async function testSinglePopover() {
    logger.info('Testing single popover interaction...');

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

        logger.info('Looking for first popover trigger...');
        const popoverTriggers = await page.$$('[aria-label="popover trigger"]');

        if (popoverTriggers.length === 0) {
            throw new Error('No popover triggers found');
        }

        logger.info(`Found ${popoverTriggers.length} popover triggers`);

        // Click the first one
        logger.info('Clicking first popover...');
        await popoverTriggers[0]?.click();
        await page.waitForTimeout(3000);

        // Take screenshot
        await page.screenshot({ path: 'logs/popover-opened.png' });

        // List all visible elements
        const allElements = await page.$$('*');
        logger.info(`Total elements on page: ${allElements.length}`);

        // Find all text content
        const textElements = await page.$$eval('*', elements =>
            elements
                .map(el => el.textContent?.trim())
                .filter(text => text && text.length > 0 && text.length < 100)
                .slice(0, 50)
        );

        logger.info('Visible text content:');
        textElements.forEach((text, i) => logger.info(`  ${i + 1}: "${text}"`));

        // Find all interactive elements
        const interactive = await page.$$('button, input, textarea, select, [role="button"], [role="textbox"], [contenteditable="true"]');
        logger.info(`Found ${interactive.length} interactive elements after popover click`);

        for (let i = 0; i < Math.min(interactive.length, 10); i++) {
            try {
                const el = interactive[i];
                const tagName = await el.evaluate(node => node.tagName);
                const type = await el.getAttribute('type');
                const role = await el.getAttribute('role');
                const placeholder = await el.getAttribute('placeholder');
                const text = await el.textContent();
                const isVisible = await el.isVisible();

                logger.info(`  ${i + 1}: ${tagName} (type=${type}, role=${role}, placeholder="${placeholder}", text="${text?.slice(0, 30)}", visible=${isVisible})`);
            } catch (e) {
                logger.debug(`Could not analyze element ${i + 1}`);
            }
        }

        logger.info('Test complete. Check logs/popover-opened.png');

        // Keep browser open for 30 seconds
        await page.waitForTimeout(30000);

    } catch (error) {
        logger.error('Test failed:', error);
    } finally {
        await automation.cleanup();
    }
}

testSinglePopover().catch(console.error);