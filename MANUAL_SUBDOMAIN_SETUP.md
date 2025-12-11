# Manual Subdomain Setup Guide

## Quick Steps to Add a Subdomain Manually

When you onboard a new organization with subdomain (e.g., `lacuisine`):

### 1. In Netlify Dashboard

1. Go to: https://app.netlify.com/sites/lacuisine-restaurant/domain-management
2. Click **"Add domain alias"**
3. Enter: `lacuisine.countpadi.com` (or whatever subdomain you need)
4. Click **"Save"**

### 2. Wait for SSL

- Netlify will automatically provision SSL certificate (usually 5-10 minutes)
- Check the HTTPS section in Domain management to see status

### 3. Verify It Works

```bash
# Test DNS (should already work)
dig lacuisine.countpadi.com +short

# Test HTTPS (will work after SSL is provisioned)
curl -I https://lacuisine.countpadi.com
```

## Your Current Setup ✅

- ✅ DNS wildcard CNAME in Namecheap (`*` → `lacuisine-restaurant.netlify.app`)
- ✅ Code ready for subdomains (middleware handles routing)
- ✅ Organizations table has `subdomain` field
- ⏳ Just need to add each subdomain in Netlify for SSL (temporary)

## Notes

- **DNS is already working** - subdomains resolve automatically
- **Only SSL needs manual setup** - until Netlify enables wildcard SSL
- **Your code doesn't need changes** - it already handles subdomains dynamically

## Future Solution

Once Netlify support enables wildcard SSL for `*.countpadi.com`, you won't need to add subdomains manually anymore - they'll all work automatically!
