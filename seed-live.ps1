Write-Host "Starting Cloud SQL Proxy for database seeding..." -ForegroundColor Green

# Get Cloud SQL connection details
$SQL_CONNECTION_NAME = "livechat-d6db2:us-central1:livechatlog-mysql"

Write-Host "Step 1/3: Starting Cloud SQL Proxy..." -ForegroundColor Yellow
Write-Host "Downloading Cloud SQL Proxy if not exists..." -ForegroundColor Cyan

# Download Cloud SQL Proxy if it doesn't exist
if (-not (Test-Path ".\cloud_sql_proxy.exe")) {
    Write-Host "Downloading Cloud SQL Proxy..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://dl.google.com/cloudsql/cloud_sql_proxy_x64.exe" -OutFile "cloud_sql_proxy.exe"
    Write-Host "Download complete!" -ForegroundColor Green
}

# Start Cloud SQL Proxy in background
Write-Host "Starting Cloud SQL Proxy..." -ForegroundColor Yellow
$proxyProcess = Start-Process -FilePath ".\cloud_sql_proxy.exe" -ArgumentList "$SQL_CONNECTION_NAME" -PassThru -WindowStyle Hidden

Write-Host "Waiting for proxy to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Step 2/3: Setting environment variables for local connection..." -ForegroundColor Yellow
$env:MYSQL_HOST = "127.0.0.1"
$env:MYSQL_PORT = "3306"
$env:MYSQL_USER = "root"
$env:MYSQL_PASSWORD = "ChangeMeInProduction123!"
$env:MYSQL_DATABASE = "livechatlog_database"
$env:API_ENV = "production"

Write-Host "Step 3/3: Running seed script..." -ForegroundColor Yellow
npm run seed

# Stop Cloud SQL Proxy
Write-Host "Stopping Cloud SQL Proxy..." -ForegroundColor Yellow
Stop-Process -Id $proxyProcess.Id -Force

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database seeding completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Error: Database seeding failed" -ForegroundColor Red
    exit 1
}
