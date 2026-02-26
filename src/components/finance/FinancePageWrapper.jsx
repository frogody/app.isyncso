import React from "react";
import FinanceErrorWrapper from "./FinanceErrorWrapper";
import FinanceOnboardingGate from "./FinanceOnboardingGate";

export default function FinancePageWrapper({ children }) {
  return (
    <FinanceErrorWrapper>
      <FinanceOnboardingGate>{children}</FinanceOnboardingGate>
    </FinanceErrorWrapper>
  );
}
