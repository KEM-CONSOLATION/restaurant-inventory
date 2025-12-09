import { createClient } from '@/lib/supabase/server'
import MenuDisplay from '@/components/MenuDisplay'

export default async function MenuPage() {
  const supabase = await createClient()

  // Fetch categories (allow inactive for debugging)
  const { data: categories, error: catError } = await supabase
    .from('menu_categories')
    .select('*')
    .order('display_order', { ascending: true })

  // Fetch items (allow unavailable for debugging)
  const { data: items, error: itemsError } = await supabase
    .from('menu_items')
    .select('*, category:menu_categories(*)')
    .order('display_order', { ascending: true })

  // Filter active/available in the component instead
  const activeCategories = categories?.filter(cat => cat.is_active) || []
  const availableItems = items?.filter(item => item.is_available) || []

  return <MenuDisplay categories={activeCategories} items={availableItems} />
}
