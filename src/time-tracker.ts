import { Page } from 'playwright';
import logger from './logger.js';
import { config } from './config.js';

export interface WorkEntry {
    date: string; // YYYY-MM-DD format
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    breakMinutes?: number;
    description?: string;
}

export class TimeTracker {
    constructor(private page: Page) { }

    async logWorkHours(entry: WorkEntry): Promise<boolean> {
        try {
            logger.info(`Logging work hours for ${entry.date}: ${entry.startTime} - ${entry.endTime}`);

            // Check if we're on the right page
            const currentUrl = this.page.url();
            if (!currentUrl.includes('attendance') && !currentUrl.includes('time')) {
                logger.warn('Not on attendance page, trying to navigate...');
                await this.page.goto('https://app.factorialhr.com/attendance/clock-in', {
                    timeout: 30000,
                    waitUntil: 'load'
                });
                await this.page.waitForLoadState('load', { timeout: 30000 });
                await this.page.waitForTimeout(2000);
            }

            // First, try to close any popups by clicking the close button
            logger.info('Looking for close button to dismiss any popups...');
            try {
                const closeButton = await this.page.$('div[role="button"][aria-label="Close"]');
                if (closeButton) {
                    logger.info('Found close button, clicking to dismiss popup...');
                    await closeButton.click();
                    await this.page.waitForTimeout(1000);
                } else {
                    logger.debug('No close button found, clicking body as fallback...');
                    await this.page.click('body', { timeout: 2000 });
                    await this.page.waitForTimeout(1000);
                }
            } catch (e) {
                logger.debug('Could not click close button or body, continuing...');
            }            // Use the specific Factorial workflow
            let success = false;

            try {
                logger.info('Using Factorial-specific workflow...');
                success = await this.handleFactorialTimeEntry(entry);

                if (!success) {
                    throw new Error('Factorial workflow failed');
                }

            } catch (error) {
                logger.error('Factorial workflow failed:', error);
                throw new Error('Could not log work hours using Factorial workflow');
            }

            if (success) {
                logger.info('Work hours logged successfully');
                return true;
            }

            return false;

        } catch (error) {
            logger.error('Failed to log work hours:', error);
            return false;
        }
    }

    private async fillTimeEntryForm(entry: WorkEntry): Promise<void> {
        // Fill in the date
        await this.fillDate(entry.date);

        // Fill in start time
        await this.fillStartTime(entry.startTime);

        // Fill in end time
        await this.fillEndTime(entry.endTime);

        // Fill in break time if provided
        if (entry.breakMinutes) {
            await this.fillBreakTime(entry.breakMinutes);
        }

        // Fill in description if provided
        if (entry.description) {
            await this.fillDescription(entry.description);
        }
    }

