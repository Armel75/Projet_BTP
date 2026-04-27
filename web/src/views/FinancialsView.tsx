import React, { useState } from "react";
import { 
  FileSignature, 
  FileEdit, 
  Receipt, 
  CreditCard,
  Target,
  ChevronRight
} from "lucide-react";
import { motion } from "motion/react";
import ContractModule from "../components/financials/ContractModule";
import ChangeOrderModule from "../components/financials/ChangeOrderModule";
import InvoiceModule from "../components/financials/InvoiceModule";
import PaymentModule from "../components/financials/PaymentModule";

type FinancialTab = "contracts" | "change-orders" | "invoices" | "payments";

export default function FinancialsView() {
  const [activeTab, setActiveTab] = useState<FinancialTab>("contracts");

  const tabs = [
    { id: "contracts", label: "Contrats", icon: FileSignature, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "change-orders", label: "Avenants", icon: FileEdit, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "invoices", label: "Facturation", icon: Receipt, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "payments", label: "Paiements", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gb-text flex items-center gap-3">
            <FileSignature className="text-gb-primary" size={32} />
            <span>Gestion Financière</span>
          </h2>
          <p className="text-gb-muted mt-1">Suivi des engagements contractuels, de la facturation et des règlements.</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FinancialTab)}
              className={`relative flex flex-col p-5 rounded-2xl border transition-all duration-300 text-left group overflow-hidden ${
                isActive 
                ? "bg-gb-surface-solid border-gb-primary shadow-xl shadow-gb-primary/10" 
                : "bg-gb-surface-solid border-gb-border hover:border-gb-primary/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${tab.bg} ${tab.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
              </div>
              <span className={`font-black text-sm uppercase tracking-wider ${isActive ? "text-gb-text" : "text-gb-muted group-hover:text-gb-text"}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeFinancialTab"
                  className="absolute bottom-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-gb-primary text-gb-inverse shadow-lg"
                >
                  <ChevronRight size={18} />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[500px]"
      >
        {activeTab === "contracts" && <ContractModule />}
        {activeTab === "change-orders" && <ChangeOrderModule />}
        {activeTab === "invoices" && <InvoiceModule />}
        {activeTab === "payments" && <PaymentModule />}
      </motion.div>
    </div>
  );
}
