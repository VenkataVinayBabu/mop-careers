<#
    Restore a MOP Careers backup into a fresh, empty database.

    WHY THIS EXISTS. The restore is the half of the backup story that never
    gets rehearsed. backup.ps1 has run many times; the restore has been a
    connection string typed by hand into a terminal, with the password in it,
    at the exact moment somebody is under pressure. That is where the typo
    lands, and where the password ends up in PowerShell history.

    It also checks the result. A restore that half-finishes still looks like a
    database, and one with 19 of 28 tables looks fine until the first student
    cannot sign in.

    USAGE

      Set the target once for the session so it stays out of your history:

          $env:RESTORE_DATABASE_URL = "postgresql://mop:PASSWORD@ENDPOINT:5432/mop_careers?sslmode=require"
          .\restore.ps1

      Or name a dump explicitly (the newest in backups\ is used otherwise):

          .\restore.ps1 -DumpFile "backups\mop-careers_remote_2026-09-04_003338.dump"

      To check an already-restored database without restoring again:

          .\restore.ps1 -VerifyOnly

    The URL is a secret -- it grants full access to every student record. Do
    not paste it into a chat, a ticket or a commit.
#>

[CmdletBinding()]
param(
    [string]$DatabaseUrl,
    [string]$DumpFile,
    [switch]$VerifyOnly,
    # Restoring over tables that already exist fails on conflicts, one noisy
    # error per object, and leaves a half-merged database behind. The script
    # refuses by default; this is the deliberate override.
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# --- find the client tools ------------------------------------------------
# Same rule as backup.ps1, and it matters for the same reason: PATH on this
# machine points at PostgreSQL 17 while the server is 18. Sorted by version
# NUMBER -- a string sort puts "9.6" above "18" and picks the oldest client.
$installed = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_restore.exe' -ErrorAction SilentlyContinue |
             Sort-Object { [double]($_.Directory.Parent.Name) } -Descending

if ($installed) {
    $pgRestore = $installed[0].FullName
} else {
    $pgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue).Source
}
if (-not $pgRestore) {
    Write-Error "pg_restore not found. Install the PostgreSQL client tools, or add its bin folder to PATH."
}
$psql = $pgRestore -replace 'pg_restore', 'psql'

# --- work out the target --------------------------------------------------
if (-not $DatabaseUrl) { $DatabaseUrl = $env:RESTORE_DATABASE_URL }
if (-not $DatabaseUrl) {
    Write-Error "No database URL. Pass -DatabaseUrl, or set RESTORE_DATABASE_URL."
}
$DatabaseUrl = $DatabaseUrl -replace '^postgresql\+psycopg2://', 'postgresql://'

# RDS accepts unencrypted connections, and libpq's default sslmode is
# 'prefer' -- which silently falls back to plaintext rather than failing. Over
# the public internet that is every student record in the clear, so say it
# rather than leaving it to a default.
#
# Only for remote hosts. A local PostgreSQL is built without SSL support by
# default, and requiring it there fails with "server does not support SSL" --
# which looks like a broken script rather than a deliberate policy.
$dbHost = ''
try { $dbHost = ([uri]$DatabaseUrl).Host } catch { }
$isLocal = $dbHost -in @('localhost', '127.0.0.1', '::1', '')

if (-not $isLocal -and $DatabaseUrl -notmatch 'sslmode=') {
    Write-Host "Note: no sslmode in the URL. Adding sslmode=require." -ForegroundColor Yellow
    $sep = '?'
    if ($DatabaseUrl -match '\?') { $sep = '&' }
    $DatabaseUrl = "$DatabaseUrl$sep" + "sslmode=require"
}

# --- work out the dump ----------------------------------------------------
# Newest by write time, not by filename: the timestamps in the names sort
# correctly today, but one manually renamed copy breaks that quietly.
if (-not $VerifyOnly) {
    if (-not $DumpFile) {
        $newest = Get-ChildItem (Join-Path $PSScriptRoot 'backups\*.dump') -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $newest) { Write-Error "No .dump files in backups\. Run backup.ps1 first." }
        $DumpFile = $newest.FullName
    }
    if (-not (Test-Path $DumpFile)) { Write-Error "Dump not found: $DumpFile" }

    $dumpSize = (Get-Item $DumpFile).Length
    if ($dumpSize -lt 1024) {
        Write-Error "That dump is only $dumpSize bytes -- it is not a real backup."
    }

    # What is actually inside it, before touching anything. A dump that
    # predates a migration restores a database the code does not match, which
    # is a mistake this project has already come close to: the August dump has
    # 26 tables and knows nothing about assignments.
    $toc = & $pgRestore --list $DumpFile
    $dumpTables = @($toc | Select-String 'TABLE DATA public').Count
    $dumpedFrom = (($toc | Select-String 'Dumped from database version') -replace '.*version:\s*', '').Trim()

    Write-Host ''
    Write-Host "Dump:    $DumpFile"
    Write-Host ("         {0:N0} KB, {1} tables, from PostgreSQL {2}" -f ($dumpSize / 1KB), $dumpTables, $dumpedFrom)
}

