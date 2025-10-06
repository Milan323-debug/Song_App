import { create } from 'zustand';

// Small UI store to share modal/chooser visibility between tab bar and screens
export const useUiStore = create((set) => ({
  chooserVisible: false,
  setChooserVisible: (v) => set({ chooserVisible: !!v }),
}));
