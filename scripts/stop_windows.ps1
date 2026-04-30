$ErrorActionPreference = "SilentlyContinue"

docker stop finally
docker rm finally

Write-Host "Container 'finally' stopped and removed. Data volume preserved."
