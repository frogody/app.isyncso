import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { GlobalThemeProvider } from "@/contexts/GlobalThemeContext"

function App() {
  return (
    <GlobalThemeProvider>
      <Pages />
      <Toaster />
    </GlobalThemeProvider>
  )
}

export default App 