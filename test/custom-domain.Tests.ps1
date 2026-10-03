$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$failures = @()

$viteConfig = Get-Content -Raw (Join-Path $projectRoot 'vite.config.js')
if ($viteConfig -notmatch 'base:\s*[''"]\/[''"]') {
  $failures += 'Vite base must be / for the custom domain.'
}

$cnamePath = Join-Path $projectRoot 'public\CNAME'
if (-not (Test-Path -LiteralPath $cnamePath)) {
  $failures += 'public/CNAME must exist.'
} elseif ((Get-Content -Raw $cnamePath).Trim() -ne 'airtriage.anulab.tech') {
  $failures += 'public/CNAME must contain airtriage.anulab.tech.'
}

$workflowPath = Join-Path $projectRoot '.github\workflows\deploy-pages.yml'
$workflow = Get-Content -Raw $workflowPath
if ($workflow -notmatch 'test/custom-domain\.Tests\.ps1') {
  $failures += 'The Pages workflow must run the custom-domain regression test.'
}

if ($failures.Count -gt 0) {
  throw ($failures -join [Environment]::NewLine)
}

Write-Output 'Custom-domain configuration is valid.'
