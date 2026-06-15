# Octoman Weibo Backup - Project Encoding Configuration

## ⚠️ CRITICAL: UTF-8 Encoding for Chinese Characters

PowerShell on Windows defaults to non-UTF-8 encoding, which will CORRUPT Chinese text.
**Always use .NET methods** to read/write files with Chinese content:

```powershell
# READ (UTF-8 safe)
$content = [System.IO.File]::ReadAllText('path\to\file.js', [System.Text.Encoding]::UTF8)

# WRITE (UTF-8 without BOM)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('path\to\file.js', $content, $utf8NoBom)
```

**AVOID these PowerShell cmdlets** (they corrupt UTF-8 in most versions):
- ❌ `Set-Content` (defaults to ANSI/UTF-16)
- ❌ `Out-File` (defaults to UTF-16)
- ❌ `Add-Content` (defaults to ANSI)

## Git Bash (Recommended for encoding-safe operations)

Git Bash is installed at: `C:\Program Files\Git\bin\bash.exe`

For safe file operations with Chinese characters:
```powershell
& "C:\Program Files\Git\bin\bash.exe" -c "cat file.js | head -5"
& "C:\Program Files\Git\bin\bash.exe" -c "echo '中文测试' > test.txt"
```

## Verify File Encoding
```powershell
# Check for BOM at start of file
$b = [System.IO.File]::ReadAllBytes('background.js')
if ($b[0] -eq 239 -and $b[1] -eq 187 -and $b[2] -eq 191) {
  Write-Host "BOM FOUND - remove it!"
}
```