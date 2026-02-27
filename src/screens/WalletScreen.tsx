export default function WalletScreen() {
  return (
    <div className="p-4">
      <div className="bg-slate-800 p-8 rounded-3xl text-white mb-6 shadow-xl">
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Saldo Total Muvv</p>
        <h2 className="text-4xl font-black mb-6">R$ 2.450,00</h2>
        
        <div className="flex gap-4">
          <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10">
            <p className="text-[10px] text-white/50">Câmbio Euro</p>
            <p className="text-lg font-bold">€ 410,20</p>
          </div>
          <div className="flex-1 bg-prestige/20 p-3 rounded-xl border border-prestige/30">
            <p className="text-[10px] text-prestige">Taxas Economizadas</p>
            <p className="text-lg font-bold text-prestige">R$ 124,00</p>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-slate-800 mb-4">Últimas Atividades</h3>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
            <div>
              <p className="font-bold text-sm text-slate-700">Frete ZPE - Terminal A</p>
              <p className="text-xs text-slate-400">Hoje, 14:30</p>
            </div>
            <p className="text-accent font-black">+ R$ 289,00</p>
          </div>
        ))}
      </div>
    </div>
  )
}