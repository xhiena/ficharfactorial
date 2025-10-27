# Factorial Time Tracker

An automated Playwright application for logging work hours in Factorial HR. This tool helps you automatically track your daily work hours without manually filling out timesheets.

## Features

- 🔐 Automated login to Factorial HR
- 🕐 Log work hours for specific dates
- 📅 Batch log for entire work weeks
- ⚙️ Configurable work schedules
- 🛡️ Robust error handling and logging
- 🚀 Command-line interface

## Prerequisites

- Node.js 18+
- npm or yarn
- Factorial HR account

## TL;DR quick deployment

```bash
cp .env.synology .env
# Edit .env with your credentials
docker-compose -f docker-compose.synology.yml build 
docker-compose -f docker-compose.synology.yml up -d
```

## Setup

1. **Clone/Download the project** (if not already done)

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Install Playwright browsers**:

   ```bash
   npm run install:browsers
   ```

4. **Setup configuration**:

   ```bash
   npm run dev setup
   ```

5. **Configure your credentials**:

   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your actual credentials
   notepad .env  # On Windows
   # or nano .env on Linux/Mac
   ```

   Update the following variables in your `.env` file:

   ```env
   FACTORIAL_EMAIL=your-email@example.com
   FACTORIAL_PASSWORD=your-password
   
   # Optional: Customize default work hours
   DEFAULT_START_TIME=09:00
   DEFAULT_END_TIME=17:00
   DEFAULT_BREAK_MINUTES=60
   ```

6. **Test login**:

   ```bash
   npm run dev login
   ```

## Usage

### Development Commands

All commands use `npm run dev` for development:

### Test Login

```bash
npm run dev login
```

### Log Today's Work Hours

```bash
# Use default hours
npm run dev log-today

# Custom hours
npm run dev log-today --start 08:30 --end 16:30 --break 30 --description "Project work"
```

### Log Current Week (Monday-Friday)

```bash
# Use default hours for all days
npm run dev log-week

# Custom hours for all days
npm run dev log-week --start 09:00 --end 17:00 --break 60
```

### Automatically Log Any Missing Hours

```bash
# Scan for any day with missing hours and log them automatically
npm run dev log-any
```

This flexible command will:

- Scan the current time tracking view for any days with missing hours
- Automatically log hours for any day that needs them
- Use your default work schedule settings
- Perfect for automation - doesn't care about specific dates

### Log Custom Date

```bash
# Specific date with default hours
npm run dev log-custom --date 2024-10-24

# Specific date with custom hours
npm run dev log-custom --date 2024-10-24 --start 08:00 --end 16:00 --break 45 --description "Remote work"
```

### Production Build

To build and run in production mode:

```bash
npm run build
npm start login
```

## Configuration Options

### Environment Variables (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `FACTORIAL_EMAIL` | Your Factorial email | Required |
| `FACTORIAL_PASSWORD` | Your Factorial password | Required |
| `HEADLESS` | Run browser in headless mode | `false` |
| `BROWSER_TIMEOUT` | Browser startup timeout (ms) | `30000` |
| `PAGE_TIMEOUT` | Page operation timeout (ms) | `10000` |
| `DEFAULT_WORK_HOURS` | Default work hours per day | `8` |
| `DEFAULT_START_TIME` | Default start time (HH:MM) | `09:00` |
| `DEFAULT_END_TIME` | Default end time (HH:MM) | `17:00` |
| `DEFAULT_BREAK_MINUTES` | Default break time in minutes | `60` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_FILE` | Log file path | `logs/factorial-automation.log` |

### Command Line Options

Most commands support these options:

- `--start <time>`: Start time in HH:MM format
- `--end <time>`: End time in HH:MM format  
- `--break <minutes>`: Break time in minutes
- `--description <text>`: Work description

## Troubleshooting

### Common Issues

1. **Login fails**:
   - Check your credentials in `.env`
   - Ensure 2FA is disabled or handled properly
   - Check if Factorial's login page has changed

2. **Time entry fails**:
   - Run with `HEADLESS=false` to see what's happening
   - Check if Factorial's interface has been updated
   - Look at the logs in `logs/factorial-automation.log`

3. **Browser doesn't start**:
   - Run `npm run install:browsers` again
   - Check your Node.js version (requires 18+)

4. **Network timeout issues** (especially on Synology NAS):
   - Use the Synology-specific configuration: `docker-compose -f docker-compose.synology.yml up -d`
   - Check the [Synology Deployment Guide](docs/SYNOLOGY_DEPLOYMENT.md) for optimized settings
   - Increase timeout values in `.env` if needed

### Synology NAS Deployment

For Synology NAS users experiencing network timeout issues, we provide a special configuration:

1. **Quick Setup**:

   ```bash
   cp .env.synology .env
   # Edit .env with your credentials
   docker-compose -f docker-compose.synology.yml up -d
   ```

2. **Comprehensive Guide**: See [docs/SYNOLOGY_DEPLOYMENT.md](docs/SYNOLOGY_DEPLOYMENT.md)

3. **Test Deployment**:

   ```bash
   node scripts/test-synology.js
   ```

The Synology configuration includes:

- Extended timeouts optimized for slower NAS networks
- Single-stage Docker build for better compatibility
- Enhanced health checks with longer intervals
- Specific troubleshooting for common NAS issues

### Debug Mode

To see the browser in action, set `HEADLESS=false` in your `.env` file:

```env
HEADLESS=false
```

### Logs

Check the logs for detailed information:

```bash
tail -f logs/factorial-automation.log
```

## Project Structure

```txt
factorial-time-tracker/
├── src/
│   ├── index.ts              # CLI interface
│   ├── config.ts             # Configuration management
│   ├── logger.ts             # Logging setup
│   ├── factorial-automation.ts # Main automation logic
│   └── time-tracker.ts       # Time tracking functionality
├── logs/                     # Log files
├── .env.example             # Environment template
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── playwright.config.ts    # Playwright configuration
```

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique passwords for your Factorial account
- Consider using environment-specific configurations for different setups
- The tool stores credentials locally only - nothing is sent to external services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for personal automation purposes. Make sure you comply with your company's policies regarding automation tools and time tracking. The authors are not responsible for any misuse of this tool.
