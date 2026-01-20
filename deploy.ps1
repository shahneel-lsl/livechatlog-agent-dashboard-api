Write-Host "Starting deployment process for LiveChatLog Dashboard API..." -ForegroundColor Green

# Get Cloud SQL connection details
Write-Host "Fetching Cloud SQL instance connection details..." -ForegroundColor Yellow
$SQL_CONNECTION_NAME = gcloud sql instances describe livechatlog-mysql --project=livechat-application-481611 --format="value(connectionName)"
Write-Host "SQL Connection Name: $SQL_CONNECTION_NAME" -ForegroundColor Cyan

# Redis disabled - comment out Redis section
# Write-Host "Fetching Redis instance details..." -ForegroundColor Yellow
# $REDIS_HOST = gcloud redis instances describe livechatlog-redis --region=us-central1 --project=livechat-application-481611 --format="value(host)" 2>$null
# if ($LASTEXITCODE -ne 0) {
#     Write-Host "Warning: Redis instance not found or not ready. Deployment will continue..." -ForegroundColor Yellow
#     $REDIS_HOST = "localhost"
# }
# Write-Host "Redis Host: $REDIS_HOST" -ForegroundColor Cyan

Write-Host "Step 1/4: Building Docker image..." -ForegroundColor Yellow
docker build -t livechatlog-dashboard-api:latest .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2/4: Tagging Docker image..." -ForegroundColor Yellow
docker tag livechatlog-dashboard-api:latest gcr.io/livechat-application-481611/livechatlog-dashboard-api:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker tag failed" -ForegroundColor Red
    exit 1
}

Write-Host "Step 3/4: Pushing to Google Container Registry..." -ForegroundColor Yellow
docker push gcr.io/livechat-application-481611/livechatlog-dashboard-api:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker push failed" -ForegroundColor Red
    exit 1
}

Write-Host "Step 4/4: Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy livechatlog-dashboard-api `
    --image gcr.io/livechat-application-481611/livechatlog-dashboard-api:latest `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --port 3000 `
    --timeout 300 `
    --memory 1Gi `
    --cpu 1 `
    --add-cloudsql-instances $SQL_CONNECTION_NAME `
    --set-env-vars "MYSQL_SOCKET_PATH=/cloudsql/$SQL_CONNECTION_NAME,MYSQL_USER=root,MYSQL_PASSWORD=ChangeMeInProduction123!,MYSQL_DATABASE=livechatlog_database,API_ENV=production,JWT_SECRET=A_RE4Ws3u+P8q?vU`$d,JWT_EXPIRES_IN=7d,FIREBASE_PROJECT_ID=livechat-application-481611,FIREBASE_PRIVATE_KEY_ID=4686a4ee3497929516ba9d8ee481c831aff8df40,FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzKYKqS+uLjPCh\nvVv9pJMbig2uwgo0p9mOKMsfqSSnknaECLoiZsYe4Fwj2Umi89p4dHXr9sVHwXKB\nXyJIUk39+1q/AMpaMf2tjMRw5HFY0YSEG+hCiRT9dt13UR0g/C2eX4Hh238s8dRv\n0eYYPomp6orYEzhu9A/5ocNOCbI3Fh+lXRrpJ6+AkWvxqUFoE5DNqdzk2MwjuZQ3\ngJXcssTOqSzfzCG9MNI0YX7TO3OPYycNV9MPPy4Vp2hN0ronMTWuaAyXHNnytklT\nQ1ZD3J/Bo6W3XV2GFfdiS4Oq0rCJ4wqbIP7ogFbndPFdv4PUwJiTT3O0AuZqTdbF\nNDcFy001AgMBAAECggEADgNjKvrBM6sUbzImbdJfhznnFBItRi0SwSHDsXhDW7AD\nARTFqkcrm+KkklE+hzZXkjBZwNkOWSxyTlgokEuPuhvc3y+qpB9g3iAyhTn4+593\no/Wi1wFt2N1hOSHpC1luIAMMX6QRcGyB1zUtsBvEHLwxm/D06wi/7yCN7B6qB9Db\ncpNNanG9heDJKfV3D7kCwlq7E5yHKhy+oRPLRBEo3Qw/XpT+e1WwzohclfDljBkH\nGqcIvUcd7skb9RviymyRCchs5I67cdGBci9a+hygYH1zpDjoUkjB1b1WNVzgi0y4\nAROptPnso68vlag0O5U7+H733b6slg9D3udRvrczCQKBgQDwfGrqvp9PQR3SDpWa\n7YyVIuTiiE2W7P2jaCiIR5bf283G5vgfMCGbE9GM/UhwmFK3mczZ+bCILxt3I0Vq\nGohI1qZrgrIbnc95smMnQTFbg7TKYaaob/bQ8OtP0X06bDIKhm8iKnOBBalkS1hr\nl/uLoM4kwiXZlOrUv4l3hkJZWwKBgQC+uFcrlYysLY6eC395EounTDSs72Q2+s8U\nxtUwctPuoH98NFcaaBgZDSBrYM/6bOW5rirQ6mo67kkVUB2mCH8zcU2hoUVJin3F\nWx4Nk4TjGZWOCqyXj7mpw57ufskhaAqHu2qBt5N/NAHshJRY305P4eCtsrXhJeZb\ngkLv8I4orwKBgHtKXgoRRl18dcxeW8a86KkA5bVZyeWJhJOE79rGUQxdhQbnHOfo\nZiI6K+GLbNsEzMuCFyrdPuris8MFmy3Fgn9NRK6zp5pO8rJiiUDzxFk1kbd8DtQl\n6rS9/vXB4eDU3WbV+x3aA7Nu8qQPmLo4hebUvzrLKlp9ZVNDCzfy5gsnAoGASoB2\nROdRoXzWZnS1YhVVio/hT+DgM/374PDfHOLuWRxHULydfgpFx5tyG6Ag/oGFp+ga\nf6vivYyR7gpy2oYdMnpDSi1WhKjeArdaYRFMau52lpsi2r3hWCi7sAzFAxDCdE1J\nCM0uiBVH3x3XWXQ6AkiJXTEfjYkhmIOlJFfDIK8CgYBZiyNAVQvdme5DETYoK+b7\np8QbU4Cfcg8juvlm7YjCxsDac+k9yWzT3jsKPu3gtKfbshaMqt2/LoukiLa2UppS\nS+MqP8wv2Jz4nYxBD6gvqzTFUWLHORjo+y9TjRKr+q61cZ8QgMFDM0RlxmOrC52B\nJJrIzPm4tvrPnzmbo6dXmg==\n-----END PRIVATE KEY-----\n,FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@livechat-application-481611.iam.gserviceaccount.com,FIREBASE_CLIENT_ID=100539470768735373277,FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40livechat-application-481611.iam.gserviceaccount.com,FIREBASE_DATABASE_URL=https://livechat-application-481611-default-rtdb.firebaseio.com" `
    --project livechat-application-481611

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Note: Remember to set your environment variables (Firebase, Email, Twilio, etc.) in Cloud Run console" -ForegroundColor Yellow
