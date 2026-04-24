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
5. Grant Modify permission on `C:\inetpub\ordershield\api\uploads` to the API app pool identity.
6. On first API start, migrations are applied and the database is created if it does not exist.

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

If the API site binding or port changes, rebuild frontend package using `-ApiProxyUrl` so the generated `web.config` points to the correct API URL.
