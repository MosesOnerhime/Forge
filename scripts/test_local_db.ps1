param(
  [int]$Port = 5433,
  [string]$PostgresBin = 'C:\Program Files\PostgreSQL\16\bin'
)

$ErrorActionPreference = 'Stop'
$forgeRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$forgeCluster = Join-Path $forgeRoot '.localpg'
$forgeExpected = [IO.Path]::GetFullPath($forgeCluster)
$forgeInit = Join-Path $PostgresBin 'initdb.exe'
$forgeCtl = Join-Path $PostgresBin 'pg_ctl.exe'
$forgeCreatedb = Join-Path $PostgresBin 'createdb.exe'
$forgePsql = Join-Path $PostgresBin 'psql.exe'

if (Test-Path -LiteralPath $forgeCluster) {
  throw "Refusing to replace an existing cluster at $forgeCluster"
}
foreach ($tool in @($forgeInit, $forgeCtl, $forgeCreatedb, $forgePsql)) {
  if (-not (Test-Path -LiteralPath $tool)) { throw "PostgreSQL tool missing: $tool" }
}

Push-Location $forgeRoot
try {
  & $forgeInit -D $forgeCluster -A trust -U forge_test --no-instructions
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
  & $forgeCtl -D $forgeCluster -l (Join-Path $forgeCluster 'server.log') -o "-p $Port" start
  if ($LASTEXITCODE -ne 0) { throw 'pg_ctl start failed' }
  & $forgeCreatedb -h localhost -p $Port -U forge_test forge_migration_test
  if ($LASTEXITCODE -ne 0) { throw 'createdb failed' }
  $forgePsqlArgs = @('-X', '-v', 'ON_ERROR_STOP=1', '-h', 'localhost', '-p', $Port, '-U', 'forge_test', '-d', 'forge_migration_test', '-f', 'scripts/local_db_bootstrap.sql')
  foreach ($migration in (Get-ChildItem -LiteralPath (Join-Path $forgeRoot 'supabase/migrations') -Filter '*.sql' | Sort-Object Name)) {
    $forgePsqlArgs += @('-f', $migration.FullName)
  }
  $forgePsqlArgs += @('-f', 'scripts/local_db_checks.sql')
  & $forgePsql @forgePsqlArgs
  if ($LASTEXITCODE -ne 0) { throw 'Migration checks failed' }
} finally {
  if (Test-Path -LiteralPath $forgeCluster) {
    & $forgeCtl -D $forgeCluster status *> $null
    if ($LASTEXITCODE -eq 0) {
      & $forgeCtl -D $forgeCluster stop -m fast
      if ($LASTEXITCODE -ne 0) { throw 'Database did not stop; cluster was left in place' }
    }
    $forgeResolved = (Resolve-Path -LiteralPath $forgeCluster).Path
    if ($forgeResolved -ne $forgeExpected -or -not $forgeResolved.StartsWith($forgeRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove unexpected cluster path: $forgeResolved"
    }
    Remove-Item -LiteralPath $forgeResolved -Recurse -Force
  }
  Pop-Location
}
