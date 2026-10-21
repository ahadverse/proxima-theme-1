import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      isSidebarCollapsed: false,
      toggleSidebarCollapsed: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
    }),
    // Only the collapse preference should survive a reload — the mobile drawer should
    // always start closed.
    { name: 'maroon-admin-ui', partialize: (s) => ({ isSidebarCollapsed: s.isSidebarCollapsed }) }
  )
);
