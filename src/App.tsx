import { Dashboard } from "./components/Dashboard";
import DeveloperPanel from "./components/DeveloperPanel";
import GamesAdminButton from "./components/GamesAdminButton";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <>
      <Dashboard />
      <Toaster />
      <DeveloperPanel />
      <GamesAdminButton />
    </>
  );
}

export default App;
