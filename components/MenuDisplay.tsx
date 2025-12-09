'use client'

import { MenuCategory, MenuItem } from '@/types/database'
import Link from 'next/link'

interface MenuDisplayProps {
  categories: MenuCategory[]
  items: (MenuItem & { category?: MenuCategory })[]
}

export default function MenuDisplay({ categories, items }: MenuDisplayProps) {
  const itemsByCategory = categories.map(category => ({
    category,
    items: items.filter(item => item.category_id === category.id),
  }))

  const uncategorizedItems = items.filter(item => !item.category_id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">La Cuisine</h1>
              <p className="mt-2 text-gray-600">Authentic African Flavors</p>
            </div>
            <Link
              href="/login"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {categories.length === 0 && items.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Menu Coming Soon</h2>
            <p className="text-gray-600 mb-4">We're preparing something delicious for you!</p>
            <p className="text-sm text-gray-500">
              Admin can add menu items from Management → Digital Menu
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {itemsByCategory.map(
              ({ category, items: categoryItems }) =>
                categoryItems.length > 0 && (
                  <section key={category.id} className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="mb-6">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h2>
                      {category.description && (
                        <p className="text-gray-600">{category.description}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
                        >
                          {item.image_url && (
                            <div className="aspect-video bg-gray-200 overflow-hidden">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                          <div className="p-5">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-indigo-600">
                                ₦{item.price.toFixed(2)}
                              </span>
                              {!item.is_available && (
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )
            )}

            {uncategorizedItems.length > 0 && (
              <section className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Other Items</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {uncategorizedItems.map(item => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
                    >
                      {item.image_url && (
                        <div className="aspect-video bg-gray-200 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-indigo-600">
                            ₦{item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">La Cuisine</h3>
            <p className="text-gray-400">Serving authentic African cuisine</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
