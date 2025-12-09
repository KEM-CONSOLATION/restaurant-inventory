# Notification System Troubleshooting Guide

## Quick Diagnosis

### Step 1: Check if Notification Bell Appears

- [ ] Open dashboard
- [ ] Look at top-right of header
- [ ] Should see a bell icon (🔔)
- [ ] **If NOT visible**: Check user role (superadmins don't see it)

### Step 2: Check Database Table

Run in Supabase SQL Editor:

```sql
SELECT COUNT(*) FROM notifications;
```

- **If error**: Table doesn't exist → Run migration
- **If works**: Table exists → Continue to Step 3

### Step 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors:
   - `relation "notifications" does not exist` → Run migration
   - `permission denied` → Check RLS policies
   - `user_id is null` → User not logged in

### Step 4: Create Test Notification

Use browser console:

```javascript
// Copy and paste this in browser console
const {
  data: { user },
} = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single()

fetch('/api/notifications/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: user.id,
    organization_id: profile.organization_id,
    type: 'low_stock',
    title: 'Test Notification',
    message: 'If you see this, notifications are working!',
    action_url: '/dashboard/restocking',
  }),
})
  .then(r => r.json())
  .then(console.log)
```

---

## Common Issues & Fixes

### Issue 1: Notification Bell Not Visible

**Possible Causes:**

1. User is superadmin (superadmins don't see notifications)
2. Component not rendering
3. CSS hiding the element

**Fix:**

- Verify user role is 'admin' or 'staff'
- Check browser console for errors
- Inspect element to see if bell exists but is hidden

---

### Issue 2: Notifications Don't Load

**Error**: `relation "notifications" does not exist`

**Fix:**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/add_notifications_table.sql`
3. Paste and run
4. Refresh browser

---

### Issue 3: Permission Denied

**Error**: `permission denied for table notifications`

**Fix:**

1. Check RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'notifications';
   ```
2. Verify policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```
3. If missing, re-run migration

---

### Issue 4: Dropdown Not Positioning Correctly

**Symptom**: Dropdown appears in wrong location or is cut off

**Fix:**

- The dropdown uses `absolute right-0 mt-2` positioning
- It should appear below the bell icon
- If cut off, check parent container has `position: relative`
- Check z-index (should be z-50)

---

### Issue 5: Real-time Updates Not Working

**Symptom**: New notifications don't appear without refresh

**Fix:**

1. Go to Supabase Dashboard → Database → Replication
2. Find `notifications` table
3. Enable replication if not enabled
4. Or run:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
   ```

---

## Verification Checklist

- [ ] Database table exists
- [ ] RLS policies are set
- [ ] User has `organization_id`
- [ ] User role is NOT 'superadmin'
- [ ] No console errors
- [ ] Replication enabled for real-time
- [ ] Test notification can be created
- [ ] Notification appears in dropdown
- [ ] Unread count badge shows
- [ ] Mark as read works

---

## Testing Commands

### Create Notification via API

```bash
curl -X POST http://localhost:3000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "organization_id": "YOUR_ORG_ID",
    "type": "low_stock",
    "title": "Test",
    "message": "Test message"
  }'
```

### Check Notifications in Database

```sql
SELECT id, title, message, is_read, created_at
FROM notifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Check User's Organization

```sql
SELECT p.id, p.email, p.role, o.name as org_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'your-email@example.com';
```

---

_Last Updated: December 2025_
