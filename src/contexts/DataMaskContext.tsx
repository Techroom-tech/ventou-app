import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface DataMaskContextType {
  isMasked: boolean;
  toggleMask: () => void;
}

const DataMaskContext = createContext<DataMaskContextType>({
  isMasked: false,
  toggleMask: () => {},
});

export function DataMaskProvider({ children }: { children: ReactNode }) {
  const [isMasked, setIsMasked] = useState(false);
  const toggleMask = useCallback(() => setIsMasked(prev => !prev), []);

  return (
    <DataMaskContext.Provider value={{ isMasked, toggleMask }}>
      {children}
    </DataMaskContext.Provider>
  );
}

export function useDataMask() {
  return useContext(DataMaskContext);
}

export function maskValue(value: string | number, isMasked: boolean): string {
  return isMasked ? '••••' : String(value);
}
