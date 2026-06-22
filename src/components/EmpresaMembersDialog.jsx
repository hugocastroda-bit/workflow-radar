import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Check, X, Link2, Unlink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function EmpresaMembersDialog({ empresa, open, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [asignando, setAsignando] = useState({});
  const [rolSeleccionado, setRolSeleccionado] = useState({});

  const load = async () => {
    if (!empresa) return;
    setLoading(true);
    try {
      const [todosUsuarios, membresias] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.UsuarioEmpresa.filter({ empresaId: empresa.id }),
      ]);

      const map = {};
      membresias.forEach(m => { map[m.usuarioId] = m; });

      const merged = todosUsuarios.map(u => ({
        ...u,
        membresia: map[u.id] || null,
        asignado: !!map[u.id],
      }));
      setUsuarios(merged);
    } catch (e) {
      console.warn("Error loading members:", e);
      toast.error("No se pudieron cargar los usuarios.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && empresa) load();
  }, [open, empresa]);

  const handleAsignar = async (usuarioId) => {
    const rol = rolSeleccionado[usuarioId] || "User";
    setAsignando(prev => ({ ...prev, [usuarioId]: true }));
    try {
      await base44.entities.UsuarioEmpresa.create({
        usuarioId,
        empresaId: empresa.id,
        rol,
        estado: "Activo",
        fechaAsignacion: new Date().toISOString().split("T")[0],
      });
      toast.success("Usuario asignado.");
      load();
    } catch (err) {
      toast.error("No se pudo asignar el usuario.");
    }
    setAsignando(prev => ({ ...prev, [usuarioId]: false }));
  };

  const handleDesasignar = async (usuarioId) => {
    const u = usuarios.find(x => x.id === usuarioId);
    if (!u?.membresia) return;
    setAsignando(prev => ({ ...prev, [usuarioId]: true }));
    try {
      await base44.entities.UsuarioEmpresa.delete(u.membresia.id);
      toast.success("Usuario removido.");
      load();
    } catch (err) {
      toast.error("No se pudo remover el usuario.");
    }
    setAsignando(prev => ({ ...prev, [usuarioId]: false }));
  };

  const handleCambiarRol = async (usuarioId, nuevoRol) => {
    const u = usuarios.find(x => x.id === usuarioId);
    if (!u?.membresia) return;
    try {
      await base44.entities.UsuarioEmpresa.update(u.membresia.id, { rol: nuevoRol });
      toast.success("Rol actualizado.");
      load();
    } catch (err) {
      toast.error("No se pudo actualizar el rol.");
    }
  };

  const handleToggleEstado = async (usuarioId) => {
    const u = usuarios.find(x => x.id === usuarioId);
    if (!u?.membresia) return;
    const nuevoEstado = u.membresia.estado === "Activo" ? "Inactivo" : "Activo";
    try {
      await base44.entities.UsuarioEmpresa.update(u.membresia.id, { estado: nuevoEstado });
      toast.success(`Usuario ${nuevoEstado === "Activo" ? "activado" : "desactivado"}.`);
      load();
    } catch (err) {
      toast.error("No se pudo actualizar el estado.");
    }
  };

  const filtrados = usuarios.filter(u => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const asignados = usuarios.filter(u => u.asignado).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Miembros de {empresa?.nombreEmpresa || "empresa"}
            <span className="text-muted-foreground font-normal ml-2">({asignados} asignados)</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="h-9 text-sm pl-9" />
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Usuario</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Rol</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(u => (
                    <tr key={u.id} className={`border-b border-border/50 last:border-0 ${u.asignado ? "bg-primary/[0.02]" : ""}`}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground text-xs">{u.full_name || "—"}</p>
                        <p className="text-muted-foreground text-[11px]">{u.email}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        {u.asignado ? (
                          <Select value={u.membresia.rol} onValueChange={v => handleCambiarRol(u.id, v)}>
                            <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="User" className="text-xs">Usuario</SelectItem>
                              <SelectItem value="Admin" className="text-xs">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select value={rolSeleccionado[u.id] || "User"} onValueChange={v => setRolSeleccionado(prev => ({ ...prev, [u.id]: v }))}>
                            <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="User" className="text-xs">Usuario</SelectItem>
                              <SelectItem value="Admin" className="text-xs">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {u.asignado ? (
                          <button onClick={() => handleToggleEstado(u.id)}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition ${
                              u.membresia.estado === "Activo"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}>{u.membresia.estado}</button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {u.asignado ? (
                          <button onClick={() => handleDesasignar(u.id)}
                            disabled={asignando[u.id]}
                            className="p-1.5 rounded hover:bg-alert/10 text-muted-foreground hover:text-alert transition-colors"
                            title="Remover de la empresa">
                            {asignando[u.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                          </button>
                        ) : (
                          <button onClick={() => handleAsignar(u.id)}
                            disabled={asignando[u.id]}
                            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Asignar a esta empresa">
                            {asignando[u.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtrados.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No se encontraron usuarios</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}