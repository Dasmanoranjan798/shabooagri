# Infrastructure Notes

Server-level configuration that lives **outside** this git repo (nginx
site configs, systemd units, etc.) — nothing here is version-controlled
by the app's own history, so changes need to be logged here or they're
lost if the server config is ever rebuilt.

## nginx — shabooagri.com admin pages 401 on hard refresh/direct link (fixed 2026-08-17)

**File**: `/etc/nginx/sites-enabled/shabooagri.com`, the bare-domain
(`shabooagri.com` / `www.shabooagri.com`) server block.

**Symptom**: `/admin`, `/admin/customers`, `/admin/customers/:id` (the
platform-frontend's owner admin pages) returned a raw `401` JSON error
instead of the page whenever loaded via a hard navigation — typing the
URL, refreshing, or opening a bookmarked/shared link. Worked fine only
when reached by clicking a link *within* the already-loaded SPA (client-side
routing never hits the server).

**Cause**: this server block proxies a regex of path prefixes straight
to the platform-backend API on port 4010:

```nginx
location ~ ^/(auth|payments|provisioning|plans|admin|api|health) {
    proxy_pass http://127.0.0.1:4010;
    ...
}
```

`admin` is in that list because `/admin/*` also serves the real admin
API (`GET /admin/dashboard`, `GET /admin/platform-users`, etc.). But
`/admin`, `/admin/customers`, and `/admin/customers/:id` are *also*
real platform-frontend pages that need to serve `index.html` (the SPA
shell), not hit the API. A real browser navigation was proxied straight
to the backend, which 401'd (no auth token on a fresh page load) before
the request ever got a chance to fall through to the SPA.

**Fix**: added the same HTML-Accept-based rewrite the *operational*
frontend's nginx block (the `*.shabooagri.com` server block, same file)
already used successfully for its own admin-prefix collision — a real
browser page load sends `Accept: text/html,...`; the platform-frontend's
own `fetch()` calls (`platform-frontend/src/lib/api.ts`) never set that
header, so API calls are unaffected:

```nginx
location ~ ^/(auth|payments|provisioning|plans|admin|api|health) {
    if ($http_accept ~* "text/html") {
        rewrite ^ /index.html last;
    }
    proxy_pass http://127.0.0.1:4010;
    ...
}
```

Applied via `sudo systemctl reload nginx` after `nginx -t`. Verified:
all three admin pages return `200` with `Accept: text/html` on a hard
navigation, `GET /admin/dashboard` and `GET /admin/platform-users`
still correctly `401` without an auth token (unaffected), and the rest
of the site (`/`, `/pricing`, `/feedback`, `/contact`, etc.) unchanged.

**If this file/server is ever rebuilt from scratch**: reapply this
rewrite to the `shabooagri.com` bare-domain block's proxy `location`,
or any future prefix added to that regex that also needs to serve a
real frontend page at that same path (the general pattern to watch for:
*any* path that's simultaneously an API prefix and a page route needs
this rewrite, or needs to be namespaced under `/api/` instead — see the
`/contact` vs `/api/contact` collision fixed the same way earlier in
the platform-backend's contact module).
