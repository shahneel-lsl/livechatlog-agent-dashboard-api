Write-Host "Building and deploying seed job to Cloud Run..." -ForegroundColor Green

# Get Cloud SQL connection details
Write-Host "Fetching Cloud SQL instance connection details..." -ForegroundColor Yellow
$SQL_CONNECTION_NAME = gcloud sql instances describe livechatlog-mysql --project=livechat-d6db2 --format="value(connectionName)"
Write-Host "SQL Connection Name: $SQL_CONNECTION_NAME" -ForegroundColor Cyan

Write-Host "Step 1/4: Building Docker image for seed job..." -ForegroundColor Yellow
docker build -t livechatlog-seed:latest -f Dockerfile.seed .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2/4: Tagging Docker image..." -ForegroundColor Yellow
docker tag livechatlog-seed:latest gcr.io/livechat-d6db2/livechatlog-seed:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker tag failed" -ForegroundColor Red
    exit 1
}

Write-Host "Step 3/4: Pushing to Google Container Registry..." -ForegroundColor Yellow
docker push gcr.io/livechat-d6db2/livechatlog-seed:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker push failed" -ForegroundColor Red
    exit 1
}

Write-Host "Step 4/4: Running Cloud Run Job..." -ForegroundColor Yellow
gcloud run jobs deploy livechatlog-seed `
    --image gcr.io/livechat-d6db2/livechatlog-seed:latest `
    --region us-central1 `
    --add-cloudsql-instances $SQL_CONNECTION_NAME `
    --set-env-vars "MYSQL_SOCKET_PATH=/cloudsql/$SQL_CONNECTION_NAME,MYSQL_USER=root,MYSQL_PASSWORD=ChangeMeInProduction123!,MYSQL_DATABASE=livechatlog_database,API_ENV=production" `
    --project livechat-d6db2 `
    --execute-now

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Cloud Run Job failed" -ForegroundColor Red
    exit 1
}

Write-Host "Database seeding completed successfully!" -ForegroundColor Green
