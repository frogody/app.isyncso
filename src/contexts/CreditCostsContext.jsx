import React, { createContext, useContext } from 'react';
import { useActionCosts } from '@/hooks/useActionCosts';

const CreditCostsContext = createContext({ getCost: () => null, loading: true });

export function CreditCostsProvider({ children }) {
  const { getCost, loading } = useActionCosts();
  return (
    <CreditCostsContext.Provider value={{ getCost, loading }}>
      {children}
    </CreditCostsContext.Provider>
  );
}

/**
 * Get the credit cost for an action key.
 * Returns { credits_required, label, ... } or null.
 */
export function useCreditCost(actionKey) {
  const { getCost } = useContext(CreditCostsContext);
  return getCost(actionKey);
}

/**
 * Get the raw getCost function and loading state.
 */
export function useCreditCosts() {
  return useContext(CreditCostsContext);
}
