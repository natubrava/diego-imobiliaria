$ErrorActionPreference = "Stop"
$token = $env:DIEGO_GITHUB_TOKEN
if (-not $token) { throw "Defina DIEGO_GITHUB_TOKEN no ambiente." }
$repository = "Diegogalafassi/imobiliaria"
$remotePath = "apps-script/Code.gs"
$localPath = Join-Path $PSScriptRoot "apps-script\Code.gs"
$headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json"; "X-GitHub-Api-Version" = "2022-11-28" }
$uri = "https://api.github.com/repos/$repository/contents/$remotePath"
$sha = (Invoke-RestMethod -Uri $uri -Headers $headers).sha
$body = @{ message = "backend: atualizar Apps Script"; content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($localPath)); sha = $sha } | ConvertTo-Json
Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -ContentType "application/json" -Body $body | Out-Null
Write-Host "Backend publicado. Faça uma nova implantação no Apps Script se necessário."
