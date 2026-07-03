import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Inicio from "./pages/inicio";
import Dashboard from "./pages/dashboard";
import NodosLima from "./pages/nodolima";
import NodosProvincia from "./pages/nodosprovincia";
import OLTProvincia from "./pages/oltprovincia";
import CDN from "./pages/cdn";
import PNI from "./pages/pni";
import Mayorista from "./pages/mayorista";
import ProveedoresProvincia from "./pages/proveedoresprovincia";
import ProveedoresInternacionales from "./pages/internacionales";
import Core from "./pages/core";
import OLTLima from "./pages/oltlima";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ANILLOS */}

      <Route
  path="/"
  element={<Inicio />}
/>

        <Route
          path="/inicio"
          element={<Inicio />}
        />

        <Route
          path="/anillos"
          element={<Dashboard />}
        />

        {/* NODOS */}

        <Route
          path="/nodolima"
          element={<NodosLima />}
        />

        <Route
          path="/nodosprovincia"
          element={<NodosProvincia />}
        />

        {/* OLT */}

        <Route
          path="/oltlima"
          element={<OLTLima />}
        />

        <Route
          path="/oltprovincia"
          element={<OLTProvincia />}
        />

        {/* CDN */}

        <Route
          path="/cdn"
          element={<CDN />}
        />

        {/* PNI */}

        <Route
          path="/pni"
          element={<PNI />}
        />

        {/* MAYORISTAS */}

        <Route
          path="/mayoristas"
          element={<Mayorista />}
        />

        {/* PROVEEDORES */}

        <Route
          path="/proveedoresprovincia"
          element={<ProveedoresProvincia />}
        />

        <Route
          path="/internacionales"
          element={<ProveedoresInternacionales />}
        />

        {/* CORE */}

        <Route
          path="/core"
          element={<Core />}
        />

        <Route
          path="*"
          element={<Navigate to="/inicio" replace />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
