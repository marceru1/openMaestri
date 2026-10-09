import { createContext, useContext, useState, type ReactNode } from 'react';

// Ferramenta escolhida por CLIQUE na toolbar (não mais drag-and-drop):
// o card selecionado fica ativo; clique no canvas coloca o node ali.
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