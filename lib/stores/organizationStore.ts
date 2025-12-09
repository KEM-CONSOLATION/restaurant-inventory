import { create } from 'zustand'
import { Organization } from '@/types/database'

interface OrganizationState {
  organization: Organization | null
  loading: boolean
  initialized: boolean
  setOrganization: (organization: Organization | null) => void
  setLoading: (loading: boolean) => void
  initialize: (organizationId: string | null) => Promise<void>
  clear: () => void
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  organization: null,
  loading: false,
  initialized: false,

  setOrganization: organization => set({ organization }),

  setLoading: loading => set({ loading }),

  initialize: async (organizationId: string | null) => {
    if (!organizationId) {
      set({ organization: null, loading: false, initialized: true })
      return
    }

    // Prevent multiple simultaneous initializations for the same org
    if (get().initialized && get().organization?.id === organizationId && !get().loading) {
      return
    }

    set({ loading: true })

    try {
      const { supabase } = await import('@/lib/supabase/client')

      const { data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (error || !organization) {
        set({
          organization: null,
          loading: false,
          initialized: true,
        })
        return
      }

      set({
        organization,
        loading: false,
        initialized: true,
      })
    } catch (error) {
      console.error('Error initializing organization store:', error)
      set({
        organization: null,
        loading: false,
        initialized: true,
      })
    }
  },

  clear: () => {
    set({
      organization: null,
      loading: false,
      initialized: false,
    })
  },
}))
