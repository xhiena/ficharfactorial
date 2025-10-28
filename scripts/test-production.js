#!/usr/bin/env node

/**
 * Production Deployment Test Script
 * 
 * This script helps test and validate the Factorial Time Tracker
 * deployment in production environments (NAS, VPS, dedicated servers).
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionTester {
    constructor() {
        this.testResults = [];
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        console.log(formattedMessage);
    }

    async runTest(testName, testFunction) {
        this.log(`Running test: ${testName}`);
        try {
            await testFunction();
            this.testResults.push({ name: testName, status: 'PASS' });
            this.log(`✅ ${testName} - PASSED`, 'success');
        } catch (error) {
            this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
            this.errors.push(`${testName}: ${error.message}`);
            this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
        }
    }

    async testDockerInstallation() {
        try {
            const version = execSync('docker --version', { encoding: 'utf8' });
            this.log(`Docker version: ${version.trim()}`);
        } catch (error) {
            throw new Error('Docker is not installed or not accessible');
        }
    }

    async testDockerCompose() {
        try {
            const version = execSync('docker-compose --version', { encoding: 'utf8' });
            this.log(`Docker Compose version: ${version.trim()}`);
        } catch (error) {
            throw new Error('Docker Compose is not installed or not accessible');
        }
    }

    async testRequiredFiles() {
        const requiredFiles = [
            'package.json',
            'Dockerfile.simple',
            'docker-compose.production.yml',
            '.env.production',
            'src/index.ts',
            'src/factorial-automation.ts',
            'src/config.ts'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }
        this.log(`All required files present (${requiredFiles.length} files)`);
    }

    async testEnvironmentFile() {
        if (!fs.existsSync('.env.production')) {
            throw new Error('.env.production file not found');
        }

        const envContent = fs.readFileSync('.env.production', 'utf8');
        const requiredVars = [
            'BROWSER_TIMEOUT',
            'PAGE_TIMEOUT',
            'NAVIGATION_TIMEOUT',
            'NODE_OPTIONS'
        ];

        for (const variable of requiredVars) {
            if (!envContent.includes(variable)) {
                throw new Error(`Missing environment variable: ${variable}`);
            }
        }
        this.log('Environment file contains all required production optimizations');
    }

    async testDockerBuild() {
        this.log('Building Docker image for production (this may take a few minutes)...');
        try {
            execSync('docker build -f Dockerfile.simple -t factorial-production-test .', {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            this.log('Docker image built successfully');
        } catch (error) {
            throw new Error(`Docker build failed: ${error.message}`);
        }
    }

    async testNetworkConnectivity() {
        this.log('Testing network connectivity to Factorial HR...');
        try {
            // Test basic connectivity using a lightweight container
            const result = execSync(
                'docker run --rm alpine/curl:latest curl -I -s --connect-timeout 30 https://app.factorialhr.com',
                { encoding: 'utf8', timeout: 35000 }
            );

            if (result.includes('HTTP/2 200') || result.includes('HTTP/1.1 200')) {
                this.log('Network connectivity to Factorial HR: OK');
            } else {
                throw new Error('Unexpected response from Factorial HR');
            }
        } catch (error) {
            throw new Error(`Network connectivity test failed: ${error.message}`);
        }
    }

    async testTimeouts() {
        this.log('Testing timeout configurations...');
        const config = require('./dist/config.js');

        // Check if enhanced timeouts are configured
        if (config.browser.pageTimeout < 60000) {
            throw new Error('Page timeout too low for production environments (should be >= 60s)');
        }

        if (navigationTimeout && navigationTimeout < 90000) {
            throw new Error('Navigation timeout too low for production environments (should be >= 90s)');
        }

        this.log('Timeout configurations are appropriate for production');
    }

    async testContainerStart() {
        this.log('Testing container startup...');
        try {
            // Copy environment file for testing
            if (fs.existsSync('.env')) {
                fs.copyFileSync('.env', '.env.backup');
            }
            fs.copyFileSync('.env.production', '.env');

            // Start the container in detached mode
            execSync('docker-compose -f docker-compose.production.yml up -d', {
                encoding: 'utf8'
            });

            // Wait for container to be ready
            this.log('Waiting for container to start...');
            await this.sleep(10000);

            // Check if container is running
            const containers = execSync('docker ps --filter name=factorial-time-tracker-production --format "{{.Status}}"', {
                encoding: 'utf8'
            });

            if (!containers.includes('Up')) {
                throw new Error('Container failed to start properly');
            }

            this.log('Container started successfully');

            // Clean up
            execSync('docker-compose -f docker-compose.production.yml down', { encoding: 'utf8' });

            // Restore original env file
            if (fs.existsSync('.env.backup')) {
                fs.copyFileSync('.env.backup', '.env');
                fs.unlinkSync('.env.backup');
            }

        } catch (error) {
            // Clean up on error
            try {
                execSync('docker-compose -f docker-compose.production.yml down', { encoding: 'utf8' });
                if (fs.existsSync('.env.backup')) {
                    fs.copyFileSync('.env.backup', '.env');
                    fs.unlinkSync('.env.backup');
                }
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            throw error;
        }
    }

    async testLogDirectory() {
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
            this.log('Created logs directory');
        }

        // Test write permissions
        const testFile = path.join('logs', 'test-write.txt');
        try {
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            this.log('Log directory is writable');
        } catch (error) {
            throw new Error('Log directory is not writable');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runAllTests() {
        this.log('Starting production deployment validation tests...');
        this.log('==========================================');

        await this.runTest('Docker Installation', () => this.testDockerInstallation());
        await this.runTest('Docker Compose Installation', () => this.testDockerCompose());
        await this.runTest('Required Files', () => this.testRequiredFiles());
        await this.runTest('Environment Configuration', () => this.testEnvironmentFile());
        await this.runTest('Log Directory', () => this.testLogDirectory());
        await this.runTest('Network Connectivity', () => this.testNetworkConnectivity());
        await this.runTest('Docker Build', () => this.testDockerBuild());

        // Skip timeout test if config is not compiled
        if (fs.existsSync('dist/config.js')) {
            await this.runTest('Timeout Configuration', () => this.testTimeouts());
        } else {
            this.log('Skipping timeout test (project not compiled)');
        }

        await this.runTest('Container Startup', () => this.testContainerStart());

        this.printSummary();
    }

    printSummary() {
        this.log('==========================================');
        this.log('TEST SUMMARY');
        this.log('==========================================');

        const passed = this.testResults.filter(t => t.status === 'PASS').length;
        const failed = this.testResults.filter(t => t.status === 'FAIL').length;

        this.log(`Total tests: ${this.testResults.length}`);
        this.log(`Passed: ${passed}`, 'success');
        this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');

        if (failed === 0) {
            this.log('🎉 All tests passed! Your production deployment should work correctly.', 'success');
            this.log('You can now deploy using: docker-compose -f docker-compose.production.yml up -d');
        } else {
            this.log('❌ Some tests failed. Please address the following issues:', 'error');
            this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
        }

        this.log('==========================================');
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ProductionTester();
    tester.runAllTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = ProductionTester;