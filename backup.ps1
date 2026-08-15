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
# The NEWEST installed client wins, and PATH does not get the first word.
#
# It used to take whatever `pg_dump` resolved to on PATH and only scan if that
# found nothing. That is wrong on exactly the machine this matters on: install
# PostgreSQL 18 alongside 17 and PATH still points at 17, so the backup keeps
# failing against an 18 server while a working client sits on disk unused.
#
# Sorted by version NUMBER, not by path text — a string sort puts "9.6" above
# "18" and would pick the oldest client on the machine.
$installed = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
             Sort-Object { [double]($_.Directory.Parent.Name) } -Descending

if ($installed) {
    $pgDump = $installed[0].FullName
} else {
    # Nothing in the standard location — fall back to PATH, which covers a
    # client installed somewhere else entirely.
    $pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
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
if ($LASTEXITCODE -ne 0) {
    # pg_dump leaves a 0-byte file behind when it aborts. Left in place it
    # looks exactly like a backup in a directory listing, which is the worst
    # possible thing for a file whose entire job is being there in a crisis.
    if ((Test-Path $outFile) -and (Get-Item $outFile).Length -eq 0) {
        Remove-Item $outFile -Force
    }

    # By far the most common cause, and the message pg_dump gives is true but
    # not actionable. Render upgrades its Postgres, this client does not, and
    # the fix is never obvious at 11pm.
    Write-Host ''
    Write-Host 'If that said "server version mismatch": the live database is newer than' -ForegroundColor Yellow
    Write-Host 'your pg_dump. A client can dump its own version or older, never newer.' -ForegroundColor Yellow
    Write-Host 'Install the matching PostgreSQL COMMAND LINE TOOLS (you do not need a' -ForegroundColor Yellow
    Write-Host 'second server) and re-run — this script picks the newest one it finds:' -ForegroundColor Yellow
    Write-Host '  https://www.enterprisedb.com/downloads/postgres-postgresql-downloads' -ForegroundColor Yellow
    Write-Host ''
    Write-Error "pg_dump failed with exit code $LASTEXITCODE."
}

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
