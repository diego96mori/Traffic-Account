import { Link } from "react-router-dom";

function Inicio() {
  return (
    <main className="inicio-page">
      <section className="inicio-hero">
        <div className="inicio-content">
          <div className="inicio-brand">
            <span className="inicio-brand-mark">WIN</span>
            <span className="inicio-brand-subtitle">
              Estadisticas de Trafico
            </span>
          </div>

          <div className="inicio-copy">
            <p className="inicio-kicker">
              Monitoreo interno
            </p>

            <h1>
              Control de trafico para enlaces y servicios
            </h1>

            <p className="inicio-description">
              Revisa capacidad, consumo inbound, outbound y alertas por uso
              desde una vista centralizada para la operacion de red.
            </p>

            <Link
              to="/anillos"
              className="inicio-main-button"
            >
              Estadistica de Trafico
            </Link>
          </div>
        </div>

        <div
          className="inicio-panel"
          aria-hidden="true"
        >
          <div className="inicio-panel-header">
            <span />
            <span />
            <span />
          </div>

          <div className="inicio-signal">
            <div>
              <strong>89.39</strong>
              <small>Gbps usados</small>
            </div>

            <div>
              <strong>70.20%</strong>
              <small>Libre</small>
            </div>
          </div>

          <div className="inicio-bars">
            <span style={{ height: "35%" }} />
            <span style={{ height: "48%" }} />
            <span style={{ height: "62%" }} />
            <span style={{ height: "54%" }} />
            <span style={{ height: "74%" }} />
            <span style={{ height: "46%" }} />
            <span style={{ height: "68%" }} />
            <span style={{ height: "82%" }} />
          </div>

          <div className="inicio-line">
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}

export default Inicio;
