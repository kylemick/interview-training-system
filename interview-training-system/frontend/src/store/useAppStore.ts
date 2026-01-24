import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppSettings {
  studentName: string
  targetSchool: string
  apiKey: string
}

interface AppState {
  // 设置
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void

  // 加载状态
  loading: boolean
  setLoading: (loading: boolean) => void

  // 当前用户
  currentUser: any | null
  setCurrentUser: (user: any | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 设置
      settings: {
        studentName: '',
        targetSchool: '',
        apiKey: '',
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // 加载状态
      loading: false,
      setLoading: (loading) => set({ loading }),

      // 当前用户
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
