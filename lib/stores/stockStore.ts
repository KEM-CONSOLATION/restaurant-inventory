import { create } from 'zustand'
import { OpeningStock, ClosingStock, Restocking, Item } from '@/types/database'
import { supabase } from '@/lib/supabase/client'

interface StockState {
  openingStocks: (OpeningStock & { item?: Item })[]
  closingStocks: (ClosingStock & { item?: Item })[]
  restockings: (Restocking & { item?: Item })[]
  loading: {
    opening: boolean
    closing: boolean
    restocking: boolean
  }
  error: string | null
  lastFetched: {
    opening: number | null
    closing: number | null
    restocking: number | null
  }
  lastFetchedDate: {
    opening: string | null
    closing: string | null
    restocking: string | null
  }
  lastFetchedBranchId: {
    opening: string | null
    closing: string | null
    restocking: string | null
  }
  fetchOpeningStock: (
    date: string,
    organizationId: string | null,
    branchId?: string | null,
    forceRefresh?: boolean
  ) => Promise<void>
  fetchClosingStock: (
    date: string,
    organizationId: string | null,
    branchId?: string | null
  ) => Promise<void>
  fetchRestocking: (
    date: string,
    organizationId: string | null,
    branchId?: string | null
  ) => Promise<void>
  addOpeningStock: (stock: OpeningStock & { item?: Item }) => void
  updateOpeningStock: (stockId: string, updates: Partial<OpeningStock>) => void
  addClosingStock: (stock: ClosingStock & { item?: Item }) => void
  updateClosingStock: (stockId: string, updates: Partial<ClosingStock>) => void
  addRestocking: (restocking: Restocking & { item?: Item }) => void
  updateRestocking: (restockingId: string, updates: Partial<Restocking>) => void
  removeRestocking: (restockingId: string) => void
  clear: () => void
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

export const useStockStore = create<StockState>((set, get) => ({
  openingStocks: [],
  closingStocks: [],
  restockings: [],
  loading: {
    opening: false,
    closing: false,
    restocking: false,
  },
  error: null,
  lastFetched: {
    opening: null,
    closing: null,
    restocking: null,
  },
  lastFetchedDate: {
    opening: null,
    closing: null,
    restocking: null,
  },
  lastFetchedBranchId: {
    opening: null,
    closing: null,
    restocking: null,
  },

  fetchOpeningStock: async (
    date: string,
    organizationId: string | null,
    branchId?: string | null,
    forceRefresh?: boolean
  ) => {
    const state = get()
    const now = Date.now()
    const branchIdKey = branchId || 'null'

    // Return cached data if still fresh, same date, AND same branch (unless force refresh)
    if (
      !forceRefresh &&
      state.lastFetched.opening &&
      state.lastFetchedDate.opening === date &&
      state.lastFetchedBranchId.opening === branchIdKey &&
      now - state.lastFetched.opening < CACHE_DURATION &&
      !state.loading.opening
    ) {
      return
    }

    set(prev => ({
      loading: { ...prev.loading, opening: true },
      error: null,
    }))

    try {
      let query = supabase
        .from('opening_stock')
        .select(
          `
          id,
          item_id,
          quantity,
          cost_price,
          selling_price,
          date,
          branch_id,
          organization_id,
          notes,
          created_at,
          item:items(id, name, unit, description, cost_price, selling_price)
        `
        )
        .eq('date', date)
        .order('created_at', { ascending: false })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      // Filter by branch_id if provided
      // When a specific branch is selected, fetch both branch-specific AND NULL branch_id records
      // This allows fallback to legacy data while still preferring branch-specific data
      // Components will prefer branch-specific when displaying (ensuring branch isolation)
      if (branchId !== undefined && branchId !== null) {
        // Fetch both branch-specific and NULL records (for fallback to legacy/unassigned data)
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
      } else {
        // When branchId is null/undefined, only fetch NULL branch_id records
        // This is for organizations without branches yet
        query = query.is('branch_id', null)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching opening stock:', error)
        throw error
      }

      // If items are missing from join, fetch them separately
      let openingStocksWithItems = data || []
      const missingItemIds = openingStocksWithItems
        .filter(os => !os.item && os.item_id)
        .map(os => os.item_id)
      
      if (missingItemIds.length > 0) {
        console.warn(`[Opening Stock] ${missingItemIds.length} records missing item data, fetching separately...`)
        const { data: missingItems } = await supabase
          .from('items')
          .select('id, name, unit, description, cost_price, selling_price')
          .in('id', missingItemIds)
        
        if (missingItems) {
          const itemsMap = new Map(missingItems.map(item => [item.id, item]))
          openingStocksWithItems = openingStocksWithItems.map(os => ({
            ...os,
            item: os.item || itemsMap.get(os.item_id) || null,
          }))
        }
      }

      // Log for debugging (can be removed in production)
      if (openingStocksWithItems.length > 0) {
        const withItems = openingStocksWithItems.filter(os => os.item).length
        console.log(`[Opening Stock] Fetched ${openingStocksWithItems.length} records (${withItems} with items) for date ${date}, branch: ${branchId || 'null'}`)
      } else {
        console.log(`[Opening Stock] No records found for date ${date}, branch: ${branchId || 'null'}`)
      }

      set(prev => ({
        openingStocks: openingStocksWithItems,
        loading: { ...prev.loading, opening: false },
        lastFetched: { ...prev.lastFetched, opening: now },
        lastFetchedDate: { ...prev.lastFetchedDate, opening: date },
        lastFetchedBranchId: { ...prev.lastFetchedBranchId, opening: branchIdKey },
        error: null,
      }))
    } catch (error) {
      console.error('Error fetching opening stock:', error)
      set(prev => ({
        loading: { ...prev.loading, opening: false },
        error: error instanceof Error ? error.message : 'Failed to fetch opening stock',
        openingStocks: [],
      }))
    }
  },

  fetchClosingStock: async (
    date: string,
    organizationId: string | null,
    branchId?: string | null
  ) => {
    const state = get()
    const now = Date.now()
    const branchIdKey = branchId || 'null'

    if (
      state.lastFetched.closing &&
      state.lastFetchedDate.closing === date &&
      state.lastFetchedBranchId.closing === branchIdKey &&
      now - state.lastFetched.closing < CACHE_DURATION &&
      !state.loading.closing
    ) {
      return
    }

    set(prev => ({
      loading: { ...prev.loading, closing: true },
      error: null,
    }))

    try {
      let query = supabase
        .from('closing_stock')
        .select(
          `
          id,
          item_id,
          quantity,
          cost_price,
          selling_price,
          date,
          branch_id,
          organization_id,
          notes,
          created_at,
          item:items(id, name, unit, description, cost_price, selling_price)
        `
        )
        .eq('date', date)
        .order('created_at', { ascending: false })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      // Filter by branch_id if provided
      // When a specific branch is selected, fetch both branch-specific AND NULL branch_id records
      // This allows fallback to legacy data while still preferring branch-specific data
      if (branchId !== undefined && branchId !== null) {
        // Fetch both branch-specific and NULL records (for fallback to legacy/unassigned data)
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
      } else {
        // When branchId is null/undefined, only fetch NULL branch_id records
        query = query.is('branch_id', null)
      }

      const { data, error } = await query

      if (error) throw error

      set(prev => ({
        closingStocks: data || [],
        loading: { ...prev.loading, closing: false },
        lastFetched: { ...prev.lastFetched, closing: now },
        lastFetchedDate: { ...prev.lastFetchedDate, closing: date },
        lastFetchedBranchId: { ...prev.lastFetchedBranchId, closing: branchIdKey },
        error: null,
      }))
    } catch (error) {
      console.error('Error fetching closing stock:', error)
      set(prev => ({
        loading: { ...prev.loading, closing: false },
        error: error instanceof Error ? error.message : 'Failed to fetch closing stock',
        closingStocks: [],
      }))
    }
  },

  fetchRestocking: async (
    date: string,
    organizationId: string | null,
    branchId?: string | null
  ) => {
    const state = get()
    const now = Date.now()
    const branchIdKey = branchId || 'null'

    if (
      state.lastFetched.restocking &&
      state.lastFetchedDate.restocking === date &&
      state.lastFetchedBranchId.restocking === branchIdKey &&
      now - state.lastFetched.restocking < CACHE_DURATION &&
      !state.loading.restocking
    ) {
      return
    }

    set(prev => ({
      loading: { ...prev.loading, restocking: true },
      error: null,
    }))

    try {
      let query = supabase
        .from('restocking')
        .select(
          `
          id,
          item_id,
          quantity,
          cost_price,
          selling_price,
          date,
          branch_id,
          organization_id,
          notes,
          created_at,
          item:items(id, name, unit, description, cost_price, selling_price)
        `
        )
        .eq('date', date)
        .order('created_at', { ascending: false })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      // Filter by branch_id if provided
      // When a specific branch is selected, fetch both branch-specific AND NULL branch_id records
      // This allows fallback to legacy data while still preferring branch-specific data
      if (branchId !== undefined && branchId !== null) {
        // Fetch both branch-specific and NULL records (for fallback to legacy/unassigned data)
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
      } else {
        // When branchId is null/undefined, only fetch NULL branch_id records
        query = query.is('branch_id', null)
      }

      const { data, error } = await query

      if (error) throw error

      set(prev => ({
        restockings: data || [],
        loading: { ...prev.loading, restocking: false },
        lastFetched: { ...prev.lastFetched, restocking: now },
        lastFetchedDate: { ...prev.lastFetchedDate, restocking: date },
        lastFetchedBranchId: { ...prev.lastFetchedBranchId, restocking: branchIdKey },
        error: null,
      }))
    } catch (error) {
      console.error('Error fetching restocking:', error)
      set(prev => ({
        loading: { ...prev.loading, restocking: false },
        error: error instanceof Error ? error.message : 'Failed to fetch restocking',
        restockings: [],
      }))
    }
  },

  addOpeningStock: stock => {
    set(state => ({
      openingStocks: [...state.openingStocks, stock],
      lastFetched: { ...state.lastFetched, opening: Date.now() },
    }))
  },

  updateOpeningStock: (stockId, updates) => {
    set(state => ({
      openingStocks: state.openingStocks.map(stock =>
        stock.id === stockId ? { ...stock, ...updates } : stock
      ),
      lastFetched: { ...state.lastFetched, opening: Date.now() },
    }))
  },

  addClosingStock: stock => {
    set(state => ({
      closingStocks: [...state.closingStocks, stock],
      lastFetched: { ...state.lastFetched, closing: Date.now() },
    }))
  },

  updateClosingStock: (stockId, updates) => {
    set(state => ({
      closingStocks: state.closingStocks.map(stock =>
        stock.id === stockId ? { ...stock, ...updates } : stock
      ),
      lastFetched: { ...state.lastFetched, closing: Date.now() },
    }))
  },

  addRestocking: restocking => {
    set(state => ({
      restockings: [...state.restockings, restocking],
      lastFetched: { ...state.lastFetched, restocking: Date.now() },
    }))
  },

  updateRestocking: (restockingId, updates) => {
    set(state => ({
      restockings: state.restockings.map(r => (r.id === restockingId ? { ...r, ...updates } : r)),
      lastFetched: { ...state.lastFetched, restocking: Date.now() },
    }))
  },

  removeRestocking: restockingId => {
    set(state => ({
      restockings: state.restockings.filter(r => r.id !== restockingId),
      lastFetched: { ...state.lastFetched, restocking: Date.now() },
    }))
  },

  clear: () => {
    set({
      openingStocks: [],
      closingStocks: [],
      restockings: [],
      loading: {
        opening: false,
        closing: false,
        restocking: false,
      },
      error: null,
      lastFetched: {
        opening: null,
        closing: null,
        restocking: null,
      },
      lastFetchedDate: {
        opening: null,
        closing: null,
        restocking: null,
      },
      lastFetchedBranchId: {
        opening: null,
        closing: null,
        restocking: null,
      },
    })
  },
}))
