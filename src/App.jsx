import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { GlobalThemeProvider } from "@/contexts/GlobalThemeContext"

function App() {
  return (
    <GlobalThemeProvider>
      <Pages />
      <Toaster />
      <SonnerToaster position="bottom-right" theme="dark" richColors duration={45000} />
    </GlobalThemeProvider>
  )
}

export default App 