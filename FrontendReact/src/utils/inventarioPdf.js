import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const COLORES = {
    tinta: [23, 32, 51],
    azul: [29, 78, 216],
    azulOscuro: [21, 34, 56],
    naranja: [245, 158, 11],
    normal: { fondo: [220, 252, 231], texto: [21, 128, 61] },
    revisar: { fondo: [254, 243, 199], texto: [161, 98, 7] },
    upgrade: { fondo: [254, 226, 226], texto: [185, 28, 28] },
    neutral: { fondo: [242, 244, 247], texto: [102, 112, 133] }
};

function numeroPdf(valor, decimales = 2) {
    if (valor == null || valor === "") return "-";
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "-";
    return numero.toLocaleString("es-PE", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

function cpuPdf(valor) {
    const texto = String(valor ?? "").trim();
    if (!texto) return "-";
    const numero = Number(texto.replace(",", "."));
    return Number.isFinite(numero) ? numeroPdf(numero) : texto;
}

function colorDecision(nivel) {
    return COLORES[nivel] || COLORES.neutral;
}

function dibujarEtiqueta(pdf, x, y, texto, colores) {
    pdf.setFillColor(...colores.fondo);
    pdf.roundedRect(x, y, 27, 6, 2, 2, "F");
    pdf.setTextColor(...colores.texto);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(texto, x + 13.5, y + 4, { align: "center" });
}

export function crearPdfInventario({
    filas,
    periodos,
    meses,
    nodo = "Callao",
    descargar = true
}) {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const periodoTexto = `${meses[periodos[0].mes - 1]} ${periodos[0].anio} - ${meses[periodos[1].mes - 1]} ${periodos[1].anio}`;
    const fechaGeneracion = new Date().toLocaleString("es-PE");
    const ultimoMes = filas.map(fila => fila.datosPeriodos[1]);
    const totales = {
        normal: ultimoMes.filter(item => item.decision.nivel === "normal").length,
        revisar: ultimoMes.filter(item => item.decision.nivel === "revisar").length,
        upgrade: ultimoMes.filter(item => item.decision.nivel === "upgrade").length
    };

    pdf.setFillColor(...COLORES.azulOscuro);
    pdf.rect(0, 0, anchoPagina, 30, "F");
    pdf.setTextColor(...COLORES.naranja);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);
    pdf.text("WI-NET", 12, 12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.text(`Inventario de Trafico - ${nodo}`, 12, 21);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Periodo: ${periodoTexto}`, anchoPagina - 12, 12, { align: "right" });
    pdf.text(`Generado: ${fechaGeneracion}`, anchoPagina - 12, 19, { align: "right" });

    pdf.setTextColor(...COLORES.tinta);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(`${filas.length} enlaces evaluados`, 12, 37);
    dibujarEtiqueta(pdf, 47, 33, `Normal: ${totales.normal}`, COLORES.normal);
    dibujarEtiqueta(pdf, 77, 33, `Revisar: ${totales.revisar}`, COLORES.revisar);
    dibujarEtiqueta(pdf, 107, 33, `Upgrade: ${totales.upgrade}`, COLORES.upgrade);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(102, 112, 133);
    pdf.text("CPU: valores manuales guardados en el archivo del servidor", anchoPagina - 12, 37, { align: "right" });

    const encabezadoDetalle = [
        "Consumo P95\n(Gbps)",
        "CPU maximo\n(%)",
        "CPU promedio\n(%)",
        "Capacidad de\nEnlace (Gbps)",
        "Uso\n(%)",
        "Variacion mes\nanterior (%)",
        "Toma de decision\n(Rate)"
    ];

    const cuerpo = filas.map(fila => [
        String(fila.billId),
        fila.nombre,
        ...fila.datosPeriodos.flatMap(item => [
            numeroPdf(item.registro?.consumo, 3),
            cpuPdf(item.valoresCpu.maximo),
            cpuPdf(item.valoresCpu.promedio),
            numeroPdf(item.registro?.capacidad, 3),
            item.uso == null ? "-" : `${numeroPdf(item.uso)}%`,
            Number.isFinite(item.variacion)
                ? `${item.variacion > 0 ? "+" : ""}${numeroPdf(item.variacion)}%`
                : "-",
            item.decision.texto
        ])
    ]);

    autoTable(pdf, {
        startY: 42,
        margin: { top: 42, right: 10, bottom: 16, left: 10 },
        tableWidth: "auto",
        theme: "grid",
        head: [
            [
                { content: "Bill ID", rowSpan: 2 },
                { content: "Nodo / Enlace", rowSpan: 2 },
                { content: `${meses[periodos[0].mes - 1]} ${periodos[0].anio}`, colSpan: 7, styles: { fillColor: [7, 89, 133] } },
                { content: `${meses[periodos[1].mes - 1]} ${periodos[1].anio}`, colSpan: 7, styles: { fillColor: COLORES.azul } }
            ],
            [...encabezadoDetalle, ...encabezadoDetalle]
        ],
        body: cuerpo,
        styles: {
            font: "helvetica",
            fontSize: 7.5,
            cellPadding: 2.4,
            halign: "center",
            valign: "middle",
            lineColor: [216, 224, 234],
            lineWidth: 0.2,
            textColor: [52, 64, 84],
            minCellHeight: 10
        },
        headStyles: {
            fillColor: COLORES.azulOscuro,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.2,
            minCellHeight: 9
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 13, fontStyle: "bold" },
            1: { cellWidth: 58, halign: "left", fontStyle: "bold", textColor: [29, 78, 216] },
            2: { cellWidth: 20 }, 3: { cellWidth: 19 }, 4: { cellWidth: 19 },
            5: { cellWidth: 19 }, 6: { cellWidth: 15 }, 7: { cellWidth: 20 }, 8: { cellWidth: 20 },
            9: { cellWidth: 20 }, 10: { cellWidth: 19 }, 11: { cellWidth: 19 },
            12: { cellWidth: 19 }, 13: { cellWidth: 15 }, 14: { cellWidth: 20 }, 15: { cellWidth: 20 }
        },
        didParseCell(data) {
            if (data.section !== "body") return;
            const indiceColumna = data.column.index;
            const indiceMes = indiceColumna >= 9 ? 1 : 0;
            const item = filas[data.row.index]?.datosPeriodos[indiceMes];
            if (!item) return;

            if (indiceColumna === 6 || indiceColumna === 13) {
                const colores = colorDecision(item.decision.nivel);
                data.cell.styles.fillColor = colores.fondo;
                data.cell.styles.textColor = colores.texto;
                data.cell.styles.fontStyle = "bold";
            }

            if (indiceColumna === 7 || indiceColumna === 14) {
                if (item.variacion < 0) data.cell.styles.textColor = [220, 38, 38];
                if (item.variacion > 0) data.cell.styles.textColor = [21, 128, 61];
                data.cell.styles.fontStyle = "bold";
            }

            if (indiceColumna === 8 || indiceColumna === 15) {
                const colores = colorDecision(item.decision.nivel);
                data.cell.styles.fillColor = colores.fondo;
                data.cell.styles.textColor = colores.texto;
                data.cell.styles.fontStyle = "bold";
            }
        },
        didDrawPage() {
            pdf.setDrawColor(216, 224, 234);
            pdf.line(10, altoPagina - 11, anchoPagina - 10, altoPagina - 11);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.setTextColor(102, 112, 133);
            pdf.text("Fuente: percentil 95 y capacidad de Traffic Accounting. Variacion = Uso actual - Uso anterior.", 10, altoPagina - 6);
            pdf.text(`Pagina ${pdf.internal.getNumberOfPages()}`, anchoPagina - 10, altoPagina - 6, { align: "right" });
        }
    });

    if (descargar) {
        const nombre = `Inventario_Trafico_${nodo}_${meses[periodos[0].mes - 1]}_${meses[periodos[1].mes - 1]}_${periodos[1].anio}.pdf`;
        pdf.save(nombre.replaceAll(" ", "_"));
    }

    return pdf;
}
