import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, AlertCircle, CheckCircle, AlertTriangle, Loader2, X } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const CONFIG = {
  solicitantes: {
    name: "Solicitantes",
    cols: ["Nombre", "Correo", "Área / Cargo", "Estado"],
    required: ["Nombre"],
    entity: "Solicitante",
    mapData: (row) => ({
      nombre: row["Nombre"],
      email: row["Correo"] || undefined,
      cargo_area: row["Área / Cargo"] || undefined,
      activo: row["Estado"]?.toLowerCase() === "inactivo" ? false : true,
    }),
    example: [
      ["Paola Montenegro", "paola.montenegro@empresa.com", "Gestión Humana", "Activo"],
    ],
  },
  responsables: {
    name: "Responsables",
    cols: ["Nombre", "Correo", "Rol / Función", "Estado"],
    required: ["Nombre"],
    entity: "Responsable",
    mapData: (row) => ({
      nombre: row["Nombre"],
      email: row["Correo"] || undefined,
      rol_funcion: row["Rol / Función"] || undefined,
      activo: row["Estado"]?.toLowerCase() === "inactivo" ? false : true,
    }),
    example: [
      ["Gianella Pérez", "gianella.perez@empresa.com", "Analista HRBP", "Activo"],
    ],
  },
  procesos: {
    name: "Procesos",
    cols: ["Nombre", "Descripción", "Estado"],
    required: ["Nombre"],
    entity: "Proceso",
    mapData: (row) => ({
      nombre: row["Nombre"],
      activo: row["Estado"]?.toLowerCase() === "inactivo" ? false : true,
    }),
    example: [
      ["Selección", "Pedidos relacionados a procesos de atracción y selección", "Activo"],
    ],
  },
  prioridades: {
    name: "Prioridades",
    cols: ["Nombre", "Descripción", "Estado", "Orden"],
    required: ["Nombre"],
    entity: "Prioridad",
    mapData: (row) => ({
      nombre: row["Nombre"],
      activo: row["Estado"]?.toLowerCase() === "inactivo" ? false : true,
    }),
    example: [
      ["Alta", "Requiere atención prioritaria", "Activo", "1"],
    ],
  },
};

function downloadTemplate(type) {
  const cfg = CONFIG[type];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([cfg.cols, ...cfg.example]);
  XLSX.utils.book_append_sheet(wb, ws, cfg.name);
  XLSX.writeFile(wb, `plantilla_${type}.xlsx`);
}

