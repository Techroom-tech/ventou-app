import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarCollapseContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
});

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarCollapseContext.Provider value={{ collapsed, setCollapsed, toggle: () => setCollapsed(c => !c) }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export const useSidebarCollapse = () => useContext(SidebarCollapseContext);
