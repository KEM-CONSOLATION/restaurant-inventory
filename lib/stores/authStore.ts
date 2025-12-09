import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  organizationId: string | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setOrganizationId: (organizationId: string | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
  clear: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  organizationId: null,
  loading: true,
  initialized: false,

  setUser: user => set({ user }),

  setProfile: profile => {
    set({
      profile,
      organizationId: profile?.organization_id || null,
    })
  },

  setOrganizationId: organizationId => set({ organizationId }),

  setLoading: loading => set({ loading }),

  initialize: async () => {
    // Prevent multiple simultaneous initializations
    if (get().initialized && !get().loading) {
      return
    }

    set({ loading: true })

    try {
      const { supabase } = await import('@/lib/supabase/client')

      // Get user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        set({
          user: null,
          profile: null,
          organizationId: null,
          loading: false,
          initialized: true,
        })
        return
      }

      set({ user })

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        set({
          profile: null,
          organizationId: null,
          loading: false,
          initialized: true,
        })
        return
      }

      set({
        profile,
        organizationId: profile.organization_id || null,
        loading: false,
        initialized: true,
      })
    } catch (error) {
      console.error('Error initializing auth store:', error)
      set({
        user: null,
        profile: null,
        organizationId: null,
        loading: false,
        initialized: true,
      })
    }
  },

  clear: () => {
    set({
      user: null,
      profile: null,
      organizationId: null,
      loading: false,
      initialized: false,
    })
  },
}))