export default function BulkUploadModal({ open, onClose, type, onImported }) {
  const fileRef = useRef(null);
  const cfg = CONFIG[type];
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const validateRow = (row, idx, existingRecords) => {
    const errors = [];
    const warnings = [];

    // Check required fields
    for (const col of cfg.required) {
      if (!row[col]?.toString().trim()) {
        errors.push(`Falta campo obligatorio: ${col}`);
      }
    }

    // Check valid states
    if (row["Estado"] && !["Activo", "Inactivo"].includes(row["Estado"])) {
      errors.push("Estado debe ser 'Activo' o 'Inactivo'");
    }

    // Check for duplicates (by name, normalized)
    const nameKey = (row["Nombre"] || "").toLowerCase().trim();
    const isDup = existingRecords.some(
      (r) => (r.nombre || "").toLowerCase().trim() === nameKey
    );
    if (isDup) {
      warnings.push("Ya existe un registro con este nombre");
    }

    // Check email format if present
    if (row["Correo"]?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row["Correo"])) {
        errors.push("Correo inválido");
      }
    }

    return { errors, warnings };
  };

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    // Fetch existing records to check for duplicates
    let existingRecords = [];
    try {
      existingRecords = await base44.entities[cfg.entity].list();
    } catch (e) {
      console.warn("[BulkUpload] Error fetching existing:", e);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed = data.map((rawRow, idx) => {
          const row = {};
          for (const col of cfg.cols) {
            row[col] = (rawRow[col] || "").toString().trim();
          }
          const { errors, warnings } = validateRow(row, idx, existingRecords);
          return {
            ...row,
            _idx: idx + 2,
            _errors: errors,
            _warnings: warnings,
            _skip: false,
          };
        });

        setRows(parsed);
      } catch (err) {
        toast.error("No se pudo leer el archivo. Verifica el formato.");
        setRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleSkip = (idx) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, _skip: !r._skip } : r))
    );
  };

  const hasBlockingErrors = rows.some((r) => !r._skip && r._errors.length > 0);
  const readyRows = rows.filter((r) => !r._skip && r._errors.length === 0);

  const handleImport = async () => {
    setImporting(true);
    const toImport = readyRows.map((r) => cfg.mapData(r));

    try {
      await base44.entities[cfg.entity].bulkCreate(toImport);

      const duplicateRows = rows.filter(
        (r) => !r._skip && r._errors.length === 0 && r._warnings.length > 0
      );
      const skipped = rows.filter((r) => r._skip);

      setResult({
        total: rows.length,
        imported: toImport.length,
        errors: rows.filter((r) => r._errors.length > 0).length,
        duplicatesOmitted: duplicateRows.length,
        skipped: skipped.length,
      });

      onImported?.();
      setRows([]);
      setFileName("");
      toast.success("Carga masiva completada correctamente");
    } catch (err) {
      console.error("[BulkUpload] Import error:", err);
      toast.error("Error durante la importación. Intenta nuevamente.");
    }
    setImporting(false);
  };

  const handleClose = () => {
    setRows([]);
    setFileName("");
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Carga masiva de {cfg.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                <CheckCircle className="h-4 w-4" /> Carga completada correctamente
              </div>
              <ul className="text-xs text-slate-600 space-y-0.5 ml-6 list-disc">
                <li>Filas leídas: <strong>{result.total}</strong></li>
                <li>Registros importados: <strong>{result.imported}</strong></li>
                <li>Duplicados omitidos: <strong>{result.duplicatesOmitted}</strong></li>
                <li>Filas con error: <strong>{result.errors}</strong></li>
                <li>Filas omitidas: <strong>{result.skipped}</strong></li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setResult(null);
                  handleClose();
                }}
              >
                Cerrar
              </Button>
            </div>
          )}

          {/* Upload */}
          {!result && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Descarga la plantilla, llénala y sube el archivo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate(type)}
                  className="gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar plantilla
                </Button>
              </div>

              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {fileName ? (
                    <span className="font-medium text-slate-700">{fileName}</span>
                  ) : (
                    "Haz clic o arrastra tu archivo aquí"
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos: .xlsx, .xls, .csv
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {/* Preview */}
              {rows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {rows.length} fila{rows.length !== 1 ? "s" : ""} detectadas
                    </p>
                    {hasBlockingErrors && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Corrige los
                        errores antes de importar
                      </span>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-3 py-2.5 text-left text-slate-500 font-medium">
                              #
                            </th>
                            {cfg.cols.map((col) => (
                              <th
                                key={col}
                                className="px-3 py-2.5 text-left text-slate-500 font-medium"
                              >
                                {col}
                              </th>
                            ))}
                            <th className="px-3 py-2.5 text-left text-slate-500 font-medium">
                              Estado
                            </th>
                            <th className="px-3 py-2.5 text-left text-slate-500 font-medium">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => {
                            const hasError = row._errors.length > 0;
                            const hasWarning = row._warnings.length > 0;
                            return (
                              <tr
                                key={i}
                                className={`border-b border-slate-50 last:border-0 ${
                                  row._skip
                                    ? "opacity-40"
                                    : hasError
                                      ? "bg-red-50/40"
                                      : hasWarning
                                        ? "bg-yellow-50/30"
                                        : ""
                                }`}
                              >
                                <td className="px-3 py-2 text-slate-400">
                                  {row._idx}
                                </td>
                                {cfg.cols.map((col) => (
                                  <td
                                    key={col}
                                    className="px-3 py-2 text-slate-700 max-w-[120px] truncate"
                                  >
                                    {row[col] || "—"}
                                  </td>
                                ))}
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
                                    <X className="h-3 w-3" />{" "}
                                    {row._skip ? "Incluir" : "Omitir"}
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
                  {rows.some((r) => r._errors.length > 0 || r._warnings.length > 0) && (
                    <div className="space-y-1.5">
                      {rows
                        .filter(
                          (r) =>
                            (r._errors.length > 0 || r._warnings.length > 0) &&
                            !r._skip
                        )
                        .map((row, i) => (
                          <div
                            key={i}
                            className={`text-xs rounded px-3 py-2 ${
                              row._errors.length > 0
                                ? "bg-red-50 text-red-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            <span className="font-medium">Fila {row._idx}:</span>{" "}
                            {[...row._errors, ...row._warnings].join(" · ")}
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRows([]);
                        setFileName("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleImport}
                      disabled={importing || hasBlockingErrors || readyRows.length === 0}
                      className="gap-1.5"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando...
                        </>
                      ) : (
                        `Confirmar importación (${readyRows.length})`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}