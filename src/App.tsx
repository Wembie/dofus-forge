import { HashRouter, Routes, Route } from 'react-router-dom'
import { BuilderPage } from './pages/BuilderPage.tsx'
import { Toaster } from './components/Toaster.tsx'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<BuilderPage />} />
      </Routes>
      <Toaster />
    </HashRouter>
  )
}

export default App
