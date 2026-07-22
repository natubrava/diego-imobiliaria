$ErrorActionPreference = "Stop"
$apiUrl = $env:DIEGO_API_URL
$accessToken = $env:DIEGO_APP_TOKEN
if (-not $apiUrl -or -not $accessToken) {
  throw "Defina DIEGO_API_URL e DIEGO_APP_TOKEN no ambiente antes de importar."
}

$csvPath = Join-Path $PSScriptRoot "data\locacoes-2026.csv"
$rows = Import-Csv -LiteralPath $csvPath -Delimiter ";"
$valid = @()
foreach ($row in $rows) {
  if (-not $row.valorPadrao -or -not $row.diaVencimentoPadrao) {
    Write-Warning "Pendente de dados, não importado: $($row.nome)"
    continue
  }
  $valid += @{
    nome = $row.nome
    mesReajuste = $row.mesReajuste
    diaVencimentoPadrao = $row.diaVencimentoPadrao
    valorPadrao = [decimal]::Parse($row.valorPadrao, [Globalization.CultureInfo]::InvariantCulture)
    status = "ativo"
  }
}

$payload = @{ items = $valid } | ConvertTo-Json -Depth 5 -Compress
$body = @{ action = "importLocacoes"; token = $accessToken; data = $payload }
$result = Invoke-RestMethod -Uri $apiUrl -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body
if ($result.error) { throw $result.error }
Write-Host "$($result.created) locações criadas; $($result.updated) atualizadas."
