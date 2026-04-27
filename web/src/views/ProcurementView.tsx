import React, { useState } from "react";
import { 
  ShoppingCart, 
  FileText, 
  Users, 
  Truck, 
  PackageCheck, 
  ArrowRightLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import TenderModule from "../components/procurement/TenderModule";
import SupplierModule from "../components/procurement/SupplierModule";
import PurchaseOrderModule from "../components/procurement/PurchaseOrderModule";
import DeliveryModule from "../components/procurement/DeliveryModule";

type ProcurementTab = "tenders" | "suppliers" | "orders" | "deliveries";

export default function ProcurementView() {
  const [activeTab, setActiveTab] = useState<ProcurementTab>("tenders");

  const tabs = [
    { id: "tenders", label: "Appels d'offres", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "suppliers", label: "Fournisseurs", icon: Users, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "orders", label: "Commandes", icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "deliveries", label: "Livraisons & Réceptions", icon: Truck, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gb-text flex items-center gap-3">
            <ShoppingCart className="text-gb-primary" size={32} />
            <span>Gestion des Achats</span>
          </h2>
          <p className="text-gb-muted mt-1">Gérez vos appels d'offres, fournisseurs et cycle de commande.</p>
        </div>
      </div>

      {/* Tabs / Navigation Sub-header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProcurementTab)}
              className={`relative flex flex-col p-4 rounded-2xl border transition-all duration-300 text-left group ${
                isActive 
                ? "bg-gb-surface-solid border-gb-primary shadow-lg shadow-gb-primary/10" 
                : "bg-gb-surface-solid border-gb-border hover:border-gb-primary/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${tab.bg} ${tab.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
              </div>
              <span className={`font-bold text-sm ${isActive ? "text-gb-primary" : "text-gb-muted group-hover:text-gb-text"}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-gb-primary text-gb-inverse"
                >
                  <ChevronRight size={14} />
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
        className="min-h-[400px]"
      >
        {activeTab === "tenders" && <TenderModule />}
        {activeTab === "suppliers" && <SupplierModule />}
        {activeTab === "orders" && <PurchaseOrderModule />}
        {activeTab === "deliveries" && <DeliveryModule />}
      </motion.div>
    </div>
  );
}
