import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  CalendarDays, 
  Plus, 
  Search, 
  Loader2, 
  AlertCircle, 
  ChevronRight,
  CloudSun,
  Thermometer,
  Users,
  Hammer,
  Truck,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import DailyLogModule from "../components/reporting/DailyLogModule";
import WeeklyReportModule from "../components/reporting/WeeklyReportModule";

type ReportingTab = "daily" | "weekly";

export default function ReportingView() {
  const [activeTab, setActiveTab] = useState<ReportingTab>("daily");

  const tabs = [
    { id: "daily", label: "Journal de Chantier", icon: CalendarDays, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "weekly", label: "Rapports Hebdomadaires", icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gb-text flex items-center gap-3">
            <ClipboardList className="text-gb-primary" size={32} />
            <span>Reporting Chantier</span>
          </h2>
          <p className="text-gb-muted mt-1">Suivi quotidien et consolidation hebdomadaire des activités.</p>
        </div>
      </div>

      <div className="flex gap-4 p-1 bg-gb-surface-solid border border-gb-border rounded-2xl w-fit">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportingTab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all relative ${
                isActive 
                ? "text-gb-primary" 
                : "text-gb-muted hover:text-gb-text hover:bg-gb-app/50"
              }`}
            >
              <Icon size={18} />
              {tab.label}
              {isActive && (
                <motion.div 
                  layoutId="reportingTabActive"
                  className="absolute inset-0 bg-gb-primary/5 border border-gb-primary/20 rounded-xl -z-10"
                />
              )}
            </button>
          );
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[400px]"
      >
        {activeTab === "daily" && <DailyLogModule />}
        {activeTab === "weekly" && <WeeklyReportModule />}
      </motion.div>
    </div>
  );
}
