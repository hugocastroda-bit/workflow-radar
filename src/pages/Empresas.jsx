import EmpresasTab from "@/components/EmpresasTab";

export default function Empresas() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Empresas</h1>
        <p className="text-xs text-muted-foreground mt-1">Administra las empresas registradas en la plataforma</p>
      </div>
      <EmpresasTab />
    </div>
  );
}