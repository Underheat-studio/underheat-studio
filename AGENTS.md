# UNDERHEAT Studio — Agent Guide

This is a **full-stack monorepo** with frontend, backend, and Cloudflare Workers. For detailed technical context, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Quick Commands

| Command | Purpose |
|---------|---------|
| `./test-runtime.sh` | Start everything locally (backend on 4000, frontend on 5500) |
| `cd underheat-api && npm run dev` | Start Cloudflare Workers locally |
| `cd underheat-api && npm run deploy` | Deploy to production |
| `cd underheat-api && npm test` | Run Cloudflare Worker tests |

## Project Structure

```
frontend/              # Static HTML/JS served on port 5500
backend/              # Express.js on port 4000 (email, verification)
underheat-api/        # Cloudflare Workers (admin auth, KV ops)
  └── AGENTS.md       # Cloudflare-specific guidance
```

## Essential Context

### Local vs Production (CRITICAL!)

**Local Testing** — No auth validation:
- Frontend on `http://localhost:5500`
- Backend on `http://localhost:4000`  
- Admin login accepts ANY credentials
- `.env` files create mock services

**Production** — Full auth enforcement:
- Deployed via Cloudflare Workers
- Admin credentials: Secrets in Cloudflare dashboard (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- Email: Resend API with rate limits in KV
- User data: Cloudflare KV storage

### Authentication Stack

- **Admin**: Cloudflare secrets (`ADMIN_USERNAME` + `ADMIN_PASSWORD`) — only enforced in production
- **Users**: Auth0 integration + email verification (Resend API)
- **Role System**: founder (hardcoded) > admin > user  
  See [AUTH0_FOUNDER_SETUP.md](AUTH0_FOUNDER_SETUP.md) for Auth0 role configuration

### Key Files by Component

**Frontend** (`frontend/`):
- `index.html` / `index.js` — Main page + Auth0 integration
- `admin.html` / `admin.js` — Admin panel
- `proxy-simple.js` — Dev server (starts on 5500)
- `theme.js`, `settings.js` — Frontend utilities

**Backend** (`backend/`):
- `server.js` — Express.js entry point
- `.env` — Required: `PORT`, `RESEND_API_KEY`

**Workers** (`underheat-api/`):
- `src/index.js` — Worker code (admin auth, email, KV ops)
- `wrangler.jsonc` — Cloudflare config + KV bindings
- `test/` — Vitest unit tests
- See `AGENTS.md` in this folder for Cloudflare-specific guidance

## Common Development Patterns

### Environment Setup

Each component has a `.env` file:

```bash
# backend/.env (local development)
PORT=4000
RESEND_API_KEY=your_api_key

# frontend/.env (if needed for Auth0)
VITE_AUTH0_DOMAIN=...
VITE_AUTH0_CLIENT_ID=...
```

Production secrets are set in Cloudflare dashboard, not files.

### Email Verification Flow

1. User submits email → Frontend calls `/api/send-code`
2. Backend generates code + calls Resend API
3. User receives email, submits code → `/api/verify-code`
4. Backend validates against KV store

### Admin Operations

Local: Visit `http://localhost:5500/admin.html`, use any credentials.

Production: Cloudflare Worker validates `ADMIN_USERNAME` + `ADMIN_PASSWORD` secrets.

## Deployment Process

1. Update code locally
2. From `underheat-api/`: Run `npm run deploy`
3. Set or update secrets in Cloudflare dashboard:
   - `ADMIN_USERNAME` (string)
   - `ADMIN_PASSWORD` (string)
   - KV namespace bindings (USERS, UNDERHEAT_KV)
4. Verify: Worker should respond at deployed URL

See [ADMIN_SETUP.md](ADMIN_SETUP.md) for step-by-step Cloudflare setup.

## Common Pitfalls

1. **Auth works locally but fails in production**: Credentials stored in code, not secrets. Set `ADMIN_USERNAME` + `ADMIN_PASSWORD` in Cloudflare dashboard.
2. **Email not sending**: Check `RESEND_API_KEY` in backend `.env` for local, or Cloudflare Workers environment for production.
3. **Port conflicts**: Frontend tries 5500, backend tries 4000. Free these ports before running `test-runtime.sh`.
4. **KV operations fail**: Verify KV namespace IDs in `wrangler.jsonc` match Cloudflare dashboard.
5. **Auth0 token rejected**: Token `audience` must include Worker URL. Check [AUTH0_ROLE_FIX.md](AUTH0_ROLE_FIX.md).

## Testing

- **Local e2e**: Run `./test-runtime.sh`, visit `http://localhost:5500`
- **Worker tests**: From `underheat-api/`, run `npm test`
- **Auth0 roles**: Run `./test-auth0-roles.sh` (requires Auth0 setup)

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design, data flow
- [ADMIN_SETUP.md](ADMIN_SETUP.md) — Cloudflare deployment guide
- [AUTH0_FOUNDER_SETUP.md](AUTH0_FOUNDER_SETUP.md) — Auth0 role system
- [AUTH0_ROLE_FIX.md](AUTH0_ROLE_FIX.md) — Auth0 troubleshooting
- [underheat-api/AGENTS.md](underheat-api/AGENTS.md) — Cloudflare Workers specifics
