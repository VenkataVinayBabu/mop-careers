<#
    Back up the MOP Careers database to a file on this machine.

    WHY THIS EXISTS. The live database is on Render's free PostgreSQL tier,
    which EXPIRES. When it lapses the database is not suspended, it is
    deleted -- students, batches, attendance, fees, placements, enquiries and
    every table behind the public website. A backup taken today is the only
    thing that makes that recoverable.

    Upgrading the instance is the real fix; this is the insurance either way,
    and it is worth having even on a paid plan.

    USAGE

      Live database (get the External Database URL from the Render dashboard,
      mop-careers-db > Connections > External Database URL):

          .\backup.ps1 -DatabaseUrl "postgresql://user:pass@host/dbname"

      Or set it once for the session and just run the script:

          $env:BACKUP_DATABASE_URL = "postgresql://..."
          .\backup.ps1

      Local database (reads backend/.env):

          .\backup.ps1 -Local

    The URL is a secret -- it grants full access to every student record. Do
    not paste it into a chat, a ticket or a commit. Passing it as an argument
    puts it in your PowerShell history; the environment-variable form avoids
    that and is the better habit.

    RESTORING is at the bottom of this file.
#>

[CmdletBinding()]
param(
    [string]$DatabaseUrl,
    [switch]$Local,
    [string]$OutDir = (Join-Path $PSScriptRoot 'backups')
)

$ErrorActionPreference = 'Stop'

# --- find pg_dump ---------------------------------------------------------
# Not usually on PATH on Windows, so look where the installer puts it before
# giving up. A version mismatch matters: pg_dump must be at least as new as
# the server it is dumping, or it refuses.
$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
    $candidates = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
                  Sort-Object FullName -Descending
    if ($candidates) { $pgDump = $candidates[0].FullName }
}
if (-not $pgDump) {
    Write-Error "pg_dump not found. Install the PostgreSQL client tools, or add its bin folder to PATH."
}

# --- work out which database ----------------------------------------------
if ($Local) {
    $envFile = Join-Path $PSScriptRoot 'backend\.env'
    if (-not (Test-Path $envFile)) { Write-Error "backend\.env not found." }
    $line = Select-String -Path $envFile -Pattern '^\s*DATABASE_URL\s*=' | Select-Object -First 1
    if (-not $line) { Write-Error "No DATABASE_URL in backend\.env." }
    $DatabaseUrl = ($line.Line -replace '^\s*DATABASE_URL\s*=', '').Trim().Trim('"').Trim("'")
    $label = 'local'
}
elseif (-not $DatabaseUrl) {
    $DatabaseUrl = $env:BACKUP_DATABASE_URL
    $label = 'remote'
}
else {
    $label = 'remote'
}

if (-not $DatabaseUrl) {
    Write-Error "No database URL. Pass -DatabaseUrl, set BACKUP_DATABASE_URL, or use -Local."
}

# SQLAlchemy's driver suffix is not a thing libpq understands.
$DatabaseUrl = $DatabaseUrl -replace '^postgresql\+psycopg2://', 'postgresql://'

# --- dump -----------------------------------------------------------------
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$outFile = Join-Path $OutDir "mop-careers_${label}_$stamp.dump"

Write-Host "Backing up the $label database with $pgDump ..."
Write-Host "  -> $outFile"

# Custom format (-Fc): compressed, and restorable table by table with
# pg_restore rather than all-or-nothing. --no-owner/--no-acl so the dump can
# be restored into a database owned by a different role, which it will be.
& $pgDump --format=custom --no-owner --no-acl --file=$outFile $DatabaseUrl
if ($LASTEXITCODE -ne 0) { Write-Error "pg_dump failed with exit code $LASTEXITCODE." }

$size = (Get-Item $outFile).Length
if ($size -lt 1024) {
    Write-Error "The dump is only $size bytes -- that is not a real backup. Investigate before trusting it."
}

$pgRestore = $pgDump -replace 'pg_dump', 'pg_restore'

Write-Host ''
Write-Host ("Done. {0:N0} KB written." -f ($size / 1KB)) -ForegroundColor Green
Write-Host 'Keep a copy somewhere that is not this laptop.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'To list what is inside it:'
Write-Host ('  "{0}" --list "{1}"' -f $pgRestore, $outFile)
Write-Host ''
Write-Host 'To restore into a fresh, EMPTY database:'
Write-Host ('  "{0}" --no-owner --no-acl --dbname "NEW_DATABASE_URL_HERE" "{1}"' -f $pgRestore, $outFile)
Write-Host ''
Write-Host 'Restoring over a database that already has these tables fails on conflicts.'
Write-Host 'Restore into an empty one, then point the app at it.'
