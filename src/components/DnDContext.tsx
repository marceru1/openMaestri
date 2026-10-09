import { createContext, useContext, useState, type ReactNode } from 'react';

// Contexto de drag-and-drop: qual tipo de node tá sendo arrastado
type DnDType = 'textUpdater' | 'resizable' | 'biDirectional' | null;

const DnDContext = createContext<[DnDType, (t: DnDType) => void]>([null, () => {}]);

export const DnDProvider = ({ children }: { children: ReactNode }) => {
  const [type, setType] = useState<DnDType>(null);

  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

export const useDnD = () => useContext(DnDContext);