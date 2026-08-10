import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

function Sidebar() {
  const [colapsada, setColapsada] = useState(() => {
    try {
      return window.localStorage.getItem("winet-sidebar-colapsada") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("winet-sidebar-colapsada", String(colapsada));
    } catch {
      // La barra sigue funcionando aunque el navegador bloquee localStorage.
    }
  }, [colapsada]);

  return (

    <aside className={`sidebar ${colapsada ? "sidebar-collapsed" : ""}`}>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setColapsada(actual => !actual)}
        aria-label={colapsada ? "Mostrar barra lateral" : "Ocultar barra lateral"}
        aria-expanded={!colapsada}
        title={colapsada ? "Mostrar barra lateral" : "Ocultar barra lateral"}
      >
        <span aria-hidden="true">{colapsada ? "›" : "‹"}</span>
      </button>

      <div className="sidebar-header">
        <h1>WI-NET</h1>
        <p>Estadísticas de Tráfico</p>
      </div>

      <nav className="sidebar-menu">

        <NavLink
          to="/inicio"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Inicio
        </NavLink>

        {/* ANILLOS */}

        <NavLink
          to="/anillos"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Tráfico por Anillo
        </NavLink>

        {/* NODOS */}

        <NavLink
          to="/nodolima"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Nodos Lima
        </NavLink>

        <NavLink
          to="/nodosprovincia"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Nodos Provincia
        </NavLink>

        {/* OLT */}

        <NavLink
          to="/oltlima"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          OLT Lima
        </NavLink>

        <NavLink
          to="/oltprovincia"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          OLT Provincia
        </NavLink>

        {/* CDN / CORE / PNI */}

        <NavLink
          to="/cdn"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Tráfico CDN
        </NavLink>

        <NavLink
          to="/core"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Tráfico Core
        </NavLink>

        <NavLink
          to="/pni"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Tráfico PNI
        </NavLink>

        {/* MAYORISTAS */}

        <NavLink
          to="/mayoristas"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Mayoristas
        </NavLink>

        {/* PROVEEDORES */}

        <NavLink
          to="/proveedoresprovincia"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Proveedores Provincia
        </NavLink>

        <NavLink
          to="/internacionales"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Tráfico Internacional
        </NavLink>

        <NavLink
          to="/resumenolt"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Resumen OLT
        </NavLink>

        <NavLink
          to="/inventario-trafico"
          className={({ isActive }) =>
            isActive
              ? "sidebar-link active"
              : "sidebar-link"
          }
        >
          Inventario Tráfico
        </NavLink>

      </nav>

    </aside>

  );

}

export default Sidebar;
