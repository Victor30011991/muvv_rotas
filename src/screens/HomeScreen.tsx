import { calcNet } from '../utils/profit'

export default function HomeScreen({ onOrderDetail }: { onOrderDetail: (f: any) => void }) {
  const freight = { 
    from: "Parnaíba Centro", 
    to: "ZPE Piauí – Terminal A", 
    distance: "23 km", 
    value: 340, 
    category: "zpe" 
  }
  
  const { net, fee, rate } = calcNet(freight.value, freight.category)

  return (
    <div className="p-4">
      <div className="bg-secondary p-6 rounded-b-3xl -mx-4 -mt-4 mb-6">
        <h2 className="text-white text-xl font-bold">Boa tarde, Marcos 🌊</h2>
        <p className="text-white/80 text-sm">Parnaíba, PI</p>
      </div>

      {/* Card de Frete Disponível */}
      <div className="bg-white p-5 rounded-2xl shadow-lg border border-secondary/10">
        <div className="flex justify-between items-start mb-4">
          <span className="bg-accent/10 text-accent text-xs font-bold px-3 py-1 rounded-full">ZPE Export</span>
          <span className="text-slate-400 text-xs">{freight.distance}</span>
        </div>
        
        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase">Destino</p>
          <p className="text-lg font-bold text-slate-800">{freight.to}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-primary p-3 rounded-xl">
            <p className="text-[10px] text-slate-500">Valor Bruto</p>
            <p className="font-bold text-slate-700">R$ {freight.value}</p>
          </div>
          <div className="bg-accent/5 p-3 rounded-xl border border-accent/20">
            <p className="text-[10px] text-accent font-bold uppercase">Líquido</p>
            <p className="font-extrabold text-accent">R$ {net.toFixed(2)}</p>
          </div>
        </div>

        <button 
          onClick={() => onOrderDetail(freight)}
          className="w-full bg-accent text-white font-bold py-4 rounded-xl shadow-lg shadow-accent/30 active:scale-95 transition-transform"
        >
          Ver Detalhes do Frete
        </button>
      </div>
    </div>
  )
}