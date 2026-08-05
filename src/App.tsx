function App() {
  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-display font-bold text-forge-gold">
          Dofus Forge
        </h1>
        <p className="text-forge-muted text-lg">
          Unofficial build planner — coming soon
        </p>
        <p className="text-xs text-forge-muted/60 max-w-md mx-auto">
          Dofus and all related assets are property of Ankama Games.
          This is an unofficial fan project with no affiliation.
        </p>
        <p className="text-xs text-forge-muted/40">v{__APP_VERSION__}</p>
      </div>
    </div>
  )
}

export default App
