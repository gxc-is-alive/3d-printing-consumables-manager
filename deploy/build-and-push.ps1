# 3D打印耗材管理系统 - 构建并推送镜像 (PowerShell版本)
# 用法: .\build-and-push.ps1 [tag]
# 示例: .\build-and-push.ps1 v1.1.0

param(
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

# 配置
$IMAGE_NAME = "crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com/family-accounting/3dprint"
$FULL_IMAGE = "${IMAGE_NAME}:${Tag}"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "3D打印耗材管理系统 - 构建并推送镜像" -ForegroundColor Green
Write-Host "镜像: $FULL_IMAGE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# 进入项目根目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptPath "..")

# 构建镜像
Write-Host "正在构建镜像..." -ForegroundColor Yellow
docker build -t $FULL_IMAGE -f Dockerfile .

if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败！" -ForegroundColor Red
    exit 1
}

# 同时打上 latest 标签
if ($Tag -ne "latest") {
    Write-Host "打上 latest 标签..." -ForegroundColor Yellow
    docker tag $FULL_IMAGE "${IMAGE_NAME}:latest"
}

# 推送镜像
Write-Host "正在推送镜像..." -ForegroundColor Yellow
docker push $FULL_IMAGE

if ($LASTEXITCODE -ne 0) {
    Write-Host "推送失败！" -ForegroundColor Red
    exit 1
}

if ($Tag -ne "latest") {
    Write-Host "推送 latest 标签..." -ForegroundColor Yellow
    docker push "${IMAGE_NAME}:latest"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "构建并推送完成！" -ForegroundColor Green
Write-Host "镜像: $FULL_IMAGE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
