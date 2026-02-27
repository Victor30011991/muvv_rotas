export default function DocsScreen() {
  const docs = [
    { label: "CNH Digital", status: "Verificado", color: "text-accent" },
    { label: "ANTT", status: "Verificado", color: "text-accent" },
    { label: "Seguro ZPE Gold", status: "Pendente", color: "text-prestige" },
  ]

  return (
    <div className="p-4">
      <h2 className="text-2xl font-black text-slate-800 mb-2">Central de Docs</h2>
      <p className="text-slate-400 text-sm mb-6">Mantenha sua conta ativa para fretes premium.</p>

      <div className="space-y-4">
        {docs.map((doc, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border-2 border-slate-50 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-700">{doc.label}</p>
              <p className={`text-xs font-bold ${doc.color}`}>{doc.status}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              ✓
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}