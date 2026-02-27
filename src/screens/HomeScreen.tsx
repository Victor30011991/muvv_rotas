import React from 'react';

interface HomeScreenProps {
  onOrderDetail: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onOrderDetail }) => {
  return (
    <div className="p-4 space-y-6">
      <header className="flex justify-between items-center py-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boa tarde, Marcos 🌊</h1>
          <p className="text-slate-500">Parnaíba, PI</p>
        </div>
      </header>

      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex justify-between items-start">
          <span className="font-bold text-slate-900">ZPE Export</span>
          <span className="text-slate-400 text-sm">23 km</span>
        </div>
        
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destino</p>
          <h2 className="text-xl font-black text-[#002D4B]">ZPE Piauí – Terminal A</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3">
            <p className="text-[10px] text-slate-400 font-bold">Valor Bruto</p>
            <p className="text-lg font-bold text-slate-700">R$ 340</p>
          </div>
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] text-[#1CC8C8] font-black uppercase">Líquido</p>
            <p className="text-xl font-black text-slate-900">R$ 289.00</p>
          </div>
        </div>

        <button 
          onClick={onOrderDetail}
          className="w-full py-4 bg-white border border-slate-100 rounded-2xl text-slate-300 font-bold"
        >
          {/* Espaço para o slider ou mais detalhes */}
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;