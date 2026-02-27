import { useState } from "react"
import { Home, FileText, Wallet } from "lucide-react"
import HomeScreen from "./screens/HomeScreen"
import WalletScreen from "./screens/WalletScreen"
import DocsScreen from "./screens/DocsScreen"

export default function App() {
  const [activeTab, setActiveTab] = useState("home")

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-[#EAEFF2] overflow-hidden shadow-2xl relative">
      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === "home" && <HomeScreen onOrderDetail={() => setActiveTab("wallet")} />}
        {activeTab === "wallet" && <WalletScreen />}
        {activeTab === "docs" && <DocsScreen />}
      </main>

      <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-4 z-50">
        <button onClick={() => setActiveTab("home")} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#1CC8C8]' : 'text-[#8AAEBB]'}`}>
          <Home size={24} />
          <span className="text-[10px] font-bold uppercase">Início</span>
        </button>
        <button onClick={() => setActiveTab("docs")} className={`flex flex-col items-center gap-1 ${activeTab === 'docs' ? 'text-[#1CC8C8]' : 'text-[#8AAEBB]'}`}>
          <FileText size={24} />
          <span className="text-[10px] font-bold uppercase">Docs</span>
        </button>
        <button onClick={() => setActiveTab("wallet")} className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-[#1CC8C8]' : 'text-[#8AAEBB]'}`}>
          <Wallet size={24} />
          <span className="text-[10px] font-bold uppercase">Carteira</span>
        </button>
      </nav>
    </div>
  )
}