# --- is the target reachable, and is it empty? ----------------------------
$existing = & $psql $DatabaseUrl -tAc "select count(*) from information_schema.tables where table_schema = 'public'"
if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'Could not connect. The usual causes, in order:' -ForegroundColor Yellow
    Write-Host '  1. The RDS security group does not allow your IP. A home IP changes,' -ForegroundColor Yellow
    Write-Host '     so re-check the inbound rule (Source: My IP) whenever this starts failing.' -ForegroundColor Yellow
    Write-Host '  2. Public access is set to No on the instance.' -ForegroundColor Yellow
    Write-Host '  3. Wrong password, or the database name is missing from the URL.' -ForegroundColor Yellow
    Write-Error "Connection failed."
}
$existing = [int]($existing | Out-String).Trim()

if (-not $VerifyOnly) {
    if ($existing -gt 0 -and -not $Force) {
        Write-Error "The target already has $existing tables in 'public'. Restore into an EMPTY database, or pass -Force if you are certain."
    }

    Write-Host ''
    Write-Host "Restoring with $pgRestore ..."

    # --no-owner/--no-acl: the dump came from a database owned by Render's
    # role, which does not exist on the new server. Without these, every
    # GRANT and every ALTER OWNER fails.
    # --exit-on-error: the default is to carry on and report a count at the
    # end, which is how a half-restored database gets mistaken for a good one.
    & $pgRestore --no-owner --no-acl --exit-on-error --dbname $DatabaseUrl $DumpFile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "pg_restore failed with exit code $LASTEXITCODE. The target is now half-populated -- drop and recreate the database rather than re-running over it."
    }
}

# --- verify ---------------------------------------------------------------
Write-Host ''
Write-Host 'Checking what landed...'

$tableCount = [int]((& $psql $DatabaseUrl -tAc "select count(*) from information_schema.tables where table_schema = 'public'") | Out-String).Trim()
$rowCounts  = ((& $psql $DatabaseUrl -tAc "select 'users=' || (select count(*) from users) || '  programs=' || (select count(*) from programs) || '  batches=' || (select count(*) from batches)") | Out-String).Trim()
$stamped    = ((& $psql $DatabaseUrl -tAc "select version_num from alembic_version") | Out-String).Trim()

# The migration the CODE expects: the one revision that no other migration
# names as its down_revision. Worked out from the repo rather than hardcoded,
# so this check does not go stale the next time a migration is added.
$versionsDir = Join-Path $PSScriptRoot 'backend\alembic\versions'
$revisions = @{}
$downs = @{}
Get-ChildItem (Join-Path $versionsDir '*.py') | ForEach-Object {
    $text = Get-Content $_.FullName -Raw
    if ($text -match "(?m)^revision(?::\s*str)?\s*=\s*['`"]([^'`"]+)['`"]") { $revisions[$Matches[1]] = $true }
    if ($text -match "(?m)^down_revision(?::\s*[^=]+)?\s*=\s*['`"]([^'`"]+)['`"]") { $downs[$Matches[1]] = $true }
}
$head = @($revisions.Keys | Where-Object { -not $downs.ContainsKey($_) })

Write-Host ''
Write-Host "  Tables in public:  $tableCount"
Write-Host "  Rows:              $rowCounts"
Write-Host "  Schema version:    $stamped"

if ($head.Count -eq 1) {
    if ($stamped -eq $head[0]) {
        Write-Host "  Code expects:      $($head[0]) -- matches." -ForegroundColor Green
    } else {
        Write-Host "  Code expects:      $($head[0])" -ForegroundColor Yellow
        Write-Host ''
        Write-Host 'The dump is older than the code. Not fatal -- "alembic upgrade head" runs' -ForegroundColor Yellow
        Write-Host 'on every deploy and will bring it forward. Worth knowing that it will.' -ForegroundColor Yellow
    }
} else {
    Write-Host "  Could not determine a single migration head ($($head.Count) found)." -ForegroundColor Yellow
}

if ($tableCount -lt 28) {
    Write-Host ''
    Write-Error "Only $tableCount tables. A complete restore of this app has at least 28. Do NOT point the app at this database."
}

Write-Host ''
Write-Host 'Restore verified.' -ForegroundColor Green
Write-Host ''
Write-Host 'Next: point the EXISTING Render backend at this URL before moving any hosting.' -ForegroundColor Cyan
Write-Host 'If anything breaks, change DATABASE_URL back -- nothing has been lost.' -ForegroundColor Cyan
