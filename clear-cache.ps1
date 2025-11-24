# Clear TypeScript and Webpack Cache - PowerShell Script
# Run this to fix module resolution errors

Write-Host "Clearing TypeScript and Webpack caches..." -ForegroundColor Cyan

# Clear node_modules cache
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ Cleared node_modules\.cache" -ForegroundColor Green
} else {
    Write-Host "○ node_modules\.cache not found (already clean)" -ForegroundColor Gray
}

# Clear .cache directory
if (Test-Path ".cache") {
    Remove-Item -Recurse -Force ".cache"
    Write-Host "✓ Cleared .cache" -ForegroundColor Green
} else {
    Write-Host "○ .cache not found (already clean)" -ForegroundColor Gray
}

# Clear TypeScript build info
if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item -Force "tsconfig.tsbuildinfo"
    Write-Host "✓ Cleared tsconfig.tsbuildinfo" -ForegroundColor Green
} else {
    Write-Host "○ tsconfig.tsbuildinfo not found (already clean)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✓ Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart VS Code TypeScript server: Ctrl+Shift+P -> 'TypeScript: Restart TS Server'" -ForegroundColor White
Write-Host "2. Start dev server: npm start" -ForegroundColor White
