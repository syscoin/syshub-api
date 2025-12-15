# Configuration Guide

## Environment Variables

### Security Configuration

#### BODY_SIZE_LIMIT
**Default:** `10kb`
**Purpose:** Limits the size of incoming request bodies to prevent DoS attacks via large payloads
**Format:** Express-style size string (e.g., `10kb`, `1mb`, `5mb`)

**Usage:**
```bash
# In .env file
BODY_SIZE_LIMIT=10kb
```

**When to adjust:**
- **Keep at 10kb (default)** for most API endpoints - this is sufficient for JSON payloads
- **Increase to 1mb-5mb** if you have specific endpoints that need to handle larger data (e.g., file uploads, large proposal descriptions)
- **Never exceed 50mb** to maintain DoS protection

**Examples:**
```bash
# Default - recommended for most cases
BODY_SIZE_LIMIT=10kb

# For APIs with larger payloads
BODY_SIZE_LIMIT=100kb

# For file upload endpoints (use with caution)
BODY_SIZE_LIMIT=5mb
```

**Security Note:** Larger limits increase the risk of memory exhaustion attacks. If you need to handle large uploads, consider implementing route-specific limits or using a dedicated file upload service.

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
