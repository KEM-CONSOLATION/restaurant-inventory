'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MenuCategory, MenuItem } from '@/types/database'

export default function MenuManagement() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<(MenuItem & { category?: MenuCategory })[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: '0',
    is_active: true,
  })

  const [itemForm, setItemForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
    display_order: '0',
  })

  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('menu_categories')
      .select('*')
      .order('display_order', { ascending: true })
    
    if (data) setCategories(data)
  }

  const fetchItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*, category:menu_categories(*)')
      .order('display_order', { ascending: true })
    
    if (data) setItems(data as (MenuItem & { category?: MenuCategory })[])
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('menu_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description || null,
            display_order: parseInt(categoryForm.display_order),
            is_active: categoryForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Category updated successfully!' })
      } else {
        const { error } = await supabase
          .from('menu_categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description || null,
            display_order: parseInt(categoryForm.display_order),
            is_active: categoryForm.is_active,
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Category created successfully!' })
      }

      setShowCategoryForm(false)
      setEditingCategory(null)
      setCategoryForm({ name: '', description: '', display_order: '0', is_active: true })
      fetchCategories()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save category' })
    } finally {
      setLoading(false)
    }
  }

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            category_id: itemForm.category_id || null,
            name: itemForm.name,
            description: itemForm.description || null,
            price: parseFloat(itemForm.price),
            image_url: itemForm.image_url || null,
            is_available: itemForm.is_available,
            display_order: parseInt(itemForm.display_order),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Menu item updated successfully!' })
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert({
            category_id: itemForm.category_id || null,
            name: itemForm.name,
            description: itemForm.description || null,
            price: parseFloat(itemForm.price),
            image_url: itemForm.image_url || null,
            is_available: itemForm.is_available,
            display_order: parseInt(itemForm.display_order),
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Menu item created successfully!' })
      }

      setShowItemForm(false)
      setEditingItem(null)
      setItemForm({ category_id: '', name: '', description: '', price: '', image_url: '', is_available: true, display_order: '0' })
      fetchItems()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save menu item' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order.toString(),
      is_active: category.is_active,
    })
    setShowCategoryForm(true)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setItemForm({
      category_id: item.category_id || '',
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image_url: item.image_url || '',
      is_available: item.is_available,
      display_order: item.display_order.toString(),
    })
    setShowItemForm(true)
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure? This will also delete all items in this category.')) return
    
    const { error } = await supabase.from('menu_categories').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: 'Failed to delete category' })
    } else {
      setMessage({ type: 'success', text: 'Category deleted successfully!' })
      fetchCategories()
      fetchItems()
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: 'Failed to delete menu item' })
    } else {
      setMessage({ type: 'success', text: 'Menu item deleted successfully!' })
      fetchItems()
    }
  }

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Menu Categories</h3>
            <button
              onClick={() => {
                setShowCategoryForm(!showCategoryForm)
                setEditingCategory(null)
                setCategoryForm({ name: '', description: '', display_order: '0', is_active: true })
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer"
            >
              {showCategoryForm ? 'Cancel' : '+ Add Category'}
            </button>
          </div>

          {showCategoryForm && (
            <form onSubmit={handleCategorySubmit} className="mb-6 space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                  placeholder="e.g., Main Dishes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                  placeholder="Category description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                      className="mr-2 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{cat.name}</p>
                  {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditCategory(cat)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-red-600 hover:text-red-900 text-sm cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
            <button
              onClick={() => {
                setShowItemForm(!showItemForm)
                setEditingItem(null)
                setItemForm({ category_id: '', name: '', description: '', price: '', image_url: '', is_available: true, display_order: '0' })
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer"
            >
              {showItemForm ? 'Cancel' : '+ Add Item'}
            </button>
          </div>

          {showItemForm && (
            <form onSubmit={handleItemSubmit} className="mb-6 space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 cursor-pointer"
                >
                  <option value="">No Category</option>
                  {categories.filter(c => c.is_active).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                  placeholder="e.g., Jollof Rice"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                  placeholder="Item description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={itemForm.display_order}
                    onChange={(e) => setItemForm({ ...itemForm, display_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-black"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.is_available}
                    onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                    className="mr-2 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">Available</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
              </button>
            </form>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">₦{item.price.toFixed(2)} • {item.category?.name || 'No Category'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-900 text-sm cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

