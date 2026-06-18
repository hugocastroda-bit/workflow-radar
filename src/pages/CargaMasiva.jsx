import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Upload, CheckCircle, AlertCircle, AlertTriangle, Loader2, X, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { parse, isValid } from "date-fns";
import {
  CARGA_MASIVA_COLS as COLS,
  REQUIRED_FIELDS as REQUIRED,
  ENUMS,
  BOOLEAN_FIELDS,
} from "@/lib/pedidoConstants";

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    COLS,
    ["Regularización de pendiente ACI", "Paola Montenegro", "Acompañamiento", "Alta", "Ana López", "2026-06-23", "Media", "Bajo", "45", "30", "2026-06-20", "Pedido cargado como ejemplo", "Nuevo", "No", "Coordinar con legal", "", "Avance al 50%", "https://drive.google.com/..."]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
  XLSX.writeFile(wb, "plantilla_carga_masiva.xlsx");
}

// Intenta parsear una fecha desde múltiples formatos comunes en Excel
function parseDateToISO(raw) {
  if (!raw) return null;
  // Si ya es un número (fecha serial de Excel), intentar convertir
  if (typeof raw === "number") {
    // Excel date serial: días desde 1900-01-01 (con el bug de 1900)
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + raw * 86400000);
    if (isValid(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
      return d.toISOString().split("T")[0];
    }
    return null;
  }
  const str = raw.toString().trim();
  if (!str) return null;
  // Formatos comunes
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "dd-MM-yyyy", "yyyy/MM/dd", "d/M/yyyy", "M/d/yyyy"];
  for (const fmt of formats) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
      return parsed.toISOString().split("T")[0];
    }
  }
  return null;
}

