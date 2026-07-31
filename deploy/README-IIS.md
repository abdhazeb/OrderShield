# IIS Deployment (Frontend + /api Reverse Proxy)

This setup serves Angular from IIS and reverse-proxies `/api/*` to the internal API IIS site.
The API now applies EF Core migrations automatically on first production startup.

## 1) Build deployment packages on this machine

From repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build-packages.ps1
```

Optional (if your internal API site uses a different URL/port):

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build-packages.ps1 -ApiProxyUrl "http://127.0.0.1:5018"
```

Output folders are generated under:

- `artifacts/deploy/frontend`
- `artifacts/deploy/api`

The API package includes `migrations.sql`, an idempotent script covering every migration —
see "Updating the database" below.

## 2) Server prerequisites

Install on the IIS server:

- IIS Web Server role
- URL Rewrite module
- Application Request Routing (ARR), then enable proxy at server level
- .NET 8 ASP.NET Core Hosting Bundle

## 3) Deploy API output (internal IIS site)

1. Copy `artifacts/deploy/api` to `C:\inetpub\ordershield\api`.
2. In `C:\inetpub\ordershield\api\appsettings.Production.json`, use:

```json
"DefaultConnection": "Server=.;Database=OrderShieldProDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=true"
```

3. Create app pool `OrderShieldPro.ApiPool` (No Managed Code).
4. Create IIS site `OrderShieldPro.Api.Internal`:
   - Physical path: `C:\inetpub\ordershield\api`
   - Binding: `http`, IP `127.0.0.1`, Port `5017`
5. Grant Modify permission to the API app pool identity on:
   - `C:\inetpub\ordershield\api\uploads` (evidence and payment proof files)
   - `C:\inetpub\ordershield\api\logs` (rolling Serilog files)
6. Configure required secrets — see the next section. **The API will not start without a JWT secret.**
7. On first API start, migrations are applied and the database is created if it does not exist.

### 3b) Updating the database

Automatic migration only runs when the app pool actually starts on the *new* binaries. If files
are copied over a running site and the pool is never recycled, the schema stays behind while the
new code expects the new columns — that is the usual reason production looks out of date.

Either recycle the app pool after copying, or apply the shipped script, which is safe to run
repeatedly and on any version of the database (each migration is guarded by a check against
`__EFMigrationsHistory`):

```powershell
sqlcmd -S . -d OrderShieldProDb -E -i C:\inetpub\ordershield\api\migrations.sql
```

Back up the database first (see "Backups" below). To confirm what is applied:

```powershell
sqlcmd -S . -d OrderShieldProDb -E -Q "SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId"
```

### 3a) Required secrets and settings

`appsettings.json` intentionally contains **no** signing key or SMTP password. Supply them
per-server, either as environment variables on the app pool or in
`appsettings.Production.json` on the server.

**`appsettings.Production.json` is tracked in this repo and ships with the API package**, so a
deploy overwrites whatever is on the server with the committed values. That is deliberate — the
committed file is the single source of truth for production settings, so a fresh deploy comes up
without hand-editing anything on the box.

Two consequences to keep in mind:

- **The signing secret and SMTP password are in source control.** Anyone with repo read access
  can forge a token for any role. Treat repo access as production access, and rotate the secret
  (`JwtSettings:Secret`) if that access set ever changes — rotating signs out every user.
- **Do not edit the file on the server.** The next deploy discards those edits. Change it here,
  commit, and redeploy.

App-pool environment variables still work and **take precedence over this file** (environment
variables are the later configuration source). Use one mechanism or the other — if a variable is
set on the pool, changing the committed file will appear to do nothing.

