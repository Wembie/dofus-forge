import { HashRouter, Routes, Route } from 'react-router-dom'
import { BuilderPage } from './pages/BuilderPage.tsx'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<BuilderPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
