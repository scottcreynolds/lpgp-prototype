import { Dashboard } from "./components/Dashboard";
import DeveloperPanel from "./components/DeveloperPanel";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <>
      <Dashboard />
      <Toaster />
      <DeveloperPanel />
    </>
  );
}

export default App;