| Setting | Environment variable | Required | Notes |
| --- | --- | --- | --- |
| `JwtSettings:Secret` | `JwtSettings__Secret` | **Yes** | Minimum 32 characters. Startup fails outside Development if missing or too short. Rotating it signs out every user. |
| `EmailSettings:Host` | `EmailSettings__Host` | For email | SMTP server. Without it, password reset and notification emails are logged as errors and never sent. |
| `EmailSettings:Port` | `EmailSettings__Port` | No | Defaults to 587. |
| `EmailSettings:UserName` | `EmailSettings__UserName` | Per provider | Omit for anonymous relays. |
| `EmailSettings:Password` | `EmailSettings__Password` | Per provider | Never commit this. |
| `EmailSettings:FromAddress` | `EmailSettings__FromAddress` | For email | Sender address; must be one your SMTP provider allows. |
| `EmailSettings:AppBaseUrl` | `EmailSettings__AppBaseUrl` | For email | Public site URL with no trailing slash, e.g. `https://your-domain`. Password reset links are built from this — if it is wrong, reset links point nowhere. |

Generate a strong secret:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Set it on the app pool (survives app restarts, not visible in the repo):

```powershell
Import-Module WebAdministration
$env:PSModulePath | Out-Null
Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' `
  -location 'OrderShieldPro.Api.Internal' `
  -filter "system.webServer/aspNetCore/environmentVariables" `
  -name "." -value @{name='JwtSettings__Secret'; value='<generated-secret>'}
```

Then recycle `OrderShieldPro.ApiPool`.

## 4) Deploy frontend output (public IIS site)

1. Copy `artifacts/deploy/frontend` to `C:\inetpub\ordershield\web`.
2. Create app pool `OrderShieldPro.WebPool`.
3. Create IIS site `OrderShieldPro.Web` with your public domain and HTTPS binding.
4. Keep `web.config` in the frontend root. It does two things:
   - Reverse proxy `/api/*` to `http://127.0.0.1:5017/api/*`
   - Rewrite all non-file routes to `index.html` (Angular SPA fallback)

## 5) Verify

- Open your site root (example: `https://your-domain/`)
- Test API through the same domain (example: `https://your-domain/api/subscriptions/plans`)
- Liveness probe: `https://your-domain/api/../health` on the internal binding — `http://127.0.0.1:5017/health` returns `Healthy`
- Readiness probe (includes the database): `http://127.0.0.1:5017/health/ready`
- Confirm a reset email actually arrives: request a password reset for a real account, then
  check `logs\suplyrate-*.log` for `Email sent to` (success) or `Failed to send email` (misconfiguration)

## 6) Monitoring and logs

The API writes structured rolling logs to `C:\inetpub\ordershield\api\logs\suplyrate-<date>.log`,
retaining 30 days. Point your monitoring at:

- `http://127.0.0.1:5017/health/ready` — alert if non-200 for more than a minute
- The log files — alert on `Failed to send email`, and on any `Unhandled exception`

## 7) Backups

Nothing in this deployment is self-healing; both of the following must be backed up or a
failure is unrecoverable.

**Database** — `OrderShieldProDb` holds all users, entities, and reviews. Schedule a nightly
full backup plus transaction log backups if you need point-in-time recovery:

```powershell
sqlcmd -S . -Q "BACKUP DATABASE [OrderShieldProDb] TO DISK='D:\backups\OrderShieldProDb.bak' WITH INIT, COMPRESSION"
```

Register that as a scheduled task, and copy the `.bak` off the machine — a backup on the
same disk does not survive the failure it exists for.

**Uploads** — `C:\inetpub\ordershield\api\uploads` is the *only* copy of every evidence file
and payment proof. It is not in the database and not in source control. Mirror it nightly:

```powershell
robocopy "C:\inetpub\ordershield\api\uploads" "D:\backups\uploads" /MIR /R:2 /W:5
```

**Restore drill** — restore both to a scratch server at least once, before you need to. A
backup you have never restored is a guess.

**Retention** — evidence files are business records tied to published reviews; keep them at
least as long as the reviews they support.

If the API site binding or port changes, rebuild frontend package using `-ApiProxyUrl` so the generated `web.config` points to the correct API URL.
