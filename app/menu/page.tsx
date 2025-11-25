import { createClient } from '@/lib/supabase/server'
import MenuDisplay from '@/components/MenuDisplay'

export default async function MenuPage() {
  const supabase = await createClient()
  
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const { data: items } = await supabase
    .from('menu_items')
    .select('*, category:menu_categories(*)')
    .eq('is_available', true)
    .order('display_order', { ascending: true })

  return (
    <MenuDisplay 
      categories={categories || []} 
      items={items || []} 
    />
  )
}

