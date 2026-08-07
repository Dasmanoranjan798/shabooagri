import { BrowserRouter, Route, Routes } from "react-router-dom";

// Scaffold placeholder only — route guards per role (Owner/Manager/Driver/Farmer)
// and real pages are added module-by-module, not here.
function ScaffoldPlaceholder() {
  return (
    <div style={{ padding: "2rem", fontFamily: "inherit" }}>
      <h1>ShabooAgri</h1>
      <p>Frontend scaffold boots. No feature modules built yet.</p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScaffoldPlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}