export default function CargaMasiva() {
  const fileRef = useRef(null);
  const [catalogs, setCatalogs] = useState(null);
  const [rows, setRows] = useState([]);
  const [existingPedidos, setExistingPedidos] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Solicitante.filter({ activo: true }, "nombre"),
      base44.entities.Proceso.filter({ activo: true }, "nombre"),
      base44.entities.Prioridad.filter({ activo: true }, "nombre"),
      base44.entities.Responsable.filter({ activo: true }, "nombre"),
      base44.entities.Pedido.filter({ estado: "Nuevo" }, "-created_date", 500),
    ]).then(([sol, proc, prio, resp, pedidos]) => {
      setCatalogs({
        solicitantes: sol.map(s => s.nombre.toLowerCase()),
        procesos: proc.map(p => p.nombre.toLowerCase()),
        prioridades: prio.map(p => p.nombre.toLowerCase()),
        responsables: resp.map(r => r.nombre.toLowerCase()),
      });
      setExistingPedidos(pedidos);
    });
  }, []);

  const validateRow = (row, idx, cats, existing) => {
    const errors = [];
    const warnings = [];
    const errorFields = new Set(); // campos con error para resaltado visual

    for (const col of REQUIRED) {
      if (!row[col]?.toString().trim()) { errors.push(`Falta campo obligatorio: ${col}`); errorFields.add(col); }
    }

    if (cats) {
      if (row["Solicitante"] && !cats.solicitantes.includes(row["Solicitante"].toLowerCase()))
        { errors.push("El solicitante no existe en el catálogo."); errorFields.add("Solicitante"); }
      if (row["Proceso"] && !cats.procesos.includes(row["Proceso"].toLowerCase()))
        { errors.push("El proceso no existe en el catálogo."); errorFields.add("Proceso"); }
      if (row["Prioridad"] && !cats.prioridades.includes(row["Prioridad"].toLowerCase()))
        { errors.push("La prioridad no existe en el catálogo."); errorFields.add("Prioridad"); }
      if (row["Responsable"]?.trim() && !cats.responsables.includes(row["Responsable"].toLowerCase()))
        { errors.push("El responsable no existe en el catálogo."); errorFields.add("Responsable"); }
    }

    // Validar valores de enum
    for (const [col, valores] of Object.entries(ENUMS)) {
      const val = row[col]?.toString().trim();
      if (val && !valores.map(v => v.toLowerCase()).includes(val.toLowerCase()))
        { errors.push(`${col} debe ser: ${valores.join(", ")}.`); errorFields.add(col); }
    }

    // Validar fechas (parseo robusto)
    for (const dateCol of ["Fecha requerida", "Fecha compromiso"]) {
      const raw = row[dateCol]?.toString().trim();
      if (raw) {
        const parsed = parseDateToISO(raw);
        if (!parsed) { errors.push(`${dateCol} no es una fecha válida (use YYYY-MM-DD).`); errorFields.add(dateCol); }
      }
    }

    // Validar horas estimadas y horas reales como números
    const hrsEst = row["Horas estimadas"]?.toString().trim();
    if (hrsEst && (isNaN(Number(hrsEst)) || Number(hrsEst) < 0))
      { errors.push("Horas estimadas debe ser un número positivo (en minutos)."); errorFields.add("Horas estimadas"); }
    const hrsReal = row["Horas reales"]?.toString().trim();
    if (hrsReal && (isNaN(Number(hrsReal)) || Number(hrsReal) < 0))
      { errors.push("Horas reales debe ser un número positivo (en minutos)."); errorFields.add("Horas reales"); }

    // Validar campo booleano (Confidencial)
    const confVal = row["Confidencial"]?.toString().trim().toLowerCase();
    if (confVal && confVal !== "sí" && confVal !== "si" && confVal !== "no" && confVal !== "true" && confVal !== "false" && confVal !== "1" && confVal !== "0")
      { errors.push("Confidencial debe ser: Sí o No."); errorFields.add("Confidencial"); }

    const isDuplicate = existing.some(p =>
      p.titulo?.toLowerCase() === row["Título"]?.toLowerCase() &&
      p.solicitante?.toLowerCase() === row["Solicitante"]?.toLowerCase() &&
      p.proceso?.toLowerCase() === row["Proceso"]?.toLowerCase()
    );
    if (isDuplicate) warnings.push("Posible duplicado: ya existe un pedido abierto con el mismo título, solicitante y proceso.");

    return { errors, warnings, errorFields };
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const parsed = data.map((rawRow, idx) => {
        const row = {};
        for (const col of COLS) {
          row[col] = (rawRow[col] || "").toString().trim();
        }
        const { errors, warnings, errorFields } = validateRow(row, idx, catalogs, existingPedidos);
        return { ...row, _idx: idx + 2, _errors: errors, _warnings: warnings, _errorFields: errorFields, _skip: false };
      });
      setRows(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleSkip = (idx) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, _skip: !r._skip } : r));
  };

  const hasBlockingErrors = rows.some(r => !r._skip && r._errors.length > 0);
  const readyRows = rows.filter(r => !r._skip && r._errors.length === 0);
  const cellHasError = (row, col) => row._errorFields?.has(col);

  const parseBool = (val) => {
    const v = val?.toString().trim().toLowerCase();
    if (!v) return undefined;
    return v === "sí" || v === "si" || v === "true" || v === "1";
  };

  const handleImport = async () => {
   setImporting(true);
   const toImport = readyRows.map(r => {
     const hrsEst = r["Horas estimadas"]?.toString().trim();
     const hrsReal = r["Horas reales"]?.toString().trim();
     const estadoRaw = r["Estado"]?.toString().trim();
     const data = {
       titulo: r["Título"],
       solicitante: r["Solicitante"],
       proceso: r["Proceso"],
       prioridad: r["Prioridad"],
       responsable: r["Responsable"] || undefined,
       fecha_requerida: parseDateToISO(r["Fecha requerida"]) || undefined,
       complejidad: r["Complejidad"] || undefined,
       riesgo: r["Riesgo"] || undefined,
       horasEstimadas: hrsEst && !isNaN(Number(hrsEst)) ? Number(hrsEst) : undefined,
       horasReales: hrsReal && !isNaN(Number(hrsReal)) ? Number(hrsReal) : undefined,
       fechaCompromiso: parseDateToISO(r["Fecha compromiso"]) || undefined,
       descripcion: r["Descripción"] || undefined,
       estado: estadoRaw || "Nuevo",
       confidencial: parseBool(r["Confidencial"]),
       proxima_accion: r["Próxima acción"] || undefined,
       motivo_bloqueo: r["Motivo bloqueo"] || undefined,
       comentarios_avance: r["Comentarios avance"] || undefined,
       link_evidencia: r["Link evidencia"] || undefined,
     };
     // Remove undefined keys
     Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
     return data;
   });

    const duplicateRows = rows.filter(r => !r._skip && r._errors.length === 0 && r._warnings.length > 0);
    const skipped = rows.filter(r => r._skip);

    await base44.entities.Pedido.bulkCreate(toImport);

    setResult({
      total: rows.length,
      imported: toImport.length,
      errors: rows.filter(r => r._errors.length > 0).length,
      duplicatesImported: duplicateRows.length,
      skipped: skipped.length,
    });
    setImporting(false);
    setRows([]);
    setFileName("");
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Carga masiva</h1>
          <p className="text-xs text-muted-foreground mt-1">Importa varios pedidos a la vez desde un archivo Excel o CSV.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            Promise.all([
              base44.entities.Solicitante.filter({ activo: true }, "nombre"),
              base44.entities.Proceso.filter({ activo: true }, "nombre"),
              base44.entities.Prioridad.filter({ activo: true }, "nombre"),
              base44.entities.Responsable.filter({ activo: true }, "nombre"),
              base44.entities.Pedido.filter({ estado: "Nuevo" }, "-created_date", 500),
            ]).then(([sol, proc, prio, resp, pedidos]) => {
              setCatalogs({
                solicitantes: sol.map(s => s.nombre.toLowerCase()),
                procesos: proc.map(p => p.nombre.toLowerCase()),
                prioridades: prio.map(p => p.nombre.toLowerCase()),
                responsables: resp.map(r => r.nombre.toLowerCase()),
              });
              setExistingPedidos(pedidos);
            });
          }} className="gap-1.5" title="Refrescar catálogos">
            <RefreshCw className="h-3.5 w-3.5" /> Refrescar catálogos
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Descargar plantilla
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-2 text-success font-medium text-sm">
            <CheckCircle className="h-4 w-4" /> Carga masiva completada correctamente.
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5 ml-6 list-disc">
            <li>Filas leídas: <strong>{result.total}</strong></li>
            <li>Pedidos importados: <strong>{result.imported}</strong></li>
            <li>Filas con error (no importadas): <strong>{result.errors}</strong></li>
            <li>Posibles duplicados importados: <strong>{result.duplicatesImported}</strong></li>
            <li>Filas omitidas manualmente: <strong>{result.skipped}</strong></li>
          </ul>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setResult(null)}>
            Nueva carga
          </Button>
        </div>
      )}

      {/* Upload area */}
      {!result && (
        <>
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          >
            <Upload className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {fileName ? <span className="font-medium text-foreground">{fileName}</span> : "Haz clic o arrastra tu archivo aquí"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Formatos aceptados: .xlsx, .xls, .csv</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{rows.length} fila{rows.length !== 1 ? "s" : ""} detectadas</p>
                {hasBlockingErrors && (
                  <span className="text-xs text-alert flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Corrige los errores antes de importar
                  </span>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary">
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">#</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Título</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Solicitante</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Proceso</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Prioridad</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Resp.</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Complej.</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Riesgo</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Est.</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Real</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">F. req.</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">F. comp.</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Estado</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Conf.</th>
                        <th className="px-2 py-2.5 text-left text-muted-foreground font-medium uppercase tracking-wider text-[11px]">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const hasError = row._errors.length > 0;
                        const hasWarning = row._warnings.length > 0;
                        const errClass = (col) => cellHasError(row, col) ? "bg-alert/15 border-l-2 border-l-alert text-alert font-medium" : "";
                        return (
                          <tr key={i} className={`border-b border-border last:border-0 ${row._skip ? "opacity-40" : hasError ? "bg-alert/5" : hasWarning ? "bg-warning/10" : ""}`}>
                            <td className={`px-2 py-2 whitespace-nowrap ${row._skip ? "text-muted-foreground" : ""}`}>{row._idx}</td>
                            <td className={`px-2 py-2 max-w-[140px] truncate ${errClass("Título") || "text-foreground"}`} title={row["Título"]}>{row["Título"]}</td>
                            <td className={`px-2 py-2 max-w-[100px] truncate ${errClass("Solicitante") || "text-muted-foreground"}`} title={row["Solicitante"]}>{row["Solicitante"]}</td>
                            <td className={`px-2 py-2 max-w-[100px] truncate ${errClass("Proceso") || "text-muted-foreground"}`} title={row["Proceso"]}>{row["Proceso"]}</td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Prioridad") || "text-muted-foreground"}`}>{row["Prioridad"]}</td>
                            <td className={`px-2 py-2 max-w-[90px] truncate ${errClass("Responsable") || "text-muted-foreground"}`} title={row["Responsable"]}>{row["Responsable"] || "—"}</td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Complejidad") || "text-muted-foreground"}`}>{row["Complejidad"] || "—"}</td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Riesgo") || "text-muted-foreground"}`}>{row["Riesgo"] || "—"}</td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Horas estimadas") || "text-muted-foreground"}`}>{row["Horas estimadas"] || "—"}</td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Horas reales") || "text-muted-foreground"}`}>{row["Horas reales"] || "—"}</td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Fecha requerida") || "text-muted-foreground"}`}>{row["Fecha requerida"] || "—"}</td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Fecha compromiso") || "text-muted-foreground"}`}>{row["Fecha compromiso"] || "—"}</td>
                            <td className="px-2 py-2">
                              {row._skip ? (
                                <span className="text-muted-foreground whitespace-nowrap">Omitido</span>
                              ) : hasError ? (
                                <span className="text-alert flex items-center gap-1 whitespace-nowrap">
                                  <AlertCircle className="h-3 w-3" /> Error
                                </span>
                              ) : hasWarning ? (
                                <span className="text-warning flex items-center gap-1 whitespace-nowrap">
                                  <AlertTriangle className="h-3 w-3" /> Duplicado
                                </span>
                              ) : (
                                <span className="text-success flex items-center gap-1 whitespace-nowrap">
                                  <CheckCircle className="h-3 w-3" /> Listo
                                </span>
                              )}
                            </td>
                            <td className={`px-2 py-2 whitespace-nowrap ${errClass("Confidencial") || "text-muted-foreground"}`}>{row["Confidencial"] || "No"}</td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => toggleSkip(i)}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 whitespace-nowrap"
                              >
                                <X className="h-3 w-3" /> {row._skip ? "Incluir" : "Omitir"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error details */}
              {rows.some(r => r._errors.length > 0 || r._warnings.length > 0) && (
                <div className="space-y-1.5">
                  {rows.filter(r => (r._errors.length > 0 || r._warnings.length > 0) && !r._skip).map((row, i) => (
                    <div key={i} className={`text-xs rounded px-3 py-2 ${row._errors.length > 0 ? "bg-alert/10 text-alert" : "bg-warning/10 text-warning"}`}>
                      <span className="font-medium">Fila {row._idx}:</span>{" "}
                      {[...row._errors, ...row._warnings].join(" · ")}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setRows([]); setFileName(""); }}>Cancelar</Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={importing || hasBlockingErrors || readyRows.length === 0}
                  className="gap-1.5"
                >
                  {importing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando...</> : `Confirmar importación (${readyRows.length})`}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}