param(
  [string]$Repository = "Diegogalafassi/imobiliaria",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$token = $env:DIEGO_GITHUB_TOKEN
if (-not $token) {
  throw "Defina DIEGO_GITHUB_TOKEN no ambiente. Tokens nunca devem ficar salvos neste arquivo."
}

$headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json"; "X-GitHub-Api-Version" = "2022-11-28" }
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = @(
  "index.html", "css/style.css", "js/app.js", "js/api.js", "js/utils.js",
  "js/dashboard.js", "js/imoveis.js", "js/pagamentos.js", "js/vendas.js",
  "js/configuracoes.js", "apps-script/Code.gs", "SETUP.md"
)

foreach ($relativePath in $files) {
  $localPath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $localPath)) { throw "Arquivo não encontrado: $relativePath" }
  $remotePath = $relativePath.Replace("\", "/")
  $uri = "https://api.github.com/repos/$Repository/contents/$remotePath"
  $sha = $null
  try { $sha = (Invoke-RestMethod -Uri "$uri`?ref=$Branch" -Headers $headers).sha } catch { if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw } }
  $body = @{ message = "deploy: $remotePath"; content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($localPath)); branch = $Branch }
  if ($sha) { $body.sha = $sha }
  Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json) | Out-Null
  Write-Host "Publicado: $remotePath"
}

Write-Host "Deploy concluído sem credenciais gravadas no projeto."
