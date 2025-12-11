# Netlify Wildcard Domain Setup

## Current Status

✅ **DNS is working** - `lacuisine.countpadi.com` resolves to your Netlify site  
❌ **SSL not provisioned** - Wildcard SSL certificates need to be enabled

## The Issue

Netlify's API doesn't support adding wildcard domains (`*.countpadi.com`) directly. The API returns an error: `"has invalid characters"` when trying to add wildcard domains.

## Solutions

### Option 1: Contact Netlify Support (Recommended)

1. Go to https://app.netlify.com/support
2. Request wildcard SSL certificate for `*.countpadi.com`
3. Provide your site ID: `5b1778c5-3cae-4755-a46b-4246324290d7`
4. Mention that DNS wildcard CNAME is already configured in Namecheap

### Option 2: Wait and Test

Sometimes Netlify automatically provisions SSL for domains pointing via DNS. Wait 24-48 hours and test:

```bash
curl -I https://lacuisine.countpadi.com
```

### Option 3: Add Subdomains Individually

As you onboard organizations, add their subdomains individually through:

- Netlify Dashboard → Domain management → Add domain alias
- Or use the API to add specific subdomains (not wildcards)

## Your Current Setup

- **DNS Provider**: Namecheap
- **Wildcard CNAME**: `*` → `lacuisine-restaurant.netlify.app` ✅
- **Netlify Site ID**: `5b1778c5-3cae-4755-a46b-4246324290d7`
- **Netlify Site Name**: `lacuisine-restaurant`
- **Primary Domain**: `countpadi.com`

## Testing

```bash
# Check DNS
dig lacuisine.countpadi.com +short

# Check HTTPS (will fail until SSL is provisioned)
curl -I https://lacuisine.countpadi.com
```

## Next Steps

1. Contact Netlify support to enable wildcard SSL
2. Once enabled, SSL will be provisioned automatically for all `*.countpadi.com` subdomains
3. Your code is already set up to handle subdomains - no changes needed!
