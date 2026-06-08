import { create } from 'zustand';
import type { Category } from '../../shared/types.js';

interface AppState {
  sidebarCollapsed: boolean;
  categories: Category[];
  loading: Record<string, boolean>;
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
  toggleSidebar: () => void;
  setCategories: (categories: Category[]) => void;
  setLoading: (key: string, value: boolean) => void;
  showMessage: (type: 'success' | 'error' | 'info', text: string) => void;
  clearMessage: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  categories: [],
  loading: {},
  message: null,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCategories: (categories) => set({ categories }),
  setLoading: (key, value) => set((state) => ({
    loading: { ...state.loading, [key]: value }
  })),
  showMessage: (type, text) => set({ message: { type, text } }),
  clearMessage: () => set({ message: null }),
}));
