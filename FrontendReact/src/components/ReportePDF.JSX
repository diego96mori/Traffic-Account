import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
function ReportePDF({
    datos,
    titulo = "Reporte de Trafico por Anillos",
    nombreArchivo = "Reporte_Anillos",
    mostrarSubgrupo = false
}) {
    const [mensaje, setMensaje] = useState("");

    const formatearGbpsPDF = (valor) => {
        const numero = Number(valor || 0);

        if (!Number.isFinite(numero)) {
            return "0";
        }

        return numero.toFixed(3).replace(/\.?0+$/, "");
    };

    const generarPDF = () => {
        if (!datos || datos.length === 0) {
            setMensaje("No existen datos para generar el reporte.");
            return;
        }
        const ultimoRegistro = [...datos].sort((a, b) => {
            if (Number(a.anio) !== Number(b.anio)) {
                return Number(b.anio) - Number(a.anio);
            }
            return Number(b.mes) - Number(a.mes);
        })[0];
        if (!ultimoRegistro) {
            setMensaje("No se encontro informacion del ultimo mes.");
            return;
        }
        const ultimoMes = Number(ultimoRegistro.mes);
        const ultimoAnio = Number(ultimoRegistro.anio);
        const periodoUltimoMes = ultimoRegistro.periodo || `${ultimoMes}-${ultimoAnio}`;
        const enlaces70 = datos
            .filter(item =>
                Number(item.anio) === ultimoAnio &&
                Number(item.mes) === ultimoMes &&
                Number(item.porcentaje_uso) >= 70
            )
            .sort((a, b) => {
                const subgrupoA = a.subgrupo || "";
                const subgrupoB = b.subgrupo || "";

                if (subgrupoA !== subgrupoB) {
                    return subgrupoA.localeCompare(subgrupoB);
                }

                return a.bill_name.localeCompare(b.bill_name);
            });
        if (enlaces70.length === 0) {
            setMensaje(`No existen enlaces mayores o iguales a 70% en ${periodoUltimoMes}.`);
            return;
        }
        const pdf = new jsPDF("p", "mm", "a4");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.text("WIN NET", 105, 18, { align: "center" });
        pdf.setFontSize(16);
        pdf.text(titulo, 105, 28, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Fecha: ${new Date().toLocaleString()}`, 15, 40);
        pdf.text(`Periodo evaluado: ${periodoUltimoMes}`, 15, 46);
        pdf.text(`Enlaces >= 70%: ${enlaces70.length}`, 15, 52);
        pdf.setDrawColor(180);
        pdf.line(15, 58, 195, 58);
        let posicionY = 66;

        const estilosTabla = {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
            halign: "center",
            valign: "middle"
        };

        const estilosCabecera = {
            fillColor: [220, 38, 38],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
            valign: "middle"
        };

        if (mostrarSubgrupo) {

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.setTextColor(220, 38, 38);
            pdf.text(titulo.replace("Reporte de Trafico - ", "").toUpperCase(), 15, posicionY);

            autoTable(pdf, {
                startY: posicionY + 5,
                head: [[
                    "Subgrupo",
                    "Bill Name",
                    "Periodo",
                    "Capacidad",
                    "Uso",
                    "% Uso"
                ]],
                body: enlaces70.map(item => [
                    item.subgrupo || "",
                    item.bill_name,
                    item.periodo,
                    formatearGbpsPDF(item.capacidad),
                    formatearGbpsPDF(item.uso),
                    `${Number(item.porcentaje_uso).toFixed(2)}%`
                ]),
                theme: "grid",
                styles: estilosTabla,
                headStyles: estilosCabecera,
                columnStyles: {
                    0: { cellWidth: 35, halign: "center" },
                    1: { cellWidth: 58, halign: "center" },
                    2: { halign: "center" },
                    3: { halign: "center" },
                    4: { halign: "center" },
                    5: { halign: "center", fontStyle: "bold" }
                }
            });

        }
        else {

            enlaces70.forEach((item) => {

                if (posicionY > 250) {
                    pdf.addPage();
                    posicionY = 20;
                }

                const tituloAnillo = item.bill_name
                    .replace("WIN-", "")
                    .replaceAll("-", " ");

                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(13);
                pdf.setTextColor(220, 38, 38);
                pdf.text(tituloAnillo, 15, posicionY);

                autoTable(pdf, {
                    startY: posicionY + 5,
                    head: [[
                        "Bill Name",
                        "Periodo",
                        "Capacidad",
                        "Uso",
                        "% Uso"
                    ]],
                    body: [[
                        item.bill_name,
                        item.periodo,
                        formatearGbpsPDF(item.capacidad),
                        formatearGbpsPDF(item.uso),
                        `${Number(item.porcentaje_uso).toFixed(2)}%`
                    ]],
                    theme: "grid",
                    styles: estilosTabla,
                    headStyles: estilosCabecera,
                    columnStyles: {
                        0: { cellWidth: 70, halign: "center" },
                        1: { halign: "center" },
                        2: { halign: "center" },
                        3: { halign: "center" },
                        4: { halign: "center", fontStyle: "bold" }
                    }
                });

                posicionY = pdf.lastAutoTable.finalY + 14;

            });

        }
        pdf.save(`${nombreArchivo}_${periodoUltimoMes}.pdf`);
    };
    return (
        <>
        <button
            className="btn-reporte-anillos"
            onClick={generarPDF}
            style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer"
            }}
        >
            Reporte
        </button>

        {mensaje && (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(0,0,0,0.35)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10000
                }}
            >
                <div
                    style={{
                        width: "560px",
                        maxWidth: "90vw",
                        background: "white",
                        borderRadius: "10px",
                        boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
                        textAlign: "left",
                        overflow: "hidden"
                    }}
                >
                    <div
                        style={{
                            padding: "16px 20px",
                            borderBottom: "1px solid #e5e7eb",
                            fontWeight: "bold",
                            fontSize: "22px",
                            color: "#111827"
                        }}
                    >
                        Mensaje
                    </div>

                    <div
                        style={{
                            padding: "24px 24px",
                            color: "#111827",
                            fontSize: "18px",
                            lineHeight: "1.5"
                        }}
                    >
                        {mensaje}
                    </div>

                    <div
                        style={{
                            padding: "18px 24px",
                            display: "flex",
                            justifyContent: "flex-end",
                            borderTop: "1px solid #e5e7eb"
                        }}
                    >
                        <button
                            onClick={() => setMensaje("")}
                            style={{
                                background: "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                padding: "12px 24px",
                                fontSize: "16px",
                                fontWeight: "bold",
                                cursor: "pointer"
                            }}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
export default ReportePDF;

