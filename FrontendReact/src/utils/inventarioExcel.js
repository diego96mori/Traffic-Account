const COLORES = {
    tinta: "FF172033",
    azul: "FF1D4ED8",
    azulOscuro: "FF152238",
    celeste: "FF075985",
    borde: "FFD8E0EA",
    filaAlterna: "FFF8FAFC",
    normalFondo: "FFDCFCE7",
    normalTexto: "FF15803D",
    revisarFondo: "FFFEF3C7",
    revisarTexto: "FFA16207",
    upgradeFondo: "FFFEE2E2",
    upgradeTexto: "FFB91C1C",
    neutralFondo: "FFF2F4F7",
    neutralTexto: "FF667085"
};

const ENCABEZADOS_MES = [
    "Consumo P95 (Gbps)",
    "CPU máximo (%)",
    "CPU promedio (%)",
    "Capacidad de enlace (Gbps)",
    "Uso (%)",
    "Variación mes anterior (%)",
    "Toma de decisión"
];

function numeroOpcional(valor) {
    if (valor == null || valor === "") return null;
    const numero = Number(String(valor).replace(",", "."));
    return Number.isFinite(numero) ? numero : null;
}

function estiloDecision(nivel) {
    if (nivel === "normal") return [COLORES.normalFondo, COLORES.normalTexto];
    if (nivel === "revisar") return [COLORES.revisarFondo, COLORES.revisarTexto];
    if (nivel === "upgrade") return [COLORES.upgradeFondo, COLORES.upgradeTexto];
    return [COLORES.neutralFondo, COLORES.neutralTexto];
}