    private async handleClockInOutWorkflow(entry: WorkEntry): Promise<void> {
        // This method handles the modern Factorial interface
        logger.info('Attempting modern Factorial interface workflow...');

        // Take another screenshot for debugging this specific state
        await this.page.screenshot({ path: 'logs/workflow-debug.png' });

        // Look for interactive elements that might open time entry
        const interactiveSelectors = [
            // Popover triggers (saw in debug output)
            '[aria-label="popover trigger"]',
            'button[aria-label="popover trigger"]',
            // Buttons with specific classes we saw
            'button._1hbdt9x3._1hbdt9x5',
            'button._1hbdt9x3',
            // Look for calendar-like elements
            '[role="button"]',
            '[role="gridcell"]',
            // Modern UI patterns
            'button[data-state]',
            'button[aria-haspopup]',
            '[data-radix-collection-item]',
            // Date/time related
            'button:has([data-icon*="calendar"])',
            'button:has([data-icon*="clock"])',
            'button:has([data-icon*="time"])',
            // Spanish text that might be on buttons
            'button:has-text("Fichar")',
            'button:has-text("Entrada")',
            'button:has-text("Horario")',
            'button:has-text("Agregar")',
            'button:has-text("Añadir")',
            // Look for today's date or current day
            `button:has-text("${new Date().getDate()}")`,
            // Generic clickable elements that might be styled as buttons
            '[class*="cursor-pointer"]',
            '[class*="clickable"]'
        ];

        logger.info('Searching for interactive elements...');

        for (const selector of interactiveSelectors) {
            try {
                const elements = await this.page.$$(selector);
                logger.debug(`Found ${elements.length} elements with selector: ${selector}`);

                for (let i = 0; i < elements.length; i++) {
                    try {
                        const element = elements[i];
                        if (!element) continue;

                        const isVisible = await element.isVisible();
                        const isEnabled = await element.isEnabled();

                        if (isVisible && isEnabled) {
                            logger.info(`Trying to click element ${i + 1} with selector: ${selector}`);
                            await element.click();
                            await this.page.waitForTimeout(2000);

                            // Check if a modal, form, or input appeared
                            const hasInputs = await this.page.$$('input');
                            const hasModal = await this.page.$('[role="dialog"], .modal, [data-state="open"]');
                            const hasTextarea = await this.page.$$('textarea');
                            const hasContentEditable = await this.page.$$('[contenteditable="true"]');
                            const hasAriaTextbox = await this.page.$$('[role="textbox"]');

                            logger.debug(`After click: inputs=${hasInputs.length}, textareas=${hasTextarea.length}, contenteditable=${hasContentEditable.length}, textboxes=${hasAriaTextbox.length}, modal=${!!hasModal}`);

                            if (hasInputs.length > 0 || hasModal || hasTextarea.length > 0 || hasContentEditable.length > 0 || hasAriaTextbox.length > 0) {
                                logger.info('Found interactive elements after clicking, investigating...');

                                // Take a screenshot of what appeared
                                await this.page.screenshot({ path: `logs/modal-after-click-${Date.now()}.png` });

                                // Log all interactive elements that appeared
                                const allInteractiveElements = [
                                    ...(await this.page.$$('input')),
                                    ...(await this.page.$$('textarea')),
                                    ...(await this.page.$$('[contenteditable="true"]')),
                                    ...(await this.page.$$('[role="textbox"]')),
                                    ...(await this.page.$$('select')),
                                    ...(await this.page.$$('[role="combobox"]')),
                                    ...(await this.page.$$('[role="spinbutton"]')),
                                ];

                                logger.info(`Found ${allInteractiveElements.length} interactive elements`);

                                // Try to interact with custom time entry elements
                                const success = await this.handleCustomTimeEntry(entry);
                                if (success) {
                                    return;
                                }

                                // If custom handling failed, try traditional approach
                                try {
                                    await this.fillTimeEntryForm(entry);
                                    await this.submitTimeEntry();
                                    return; // Success!
                                } catch (fillError) {
                                    logger.warn('Failed to fill appeared form:', fillError);
                                    // Continue trying other elements
                                }
                            }
                        }
                    } catch (e) {
                        logger.debug(`Failed to interact with element ${i + 1}:`, e);
                    }
                }
            } catch (e) {
                logger.debug(`Failed with selector ${selector}:`, e);
            }
        }

        // If we get here, try a different approach - look for any text that mentions the current date
        const today = new Date();
        const todayString = today.getDate().toString();
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const currentMonth = monthNames[today.getMonth()];

        logger.info(`Looking for today's date (${todayString}) or month (${currentMonth})...`);

        try {
            // Try clicking on today's date
            const dateElements = await this.page.$$(`text=${todayString}`);
            for (const element of dateElements) {
                try {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        logger.info(`Clicking on date element with text "${todayString}"`);
                        await element.click();
                        await this.page.waitForTimeout(2000);

                        // Check for form appearance
                        const inputs = await this.page.$$('input');
                        if (inputs.length > 0) {
                            logger.info('Form appeared after clicking date, filling...');
                            await this.fillTimeEntryForm(entry);
                            await this.submitTimeEntry();
                            return;
                        }
                    }
                } catch (e) {
                    logger.debug('Failed to click date element:', e);
                }
            }
        } catch (e) {
            logger.debug('No date elements found or clickable');
        }

