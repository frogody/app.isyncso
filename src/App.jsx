import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { GlobalThemeProvider } from "@/contexts/GlobalThemeContext"
import { CreditCostsProvider } from "@/contexts/CreditCostsContext"

function App() {
  return (
    <GlobalThemeProvider>
      <CreditCostsProvider>
        <Pages />
        <Toaster />
        <SonnerToaster position="bottom-right" theme="dark" richColors duration={45000} />
      </CreditCostsProvider>
    </GlobalThemeProvider>
  )
}

export default App 