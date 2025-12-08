/**
 * Test script to create a notification
 * Run this in browser console or use as a reference for API testing
 * 
 * Usage:
 * 1. Open browser console on your dashboard
 * 2. Copy and paste this script
 * 3. Replace USER_ID and ORG_ID with your actual values
 */

async function createTestNotification() {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('No user logged in')
    return
  }

  // Get organization ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    console.error('User has no organization_id')
    return
  }

  // Create notification
  const response = await fetch('/api/notifications/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user.id,
      organization_id: profile.organization_id,
      type: 'low_stock',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working correctly.',
      action_url: '/dashboard/restocking',
      metadata: {
        test: true,
        created_at: new Date().toISOString(),
      },
    }),
  })

  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ Notification created successfully:', data)
    console.log('Check the notification bell in the header!')
  } else {
    console.error('❌ Failed to create notification:', data)
  }
}

// Run the test
createTestNotification()