        throw new Error('Could not find any interactive elements to add time entries. The interface might use a different pattern than expected.');
    }

    private async handleFactorialTimeEntry(entry: WorkEntry): Promise<boolean> {
        logger.info('Starting Factorial-specific time entry workflow...');

        try {
            // Wait for dynamic content to load (important for headless mode)
            logger.info('Waiting for dynamic content to load...');
            await this.page.waitForTimeout(3000);

            // Step 1: Find ANY table row with missing hours (not just specific date)
            logger.info('Looking for ANY table row with missing hours...');

            const missingHoursSelectors = [
                'span[title="-8h"]',
                'span:has-text("-8h")',
                'span._1jh4l1p2:has-text("-8h")',
                '[title="-8h"]',
                // Look for other common missing hour patterns
                'span[title*="-"]',
                'span:has-text("-")',
            ];

            let targetRow = null;
            let foundDate = 'unknown';

            for (const selector of missingHoursSelectors) {
                try {
                    // Get all matching spans, not just the first one
                    const missingHoursSpans = await this.page.$$(selector);

                    for (const span of missingHoursSpans) {
                        // Check if this span contains negative hours (missing hours)
                        const spanText = await span.textContent();
                        if (spanText && spanText.includes('-') && spanText.includes('h')) {
                            logger.info(`Found missing hours span: "${spanText}" with selector: ${selector}`);

                            // Find the parent table row
                            targetRow = await span.evaluateHandle(el => {
                                let current = el.parentElement;
                                while (current && current.tagName !== 'TR') {
                                    current = current.parentElement;
                                }
                                return current;
                            });

                            if (targetRow) {
                                // Try to find the date for this row for logging purposes
                                try {
                                    const dateCell = await targetRow.evaluateHandle(row => {
                                        // Look for date indicators in the row
                                        const cells = row.querySelectorAll('td');
                                        for (const cell of cells) {
                                            const text = cell.textContent?.trim();
                                            if (text && /\d{1,2}/.test(text) && parseInt(text) <= 31) {
                                                return text;
                                            }
                                        }
                                        return null;
                                    });
                                    const dateText = await dateCell.jsonValue();
                                    if (dateText) {
                                        foundDate = dateText;
                                    }
                                } catch (e) {
                                    logger.debug('Could not determine date for row');
                                }

                                logger.info(`Found missing hours row for date ${foundDate} with missing hours: ${spanText}`);

                                // Quick validation: check if this row has the toggle button (not a header)
                                try {
                                    const hasToggle = await targetRow.evaluate(row => {
                                        return row && row.querySelector('[data-intercom-target="attendance-row-toggle"]') !== null;
                                    });

                                    if (!hasToggle) {
                                        logger.debug(`Row with ${spanText} appears to be a header row (no toggle button), skipping...`);
                                        targetRow = null; // Reset and continue looking
                                        continue;
                                    }

                                    // Double-check that we have a valid row element
                                    const rowElement = await targetRow.jsonValue();
                                    if (!rowElement) {
                                        logger.debug(`Row element is null, skipping...`);
                                        targetRow = null;
                                        continue;
                                    }

                                    logger.info(`Validated row has toggle button - this is a data row with missing hours`);
                                    break;
                                } catch (evalError: any) {
                                    logger.debug(`Row validation failed: ${evalError.message}, skipping...`);
                                    targetRow = null;
                                    continue;
                                }
                            }
                        }
                    }

                    if (targetRow) break;
                } catch (e) {
                    logger.debug(`Selector ${selector} failed:`, e);
                }
            }

            if (!targetRow) {
                logger.info('No missing hours found - all days appear to be properly logged');
                return true; // Consider this a success - nothing to do
            }

            // Step 2: Click the toggle button in that row
            logger.info('Looking for toggle button in the target row...');

            // Additional safety check
            if (!targetRow) {
                logger.error('Target row is null - this should not happen after validation');
                return false;
            }

            let toggleButton;
            try {
                toggleButton = await targetRow.evaluateHandle(row => {
                    if (!row) return null;
                    return row.querySelector('[data-intercom-target="attendance-row-toggle"]');
                });
            } catch (error: any) {
                logger.error(`Failed to find toggle button: ${error.message}`);
                return false;
            }

            if (!toggleButton) {
                throw new Error('Could not find toggle button with data-intercom-target="attendance-row-toggle"');
            }

            // Check for and close any blocking modals first
            logger.info('🔍 MODAL CHECK: Looking for blocking modals before clicking toggle button...');
            try {
                const modal = await this.page.$('[aria-modal="true"]');
                logger.info(`🔍 MODAL CHECK: Found modal? ${!!modal}`);
                if (modal) {
                    logger.info('🚨 MODAL FOUND: Trying multiple strategies to dismiss blocking modal...');

                    // Strategy 1: Look for close buttons with various selectors
                    const closeSelectors = [
                        'div[role="button"][aria-label="Close"]',
                        'button[aria-label="Close"]',
                        '[aria-label="Close"]',
                        'button:has-text("×")',
                        'button:has-text("✕")',
                        '.close-button',
                        '[data-testid="close"]'
                    ];

                    let modalClosed = false;
                    for (const selector of closeSelectors) {
                        try {
                            const closeButton = await this.page.$(selector);
                            if (closeButton) {
                                logger.info(`Found close button with selector: ${selector}`);
                                await closeButton.click();
                                await this.page.waitForTimeout(1000);
                                modalClosed = true;
                                break;
                            }
                        } catch (e) {
                            logger.debug(`Close button selector ${selector} failed:`, e);
                        }
                    }

                    if (!modalClosed) {
                        // Strategy 2: Press Escape key
                        logger.info('No close button found, trying Escape key...');
                        await this.page.keyboard.press('Escape');
                        await this.page.waitForTimeout(1000);
                    }

                    // Strategy 3: If modal still exists, try clicking outside of it
                    const stillHasModal = await this.page.$('[aria-modal="true"]');
                    if (stillHasModal) {
                        logger.info('Modal still present, trying to click outside it...');
                        await this.page.click('body', { position: { x: 10, y: 10 } });
                        await this.page.waitForTimeout(1000);
                    }
                }
            } catch (e) {
                logger.debug('Modal dismissal failed, continuing...', e);
            }

            logger.info('🖱️ CLICK: About to click toggle button...');

            // Double check for modal right before click
            const lastModalCheck = await this.page.$('[aria-modal="true"]');
            if (lastModalCheck) {
                logger.error('🚨 CRITICAL: Modal still present right before click! This will cause timeout.');
                // Take a screenshot for debugging
                await this.page.screenshot({ path: `logs/modal-blocking-click-${Date.now()}.png` });
            }

            await toggleButton.asElement()?.click();
            await this.page.waitForTimeout(2000);

            // Step 3: Find and click the "Añadir" button that appears
            logger.info('Looking for "Añadir" button...');

            const addButtonSelectors = [
                'button:has-text("Añadir")',
                'button:text("Añadir")',
                '[role="button"]:has-text("Añadir")',
                'button:contains("Añadir")'
            ];

            let addButton = null;
            for (const selector of addButtonSelectors) {
                try {
                    addButton = await this.page.waitForSelector(selector, { timeout: 5000 });
                    if (addButton) {
                        logger.info(`Found "Añadir" button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    logger.debug(`Selector ${selector} failed:`, e);
                }
            }

            if (!addButton) {
                // Try a more generic approach
                const allButtons = await this.page.$$('button');
                for (const button of allButtons) {
                    try {
                        const text = await button.textContent();
                        if (text && text.trim().toLowerCase().includes('añadir')) {
                            addButton = button;
                            logger.info('Found "Añadir" button by text content');
                            break;
                        }
                    } catch (e) {
                        // Continue
                    }
                }
            }

            if (!addButton) {
                throw new Error('Could not find "Añadir" button after clicking toggle');
            }

            logger.info('Clicking "Añadir" button...');
            await addButton.click();
            await this.page.waitForTimeout(3000);

            // Step 4: Fill in the popup form
            logger.info('Filling popup form...');
            const fillResult = await this.fillFactorialPopup(entry);
            
            if (fillResult) {
                // Step 5: Verify success by checking if the "-8h" span has disappeared from the target row
                logger.info('Verifying successful submission by checking if missing hours indicator has disappeared...');
                try {
                    // Wait a moment for the UI to update
                    await this.page.waitForTimeout(2000);
                    
                    // Check if the target row still contains the "-8h" span
                    const stillHasMissingHours = await targetRow.evaluate(row => {
                        if (!row) return false;
                        const spans = row.querySelectorAll('span');
                        for (const span of spans) {
                            if (span.textContent && span.textContent.includes('-') && span.textContent.includes('h')) {
                                return true;
                            }
                        }
                        return false;
                    });
                    
                    if (stillHasMissingHours) {
                        logger.warn('Missing hours indicator still present after submission - may not have been successful');
                        return false;
                    } else {
                        logger.info('✅ Success confirmed: Missing hours indicator has disappeared from the row!');
                        return true;
                    }
                } catch (verifyError: any) {
                    logger.warn(`Could not verify success by checking missing hours indicator: ${verifyError.message}`);
                    // Fall back to the original result from fillFactorialPopup
                    return fillResult;
                }
            }
            
            return fillResult;

        } catch (error) {
            logger.error('Factorial workflow failed:', error);
            return false;
        }
    }

    private async fillFactorialPopup(entry: WorkEntry): Promise<boolean> {
        try {
            logger.info('Filling Factorial popup with work details...');

            // Look for work type dropdown/input (should select "Trabajo")
            logger.info('Setting work type to "Trabajo"...');
            const workTypeSelectors = [
                'select',
                '[role="combobox"]',
                'input[placeholder*="tipo"]',
                'input[placeholder*="work"]',
                'input[placeholder*="category"]'
            ];

            for (const selector of workTypeSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element && await element.isVisible()) {
                        logger.info(`Trying to set work type with selector: ${selector}`);

                        // Try clicking and typing
                        await element.click();
                        await this.page.waitForTimeout(500);

                        // Clear and type "Trabajo"
                        await element.fill('');
                        await element.type('Trabajo');
                        await this.page.waitForTimeout(500);

                        // Try pressing Enter or Tab
                        await this.page.keyboard.press('Tab');
                        break;
                    }
                } catch (e) {
                    logger.debug(`Work type selector ${selector} failed:`, e);
                }
            }

            // Fill start and end time with better logic
            logger.info(`Setting start time to ${entry.startTime} and end time to ${entry.endTime}...`);

            // First, get all time inputs
            const timeInputs = await this.page.$$('input[type="time"]');
            const allInputs = await this.page.$$('input');

            logger.info(`Found ${timeInputs.length} time inputs and ${allInputs.length} total inputs`);

            if (timeInputs.length >= 2 && timeInputs[0] && timeInputs[1]) {
                // We have at least 2 time inputs, use first for start and second for end
                logger.info('Using first time input for start time and second for end time');

                try {
                    await timeInputs[0].click();
                    await timeInputs[0].fill(entry.startTime);
                    logger.info(`Set start time to ${entry.startTime} in first time input`);
                    await this.page.waitForTimeout(500);

                    await timeInputs[1].click();
                    await timeInputs[1].fill(entry.endTime);
                    logger.info(`Set end time to ${entry.endTime} in second time input`);
                    await this.page.waitForTimeout(500);
                } catch (e) {
                    logger.error('Failed to fill time inputs directly:', e);
                    throw e;
                }
            } else if (allInputs.length >= 2 && allInputs[0] && allInputs[1]) {
                // Fallback to all inputs if no specific time inputs found
                logger.info('Fallback: using first two inputs for start and end time');

                try {
                    await allInputs[0].click();
                    await allInputs[0].fill(entry.startTime);
                    logger.info(`Set start time to ${entry.startTime} in first input`);
                    await this.page.waitForTimeout(500);

                    await allInputs[1].click();
                    await allInputs[1].fill(entry.endTime);
                    logger.info(`Set end time to ${entry.endTime} in second input`);
                    await this.page.waitForTimeout(500);
                } catch (e) {
                    logger.error('Failed to fill inputs with fallback method:', e);
                    throw e;
                }
            } else {
                // Try specific selectors as last resort
                logger.info('Using specific selectors as last resort...');

                const startTimeSelectors = [
                    'input[placeholder*="inicio"]',
                    'input[placeholder*="start"]',
                    'input[name*="start"]',
                    'input[id*="start"]'
                ];

                const endTimeSelectors = [
                    'input[placeholder*="fin"]',
                    'input[placeholder*="end"]',
                    'input[name*="end"]',
                    'input[id*="end"]'
                ];

                // Fill start time
                let startFilled = false;
                for (const selector of startTimeSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element && await element.isVisible()) {
                            logger.info(`Setting start time with selector: ${selector}`);
                            await element.click();
                            await element.fill(entry.startTime);
                            await this.page.waitForTimeout(500);
                            startFilled = true;
                            break;
                        }
                    } catch (e) {
                        logger.debug(`Start time selector ${selector} failed:`, e);
                    }
                }

                // Fill end time
                let endFilled = false;
                for (const selector of endTimeSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element && await element.isVisible()) {
                            logger.info(`Setting end time with selector: ${selector}`);
                            await element.click();
                            await element.fill(entry.endTime);
                            await this.page.waitForTimeout(500);
                            endFilled = true;
                            break;
                        }
                    } catch (e) {
                        logger.debug(`End time selector ${selector} failed:`, e);
                    }
                }

                if (!startFilled || !endFilled) {
                    logger.warn(`Time filling incomplete: start=${startFilled}, end=${endFilled}`);
                }
            }

            // Click "Aplicar" button
            logger.info('Looking for "Aplicar" button...');
            const applyButtonSelectors = [
                'button:has-text("Aplicar")',
                'button:text("Aplicar")',
                '[role="button"]:has-text("Aplicar")',
                'button[type="submit"]'
            ];

            let applyButton = null;
            for (const selector of applyButtonSelectors) {
                try {
                    applyButton = await this.page.$(selector);
                    if (applyButton && await applyButton.isVisible()) {
                        logger.info(`Found "Aplicar" button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    logger.debug(`Apply button selector ${selector} failed:`, e);
                }
            }

            if (!applyButton) {
                // Try finding by text content
                const allButtons = await this.page.$$('button');
                for (const button of allButtons) {
                    try {
                        const text = await button.textContent();
                        if (text && text.trim().toLowerCase().includes('aplicar')) {
                            applyButton = button;
                            logger.info('Found "Aplicar" button by text content');
                            break;
                        }
                    } catch (e) {
                        // Continue
                    }
                }
            }

            if (!applyButton) {
                throw new Error('Could not find "Aplicar" button to submit the form');
            }

            logger.info('Clicking "Aplicar" button to submit...');
            await applyButton.click();
            await this.page.waitForTimeout(3000);

            // Check for success
            logger.info('Checking for successful submission...');
            const currentUrl = this.page.url();

            // Look for success indicators
            const successIndicators = await this.page.$$('.success, [data-testid="success"], .notification-success');

            if (successIndicators.length > 0) {
                logger.info('Found success indicators - form submission appears successful');
                return true;
            }

            // If we're still on the same page and no errors, assume form was submitted
            logger.info('Form submitted without errors - will verify success in parent function');
            return true;

        } catch (error) {
            logger.error('Failed to fill Factorial popup:', error);
            return false;
        }
    }

    private async handleCustomTimeEntry(entry: WorkEntry): Promise<boolean> {
        logger.info('Attempting to handle custom time entry components...');

        try {
            // Look for time-related clickable elements
            const timeElements = await this.page.$$('[data-testid*="time"], [aria-label*="time"], [class*="time"], [placeholder*="time"]');
            const clockElements = await this.page.$$('[data-testid*="clock"], [aria-label*="clock"], [class*="clock"]');
            const hourElements = await this.page.$$('[data-testid*="hour"], [aria-label*="hour"], [class*="hour"], [placeholder*="hour"]');
            const minuteElements = await this.page.$$('[data-testid*="minute"], [aria-label*="minute"], [class*="minute"], [placeholder*="minute"]');

            logger.debug(`Found time elements: ${timeElements.length}, clock: ${clockElements.length}, hour: ${hourElements.length}, minute: ${minuteElements.length}`);

            // Try to find elements with Spanish text
            const entradaElements = await this.page.$$('text=Entrada, text=entrada, text=Inicio, text=inicio');
            const salidaElements = await this.page.$$('text=Salida, text=salida, text=Fin, text=fin');
            const horaElements = await this.page.$$('text=Hora, text=hora');

            logger.debug(`Found Spanish elements: entrada=${entradaElements.length}, salida=${salidaElements.length}, hora=${horaElements.length}`);

            // Look for dropdowns or selectors that might be time pickers
            const dropdowns = await this.page.$$('select, [role="combobox"], [role="listbox"]');
            logger.debug(`Found ${dropdowns.length} dropdown elements`);

            // Try to find buttons that might open time pickers
            const timePickerButtons = await this.page.$$('button:has([data-icon*="clock"]), button:has([data-icon*="time"])');
            logger.debug(`Found ${timePickerButtons.length} time picker buttons`);

            // Try clicking on any time picker buttons first
            for (const button of timePickerButtons) {
                try {
                    if (await button.isVisible()) {
                        logger.info('Clicking time picker button...');
                        await button.click();
                        await this.page.waitForTimeout(1000);

                        // After clicking, look for time inputs that might have appeared
                        const newInputs = await this.page.$$('input[type="time"], input[placeholder*="time"], input[placeholder*="hora"]');
                        if (newInputs.length > 0) {
                            logger.info('Time inputs appeared after clicking time picker button');
                            return await this.fillDiscoveredInputs(entry, newInputs);
                        }
                    }
                } catch (e) {
                    logger.debug('Failed to click time picker button:', e);
                }
            }

            // Try interacting with dropdowns
            for (let i = 0; i < dropdowns.length && i < 5; i++) {
                try {
                    const dropdown = dropdowns[i];
                    if (!dropdown) continue;

                    if (await dropdown.isVisible()) {
                        logger.info(`Trying dropdown ${i + 1}...`);
                        await dropdown.click();
                        await this.page.waitForTimeout(500);

                        // Look for time options
                        const timeOptions = await this.page.$$('option, [role="option"]');
                        logger.debug(`Found ${timeOptions.length} options in dropdown`);

                        // Try to find and select start time
                        for (const option of timeOptions.slice(0, 10)) {
                            try {
                                const optionText = await option.textContent();
                                if (optionText && optionText.includes(entry.startTime.split(':')[0] || '')) {
                                    logger.info(`Selecting start time option: ${optionText}`);
                                    await option.click();
                                    await this.page.waitForTimeout(500);
                                    break;
                                }
                            } catch (e) {
                                // Continue
                            }
                        }
                    }
                } catch (e) {
                    logger.debug(`Failed with dropdown ${i}:`, e);
                }
            }

            // Look for any elements that might accept keyboard input
            const focusableElements = await this.page.$$('[tabindex="0"], [contenteditable="true"], input, textarea');
            logger.info(`Found ${focusableElements.length} focusable elements`);

            // Try typing into focusable elements
            for (let i = 0; i < Math.min(focusableElements.length, 3); i++) {
                try {
                    const element = focusableElements[i];
                    if (!element) continue;

                    if (await element.isVisible()) {
                        logger.info(`Trying to type into focusable element ${i + 1}...`);
                        await element.focus();
                        await this.page.waitForTimeout(200);

                        // Try typing start time
                        await element.type(entry.startTime);
                        await this.page.keyboard.press('Tab');
                        await this.page.waitForTimeout(500);

                        // Try typing end time  
                        await this.page.keyboard.type(entry.endTime);
                        await this.page.keyboard.press('Tab');
                        await this.page.waitForTimeout(500);

                        // Try to submit
                        await this.page.keyboard.press('Enter');
                        await this.page.waitForTimeout(2000);

                        // Check if it worked
                        const currentUrl = this.page.url();
                        if (currentUrl.includes('success') || await this.page.$('.success, [data-testid="success"]')) {
                            logger.info('Successfully entered time via keyboard');
                            return true;
                        }
                    }
                } catch (e) {
                    logger.debug(`Failed with focusable element ${i}:`, e);
                }
            }

            return false;
        } catch (error) {
            logger.error('Error in custom time entry handling:', error);
            return false;
        }
    }

    private async fillDiscoveredInputs(entry: WorkEntry, inputs: any[]): Promise<boolean> {
        try {
            logger.info(`Attempting to fill ${inputs.length} discovered inputs`);

            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                try {
                    const placeholder = await input.getAttribute('placeholder');
                    const name = await input.getAttribute('name');
                    const type = await input.getAttribute('type');

                    logger.debug(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);

                    if (placeholder?.toLowerCase().includes('inicio') ||
                        placeholder?.toLowerCase().includes('start') ||
                        name?.toLowerCase().includes('start') ||
                        i === 0) {
                        logger.info('Filling start time...');
                        await input.fill(entry.startTime);
                    } else if (placeholder?.toLowerCase().includes('fin') ||
                        placeholder?.toLowerCase().includes('end') ||
                        name?.toLowerCase().includes('end') ||
                        i === 1) {
                        logger.info('Filling end time...');
                        await input.fill(entry.endTime);
                    }
                } catch (e) {
                    logger.debug(`Failed to fill input ${i}:`, e);
                }
            }

            // Try to submit
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(2000);

            return true;
        } catch (error) {
            logger.error('Error filling discovered inputs:', error);
            return false;
        }
    }

    private async findAndClickAddTimeButton(): Promise<void> {
        // First wait for the page to fully load
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

        const buttonSelectors = [
            // Factorial clock-in page specific selectors
            'button:has-text("Clock in")',
            'button:has-text("Clock In")',
            'button:has-text("Start")',
            'button:has-text("Begin")',
            'button:has-text("Empezar")',  // Spanish
            'button:has-text("Iniciar")',  // Spanish
            'button:has-text("Fichar")',   // Spanish for "clock in"
            // Entry management
            'button:has-text("Add entry")',
            'button:has-text("Add Entry")',
            'button:has-text("New entry")',
            'button:has-text("Nueva entrada")', // Spanish
            'button:has-text("Log time")',
            'button:has-text("Add time")',
            'button:has-text("Manual entry")',
            'button:has-text("Entrada manual")', // Spanish
            // Data attributes and IDs
            '[data-testid*="clock"]',
            '[data-testid*="time"]',
            '[data-testid*="entry"]',
            '[data-testid*="start"]',
            '[id*="clock"]',
            '[id*="time"]',
            '[id*="entry"]',
            // ARIA labels
            'button[aria-label*="clock" i]',
            'button[aria-label*="time" i]',
            'button[aria-label*="start" i]',
            'button[title*="clock" i]',
            'button[title*="time" i]',
            'button[title*="start" i]',
            // CSS classes
            '.clock-in',
            '.clock-in-btn',
            '.start-btn',
            '.add-entry',
            '.time-entry',
            '.manual-entry',
            // Icons
            'button:has([data-icon="clock"])',
            'button:has([data-icon="time"])',
            'button:has([data-icon="plus"])',
            'button:has(.fa-clock)',
            'button:has(.fa-plus)',
            'button:has(.fa-time)',
            'button svg[data-icon="clock"]',
            'button svg[data-icon="time"]',
            'button svg[data-icon="plus"]',
            // Generic plus/add buttons
            'button:has-text("+")',
            'button[title*="add" i]',
            'button[aria-label*="add" i]'
        ];

        let found = false;
        for (const selector of buttonSelectors) {
            try {
                const button = await this.page.$(selector);
                if (button) {
                    // Check if button is visible and enabled
                    const isVisible = await button.isVisible();
                    const isEnabled = await button.isEnabled();

                    if (isVisible && isEnabled) {
                        logger.info(`Found add time button with selector: ${selector}`);
                        await button.click();
                        found = true;
                        break;
                    }
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!found) {
            // Take a screenshot for debugging
            await this.page.screenshot({ path: 'logs/debug-page.png' });

            // Log current page content for debugging
            const currentUrl = this.page.url();
            const pageTitle = await this.page.title();
            logger.error(`Could not find add time button. Current URL: ${currentUrl}, Title: ${pageTitle}`);

            // Try to find any buttons on the page for debugging
            const allButtons = await this.page.$$('button');
            logger.debug(`Found ${allButtons.length} buttons on the page`);

            for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
                try {
                    const buttonText = await allButtons[i]?.textContent();
                    const buttonClass = await allButtons[i]?.getAttribute('class');
                    logger.debug(`Button ${i + 1}: "${buttonText}" (class: ${buttonClass})`);
                } catch (e) {
                    // Continue
                }
            }

            throw new Error('Could not find "Add Time" or similar button. Check logs/debug-page.png for current page state.');
        }
    } private async fillDate(date: string): Promise<void> {
        const dateSelectors = [
            'input[type="date"]',
            'input[name*="date" i]',
            'input[placeholder*="date" i]',
            '[data-testid="date-input"]',
            '.date-picker input',
            '.datepicker input'
        ];

        let filled = false;
        for (const selector of dateSelectors) {
            try {
                const input = await this.page.$(selector);
                if (input) {
                    logger.debug(`Filling date with selector: ${selector}`);
                    await input.fill(date);
                    filled = true;
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!filled) {
            logger.warn('Could not find date input field, skipping date entry');
        }
    }

    private async fillStartTime(startTime: string): Promise<void> {
        const startTimeSelectors = [
            'input[name*="start" i]',
            'input[placeholder*="start" i]',
            'input[aria-label*="start" i]',
            '[data-testid="start-time"]',
            '.start-time input',
            'input[type="time"]:first-of-type'
        ];

        let filled = false;
        for (const selector of startTimeSelectors) {
            try {
                const input = await this.page.$(selector);
                if (input) {
                    logger.debug(`Filling start time with selector: ${selector}`);
                    await input.fill(startTime);
                    filled = true;
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!filled) {
            throw new Error('Could not find start time input field');
        }
    }

    private async fillEndTime(endTime: string): Promise<void> {
        const endTimeSelectors = [
            'input[name*="end" i]',
            'input[placeholder*="end" i]',
            'input[aria-label*="end" i]',
            '[data-testid="end-time"]',
            '.end-time input',
            'input[type="time"]:last-of-type'
        ];

        let filled = false;
        for (const selector of endTimeSelectors) {
            try {
                const input = await this.page.$(selector);
                if (input) {
                    logger.debug(`Filling end time with selector: ${selector}`);
                    await input.fill(endTime);
                    filled = true;
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!filled) {
            throw new Error('Could not find end time input field');
        }
    }

    private async fillBreakTime(breakMinutes: number): Promise<void> {
        const breakSelectors = [
            'input[name*="break" i]',
            'input[placeholder*="break" i]',
            'input[aria-label*="break" i]',
            '[data-testid="break-time"]',
            '.break-time input'
        ];

        // Convert minutes to hours:minutes format if needed
        const breakTime = this.formatBreakTime(breakMinutes);

        let filled = false;
        for (const selector of breakSelectors) {
            try {
                const input = await this.page.$(selector);
                if (input) {
                    logger.debug(`Filling break time with selector: ${selector}`);
                    await input.fill(breakTime);
                    filled = true;
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!filled) {
            logger.warn('Could not find break time input field, skipping break entry');
        }
    }

    private async fillDescription(description: string): Promise<void> {
        const descriptionSelectors = [
            'textarea[name*="description" i]',
            'textarea[placeholder*="description" i]',
            'input[name*="description" i]',
            'input[placeholder*="note" i]',
            '[data-testid="description"]',
            '.description textarea',
            '.notes textarea'
        ];

        let filled = false;
        for (const selector of descriptionSelectors) {
            try {
                const input = await this.page.$(selector);
                if (input) {
                    logger.debug(`Filling description with selector: ${selector}`);
                    await input.fill(description);
                    filled = true;
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!filled) {
            logger.warn('Could not find description field, skipping description');
        }
    }

    private async submitTimeEntry(): Promise<void> {
        const submitSelectors = [
            'button[type="submit"]',
            'button:has-text("Save")',
            'button:has-text("Submit")',
            'button:has-text("Add")',
            'button:has-text("Create")',
            '[data-testid="submit"]',
            '.submit-btn',
            '.save-btn'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
            try {
                const button = await this.page.$(selector);
                if (button) {
                    logger.debug(`Submitting with selector: ${selector}`);
                    await button.click();

                    // Wait for the form to be processed
                    await this.page.waitForTimeout(2000);

                    // Check if there are any error messages
                    await this.checkForErrors();

                    submitted = true;
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!submitted) {
            throw new Error('Could not find submit button to save time entry');
        }
    }

    private async checkForErrors(): Promise<void> {
        const errorSelectors = [
            '.error-message',
            '.alert-error',
            '[data-testid="error"]',
            '.field-error',
            '.validation-error'
        ];

        for (const selector of errorSelectors) {
            try {
                const errorElement = await this.page.$(selector);
                if (errorElement) {
                    const errorText = await errorElement.textContent();
                    if (errorText && errorText.trim()) {
                        throw new Error(`Validation error: ${errorText.trim()}`);
                    }
                }
            } catch (e) {
                if (e instanceof Error && e.message.includes('Validation error')) {
                    throw e;
                }
                // Continue checking other selectors
            }
        }
    }

    private formatBreakTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    async getTodayEntry(): Promise<WorkEntry> {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]!; // YYYY-MM-DD format

        return {
            date: dateString,
            startTime: config.workHours.defaultStartTime,
            endTime: config.workHours.defaultEndTime,
            breakMinutes: config.workHours.defaultBreakMinutes,
            description: `Work day - ${dateString}`
        };
    }

    async getCurrentWeekEntries(): Promise<WorkEntry[]> {
        const entries: WorkEntry[] = [];
        const today = new Date();
        const startOfWeek = new Date(today);

        // Get Monday of current week
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        // Generate entries for the work week (Monday to Friday)
        for (let i = 0; i < 5; i++) {
            const workDay = new Date(startOfWeek);
            workDay.setDate(startOfWeek.getDate() + i);

            const dateString = workDay.toISOString().split('T')[0]!;

            entries.push({
                date: dateString,
                startTime: config.workHours.defaultStartTime,
                endTime: config.workHours.defaultEndTime,
                breakMinutes: config.workHours.defaultBreakMinutes,
                description: `Work day - ${dateString}`
            });
        }

        return entries;
    }

    /**
     * Automatically log hours for any day that has missing hours
     * This is a flexible method that doesn't care about specific dates
     */
    async logAnyMissingHours(): Promise<boolean> {
        logger.info('🔍 Scanning for any days with missing hours to log automatically...');

        try {
            // Create a generic work entry with default values
            const defaultEntry: WorkEntry = {
                date: new Date().toISOString().split('T')[0]!, // Today's date as fallback
                startTime: config.workHours.defaultStartTime,
                endTime: config.workHours.defaultEndTime,
                breakMinutes: config.workHours.defaultBreakMinutes,
                description: 'Automated work hours entry'
            };

            // Navigate to the time tracking page if not already there
            const currentUrl = this.page.url();
            if (!currentUrl.includes('attendance') && !currentUrl.includes('time')) {
                logger.info('Navigating to time tracking page...');
                await this.page.goto('https://app.factorialhr.com/attendance/clock-in', {
                    timeout: 30000,
                    waitUntil: 'load'
                });
                await this.page.waitForLoadState('load', { timeout: 30000 });
                await this.page.waitForTimeout(2000);
            }

            // First, try to close any popups
            logger.info('Looking for close button to dismiss any popups...');
            try {
                const closeButton = await this.page.$('div[role="button"][aria-label="Close"]');
                if (closeButton) {
                    logger.info('Found close button, clicking to dismiss popup...');
                    await closeButton.click();
                    await this.page.waitForTimeout(1000);
                } else {
                    logger.debug('No close button found, clicking body as fallback...');
                    await this.page.click('body', { timeout: 2000 });
                    await this.page.waitForTimeout(1000);
                }
            } catch (e) {
                logger.debug('Could not click close button or body, continuing...');
            }

            // Use the Factorial-specific workflow to find and log any missing hours
            logger.info('🎯 Using flexible workflow to find and log any missing hours...');
            return await this.handleFactorialTimeEntry(defaultEntry);

        } catch (error) {
            logger.error('Failed to log missing hours automatically:', error);
            return false;
        }
    }
}