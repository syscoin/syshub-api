# Configuration Guide

## Environment Variables

### Security Configuration

#### BODY_SIZE_LIMIT
**Default:** `10kb` (when not set)
**Purpose:** Limits the size of incoming request bodies to prevent DoS attacks via large payloads
**Format:** Express-style size string (e.g., `10kb`, `1mb`, `5mb`) or `false` to disable

**Usage:**
```bash
# In .env file

# Option 1: Use default (10kb) - RECOMMENDED
# BODY_SIZE_LIMIT=10kb
# (or leave it unset/commented)

# Option 2: Set custom limit
BODY_SIZE_LIMIT=1mb

# Option 3: Disable limit (trust Cloudflare)
BODY_SIZE_LIMIT=false
```

**Configuration Options:**

| Value | Behavior | Use Case |
|-------|----------|----------|
| Not set | Defaults to `10kb` | **Recommended** - Secure default |
| `10kb`, `1mb`, etc. | Applies that limit | Custom limit for your needs |
| `false` | No limit | Trust Cloudflare protection only |

**When to use each option:**

1. **Not set (default 10kb)** ✅ **RECOMMENDED**
   - Best for most JSON APIs
   - Defense-in-depth approach
   - Protects if Cloudflare is bypassed

2. **Custom limit (e.g., `1mb`, `5mb`)**
   - Your API needs larger payloads
   - Still want application-level protection
   - Example: larger proposal descriptions

3. **`false` (no limit)**
   - You fully trust Cloudflare protection
   - Development/testing environments
   - Origin IP is completely hidden

**Examples:**
```bash
# Production - secure default
# BODY_SIZE_LIMIT=10kb

# Production - larger payloads needed
BODY_SIZE_LIMIT=1mb

# Staging - trust Cloudflare
BODY_SIZE_LIMIT=false

# Development - no Cloudflare, use app limit
BODY_SIZE_LIMIT=100kb
```

**Security Note:**
- **Cloudflare allows up to 100MB** (free) or 500MB (enterprise)
- If you set `BODY_SIZE_LIMIT=false`, you're relying entirely on Cloudflare
- This is acceptable if:
  - ✅ Origin IP is completely hidden
  - ✅ All traffic goes through Cloudflare
  - ✅ You trust Cloudflare's 100MB limit
- Not recommended if:
  - ❌ Origin IP might be exposed
  - ❌ Development/staging without Cloudflare
  - ❌ You want defense-in-depth

### Alternative: Route-Specific Limits

If you only need larger limits for specific endpoints, you can implement route-specific middleware:

```javascript
// For a specific route that needs larger payloads
const largeBodyParser = bodyParser.json({ limit: '5mb' })

router.post('/upload-proposal', [fbAuth, largeBodyParser], uploadProposal)
```

This keeps the global limit at 10kb while allowing specific endpoints to accept larger payloads.

## Default Values

All environment variables have sensible defaults if not specified:

| Variable | Default | Description |
|----------|---------|-------------|
| `BODY_SIZE_LIMIT` | `10kb` | Request body size limit |
| `PORT_HTTP` | `3000` | HTTP server port |
| `NODE_ENV` | (none) | Environment mode (dev/prod) |

## Security Best Practices

1. **Never commit `.env` files** - they contain sensitive credentials
2. **Use `.env-example`** as a template for required variables
3. **Keep body size limits small** unless absolutely necessary
4. **Use different values** for development and production environments
5. **Document any custom limits** and the reason for them
