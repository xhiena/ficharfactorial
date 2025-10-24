@echo off
echo Setting up Factorial Time Tracker...
echo.

if not exist .env (
    echo Copying .env.example to .env...
    copy .env.example .env
    echo.
    echo Please edit .env file with your Factorial credentials:
    echo - Open .env in your text editor
    echo - Replace 'your-email@example.com' with your actual Factorial email
    echo - Replace 'your-password' with your actual Factorial password
    echo.
    pause
    notepad .env
) else (
    echo .env file already exists.
)

echo.
echo Testing login...
npm run dev login

echo.
echo Setup complete! You can now use:
echo   npm run dev log-today       - Log today's work hours
echo   npm run dev log-week        - Log current week's hours  
echo   npm run dev log-custom --date YYYY-MM-DD - Log specific date
echo.
pause