import { Dashboard } from "./components/Dashboard";
import DeveloperPanel from "./components/DeveloperPanel";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <>
      <Dashboard />
      <Toaster />
      {/* Developer tools appear at the bottom of the page */}
      <DeveloperPanel />
    </>
  );
}

export default App;
