# SK-SUbong frontend

Run `npm start` in this directory to launch the Angular app on http://localhost:4200. The development proxy forwards `/api` to http://localhost:5027.

The Vercel deployment uses `vercel.json` to proxy `/api/*` to the deployed ASP.NET API. Keep the API rewrite before the SPA fallback so login and other API mutations are sent to the backend instead of being handled as frontend routes. The proxy also keeps the API same-origin in the browser, which is required for the HttpOnly session cookie.

See the [project README](../README.md) for SQL Server/SSMS setup, development accounts, supported flows and verification commands.
