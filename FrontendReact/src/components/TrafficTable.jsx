import { formatGbps } from "../utils/formatters";

function TrafficTable({ data }) {
  return (
    <table border="1">

      <thead>
        <tr>
          <th>Bill</th>
          <th>Grupo</th>
          <th>Subgrupo</th>
          <th>Periodo</th>
          <th>Capacidad (Gbps)</th>
          <th>Inbound</th>
          <th>Outbound</th>
          <th>Uso</th>
          <th>% Uso</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            <td>{item.bill_name}</td>
            <td>{item.grupo}</td>
            <td>{item.subgrupo}</td>
            <td>{item.periodo_completo}</td>
            <td>{formatGbps(item.capacidad)}</td>
            <td>{item.inbound}</td>
            <td>{item.outbound}</td>
            <td>{formatGbps(item.uso)}</td>
            <td>{item.porcentaje_uso}%</td>
          </tr>
        ))}
      </tbody>

    </table>
  );
}

export default TrafficTable;
