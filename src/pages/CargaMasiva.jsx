import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Upload, CheckCircle, AlertCircle, AlertTriangle, Loader2, X } from "lucide-react";
import * as XLSX from "xlsx";

const COLS = ["Título", "Solicitante", "Proceso", "Prioridad", "Responsable", "Fecha requerida", "Descripción"];
const REQUIRED = ["Título", "Solicitante", "Proceso", "Prioridad"];

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    COLS,
    ["Regularización de pendiente ACI", "Paola Montenegro", "Acompañamiento", "Alta", "", "", "Pedido cargado como ejemplo"]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
  XLSX.writeFile(wb, "plantilla_carga_masiva.xlsx");
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

    for (const col of REQUIRED) {
      if (!row[col]?.toString().trim()) errors.push(`Falta campo obligatorio: ${col}`);
    }

    if (cats) {
      if (row["Solicitante"] && !cats.solicitantes.includes(row["Solicitante"].toLowerCase()))
        errors.push("El solicitante no existe en el catálogo.");
      if (row["Proceso"] && !cats.procesos.includes(row["Proceso"].toLowerCase()))
        errors.push("El proceso no existe en el catálogo.");
      if (row["Prioridad"] && !cats.prioridades.includes(row["Prioridad"].toLowerCase()))
        errors.push("La prioridad no existe en el catálogo.");
      if (row["Responsable"]?.trim() && !cats.responsables.includes(row["Responsable"].toLowerCase()))
        errors.push("El responsable no existe en el catálogo.");
    }

    const isDuplicate = existing.some(p =>
      p.titulo?.toLowerCase() === row["Título"]?.toLowerCase() &&
      p.solicitante?.toLowerCase() === row["Solicitante"]?.toLowerCase() &&
      p.proceso?.toLowerCase() === row["Proceso"]?.toLowerCase()
    );
    if (isDuplicate) warnings.push("Posible duplicado: ya existe un pedido abierto con el mismo título, solicitante y proceso.");

    return { errors, warnings };
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
        const { errors, warnings } = validateRow(row, idx, catalogs, existingPedidos);
        return { ...row, _idx: idx + 2, _errors: errors, _warnings: warnings, _skip: false };
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

  const handleImport = async () => {
   setImporting(true);
   const toImport = readyRows.map(r => ({
     titulo: r["Título"],
     solicitante: r["Solicitante"],
     proceso: r["Proceso"],
     prioridad: r["Prioridad"],
     responsable: r["Responsable"] || undefined,
     fecha_requerida: r["Fecha requerida"] || undefined,
     descripcion: r["Descripción"] || undefined,
     estado: "Nuevo",
   }));

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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Carga masiva</h1>
          <p className="text-xs text-slate-400 mt-0.5">Importa varios pedidos a la vez desde un archivo Excel o CSV.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Descargar plantilla
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
            <CheckCircle className="h-4 w-4" /> Carga masiva completada correctamente.
          </div>
          <ul className="text-xs text-slate-600 space-y-0.5 ml-6 list-disc">
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
            className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center cursor-pointer hover:border-slate-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          >
            <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {fileName ? <span className="font-medium text-slate-700">{fileName}</span> : "Haz clic o arrastra tu archivo aquí"}
            </p>
            <p className="text-xs text-slate-400 mt-1">Formatos aceptados: .xlsx, .xls, .csv</p>
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
                <p className="text-sm font-medium text-slate-700">{rows.length} fila{rows.length !== 1 ? "s" : ""} detectadas</p>
                {hasBlockingErrors && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Corrige los errores antes de importar
                  </span>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">#</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Título</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Solicitante</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Proceso</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Prioridad</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Responsable</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Fecha req.</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Estado</th>
                        <th className="px-3 py-2.5 text-left text-slate-500 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const hasError = row._errors.length > 0;
                        const hasWarning = row._warnings.length > 0;
                        return (
                          <tr key={i} className={`border-b border-slate-50 last:border-0 ${row._skip ? "opacity-40" : hasError ? "bg-red-50/40" : hasWarning ? "bg-yellow-50/30" : ""}`}>
                            <td className="px-3 py-2 text-slate-400">{row._idx}</td>
                            <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate">{row["Título"]}</td>
                            <td className="px-3 py-2 text-slate-500">{row["Solicitante"]}</td>
                            <td className="px-3 py-2 text-slate-500">{row["Proceso"]}</td>
                            <td className="px-3 py-2 text-slate-500">{row["Prioridad"]}</td>
                            <td className="px-3 py-2 text-slate-400">{row["Responsable"] || "—"}</td>
                            <td className="px-3 py-2 text-slate-400">{row["Fecha requerida"] || "—"}</td>
                            <td className="px-3 py-2">
                              {row._skip ? (
                                <span className="text-slate-400">Omitido</span>
                              ) : hasError ? (
                                <span className="text-red-500 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Error
                                </span>
                              ) : hasWarning ? (
                                <span className="text-yellow-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Duplicado
                                </span>
                              ) : (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> Listo
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => toggleSkip(i)}
                                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
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
                    <div key={i} className={`text-xs rounded px-3 py-2 ${row._errors.length > 0 ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
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
                  className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
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