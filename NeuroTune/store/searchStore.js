import create from 'zustand'

// Simple zustand store for search UI state and recents
export const useSearchStore = create((set) => ({
  query: '',
  setQuery: (q) => set({ query: q }),
  recents: [],
  setRecents: (r) => set({ recents: r }),
}))