function limpiarNombreArchivo(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

export async function crearLibroExcelInventario({ filas, periodos, meses, nodo, decision }) {
    const moduloExcel = await import("exceljs");
    const ExcelJS = moduloExcel.default || moduloExcel;
    const libro = new ExcelJS.Workbook();
    libro.creator = "WI-NET";
    libro.company = "WI-NET";
    libro.subject = "Inventario de tráfico";
    libro.title = "Reporte profesional de inventario de tráfico";
    libro.created = new Date();

    const hoja = libro.addWorksheet("Inventario Tráfico", {
        views: [{ state: "frozen", xSplit: 2, ySplit: 6, topLeftCell: "C7", showGridLines: false }],
        pageSetup: {
            orientation: "landscape",
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
        }
    });

    hoja.properties.defaultRowHeight = 20;
    hoja.headerFooter.oddFooter = "WI-NET · Inventario de Tráfico    Página &P de &N";
    hoja.columns = [
        { key: "billId", width: 18 },
        { key: "enlace", width: 39 },
        ...Array.from({ length: 2 }, () => [
            { width: 16 }, { width: 15 }, { width: 16 }, { width: 18 },
            { width: 12 }, { width: 18 }, { width: 18 }
        ]).flat()
    ];

    hoja.mergeCells("A1:P1");
    hoja.getCell("A1").value = "WI-NET · INVENTARIO DE TRÁFICO";
    hoja.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: "FFFFFFFF" } };
    hoja.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.azulOscuro } };
    hoja.getCell("A1").alignment = { horizontal: "left", vertical: "middle" };
    hoja.getRow(1).height = 34;

    const periodoTexto = `${meses[periodos[0].mes - 1]} ${periodos[0].anio} — ${meses[periodos[1].mes - 1]} ${periodos[1].anio}`;
    hoja.mergeCells("A2:P2");
    hoja.getCell("A2").value = `Periodo: ${periodoTexto}  |  Nodo: ${nodo}  |  Decisión del último mes: ${decision || "Todas"}`;
    hoja.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FF475467" } };
    hoja.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };
    hoja.getRow(2).height = 25;

    const ultimoMes = filas.map(fila => fila.datosPeriodos.at(-1));
    const totales = {
        normal: ultimoMes.filter(item => item?.decision.nivel === "normal").length,
        revisar: ultimoMes.filter(item => item?.decision.nivel === "revisar").length,
        upgrade: ultimoMes.filter(item => item?.decision.nivel === "upgrade").length
    };
    const resumen = [
        ["Enlaces evaluados", filas.length, "Normal", totales.normal, "Revisar", totales.revisar, "Upgrade", totales.upgrade]
    ];
    hoja.getRow(3).values = resumen[0];
    [1, 3, 5, 7].forEach(columna => {
        const celda = hoja.getCell(3, columna);
        celda.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORES.tinta } };
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF4FA" } };
    });
    [2, 4, 6, 8].forEach(columna => {
        const celda = hoja.getCell(3, columna);
        celda.font = { name: "Aptos", size: 11, bold: true, color: { argb: COLORES.azul } };
        celda.alignment = { horizontal: "center" };
    });
    hoja.getRow(3).height = 24;

    hoja.getRow(5).values = [
        "Identificación",
        "Enlace",
        `${meses[periodos[0].mes - 1]} ${periodos[0].anio}`,
        ...Array(6).fill(null),
        `${meses[periodos[1].mes - 1]} ${periodos[1].anio}`
    ];
    hoja.mergeCells("C5:I5");
    hoja.mergeCells("J5:P5");
    hoja.getCell("A5").value = "Identificación";
    hoja.getCell("B5").value = "Enlace";

    ["A5", "B5"].forEach(direccion => {
        const celda = hoja.getCell(direccion);
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.azulOscuro } };
    });
    hoja.getCell("C5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.celeste } };
    hoja.getCell("J5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.azul } };
    hoja.getRow(5).eachCell(celda => {
        celda.font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        celda.alignment = { horizontal: "center", vertical: "middle" };
    });
    hoja.getRow(5).height = 27;

    hoja.getRow(6).values = ["Bill ID", "Nodo / Enlace", ...ENCABEZADOS_MES, ...ENCABEZADOS_MES];
    hoja.getRow(6).eachCell(celda => {
        celda.font = { name: "Aptos", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.azulOscuro } };
        celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        celda.border = { bottom: { style: "medium", color: { argb: COLORES.tinta } } };
    });
    hoja.getRow(6).height = 38;

    filas.forEach((fila, indice) => {
        const valores = [
            String(fila.billId),
            `${fila.nombre}\n${fila.nodos.join(" · ")}`,
            ...fila.datosPeriodos.flatMap(item => [
                numeroOpcional(item.registro?.consumo),
                numeroOpcional(item.valoresCpu.maximo),
                numeroOpcional(item.valoresCpu.promedio),
                numeroOpcional(item.registro?.capacidad),
                item.uso == null ? null : Number(item.uso) / 100,
                Number.isFinite(item.variacion) ? Number(item.variacion) / 100 : null,
                item.decision.texto
            ])
        ];
        const filaExcel = hoja.addRow(valores);
        filaExcel.height = 31;
        filaExcel.eachCell({ includeEmpty: true }, celda => {
            celda.font = { name: "Aptos", size: 10, color: { argb: COLORES.tinta } };
            celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            celda.border = { bottom: { style: "thin", color: { argb: COLORES.borde } } };
            if (indice % 2 === 1) {
                celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.filaAlterna } };
            }
        });
        filaExcel.getCell(1).font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORES.tinta } };
        filaExcel.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        filaExcel.getCell(2).font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORES.azul } };

        [3, 6, 10, 13].forEach(columna => {
            filaExcel.getCell(columna).numFmt = "#,##0.000";
        });
        [4, 5, 11, 12].forEach(columna => {
            filaExcel.getCell(columna).numFmt = "0.00";
        });
        [7, 8, 14, 15].forEach(columna => {
            filaExcel.getCell(columna).numFmt = "0.00%";
            filaExcel.getCell(columna).font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORES.tinta } };
        });

        fila.datosPeriodos.forEach((item, indicePeriodo) => {
            const columnaUso = indicePeriodo === 0 ? 7 : 14;
            const columnaVariacion = indicePeriodo === 0 ? 8 : 15;
            const columnaDecision = indicePeriodo === 0 ? 9 : 16;
            const [fondo, texto] = estiloDecision(item.decision.nivel);
            filaExcel.getCell(columnaUso).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fondo } };
            filaExcel.getCell(columnaDecision).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fondo } };
            filaExcel.getCell(columnaDecision).font = { name: "Aptos", size: 10, bold: true, color: { argb: texto } };
            if (item.variacion > 0) filaExcel.getCell(columnaVariacion).font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORES.normalTexto } };
            if (item.variacion < 0) filaExcel.getCell(columnaVariacion).font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFDC2626" } };
        });
    });

    const ultimaFila = Math.max(6, hoja.rowCount);
    hoja.autoFilter = { from: "A6", to: `P${ultimaFila}` };
    hoja.getColumn(10).eachCell({ includeEmpty: true }, celda => {
        celda.border = {
            ...celda.border,
            left: { style: "medium", color: { argb: "FF334155" } }
        };
    });
    hoja.pageSetup.printArea = `A1:P${ultimaFila}`;

    return libro;
}

export async function descargarExcelInventario(configuracion) {
    const libro = await crearLibroExcelInventario(configuracion);
    const contenido = await libro.xlsx.writeBuffer();
    const blob = new Blob([contenido], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    const periodo = configuracion.periodos.at(-1);
    const nombre = limpiarNombreArchivo(
        `Inventario_Trafico_${configuracion.nodo}_${configuracion.meses[periodo.mes - 1]}_${periodo.anio}`
    );
    enlace.href = url;
    enlace.download = `${nombre}.xlsx`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
