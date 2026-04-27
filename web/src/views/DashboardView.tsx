import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { 
  BarChart3, Users, Building2, AlertTriangle, 
  TrendingUp, TrendingDown, ClipboardCheck, 
  Package, Clock, CheckCircle2, MoreHorizontal,
  ChevronRight, ArrowUpRight, HardHat, FileText,
  BadgeAlert
} from "lucide-react";
import { motion } from "motion/react";

// Mock Data based on Schema Analysis
const PROGRESS_DATA = [
  { name: "Sem 1", planned: 0, actual: 0 },
  { name: "Sem 2", planned: 10, actual: 8 },
  { name: "Sem 3", planned: 25, actual: 20 },
  { name: "Sem 4", planned: 45, actual: 42 },
  { name: "Sem 5", planned: 60, actual: 55 },
  { name: "Sem 6", planned: 80, actual: 78 },
];

const BUDGET_DATA = [
  { category: "Gros Œuvre", planned: 450000, actual: 420000 },
  { category: "Second Œuvre", planned: 300000, actual: 315000 },
  { category: "Équipements", planned: 200000, actual: 180000 },
  { category: "MO", planned: 150000, actual: 165000 },
];

const INCIDENT_DATA = [
  { name: "Sécurité", value: 3, color: "#ef4444" },
  { name: "Qualité", value: 8, color: "#f59e0b" },
  { name: "Retard", value: 5, color: "#3b82f6" },
  { name: "Technique", value: 4, color: "#8b5cf6" },
];

const RECENT_DOCS = [
  { id: 1, type: "PV", name: "Réception Fondations", date: "Il y a 2h", status: "Validé" },
  { id: 2, type: "RFI", name: "Clarification Plan C-04", date: "Il y a 5h", status: "Ouvert" },
  { id: 3, type: "PO", name: "Commande Acier HA12", date: "Hier", status: "En attente" },
];

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  isPositive: boolean;
  color: string;
}

const KpiCard = ({ label, value, icon, trend, isPositive, color }: KpiCardProps) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-gb-surface-solid border border-gb-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
        {React.cloneElement(icon as React.ReactElement, { className: color })}
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {trend}
      </div>
    </div>
    <div>
      <p className="text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-3xl font-black text-gb-text tracking-tight">{value}</h3>
    </div>
  </motion.div>
);

export default function DashboardView() {
  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-gb-text">Dashboard Excellence</h2>
          <p className="text-gb-muted text-sm font-medium">Vue consolidée - Chantier Résidence Horizon</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-4 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-xs font-bold hover:bg-gb-surface-hover transition-colors flex items-center justify-center gap-2">
            <ClipboardCheck size={16} /> Rapport Hebdo
          </button>
          <button className="flex-1 md:flex-none px-4 py-2 bg-gb-primary text-gb-inverse rounded-xl text-xs font-black shadow-lg shadow-gb-primary/20 hover:bg-gb-primary-dark transition-all flex items-center justify-center gap-2">
            <TrendingUp size={16} /> Analyse IA
          </button>
        </div>
      </div>

      {/* 2. KPI Top Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard 
          label="Progression Globale" 
          value="78.4%" 
          trend="+5.2%" 
          isPositive={true} 
          icon={<CheckCircle2 size={24} />} 
          color="text-emerald-500"
        />
        <KpiCard 
          label="Consommation Budget" 
          value="1.2M €" 
          trend="82%" 
          isPositive={true} 
          icon={<BarChart3 size={24} />} 
          color="text-blue-500"
        />
        <KpiCard 
          label="Incidents Ouverts" 
          value="20" 
          trend="-3" 
          isPositive={true} 
          icon={<AlertTriangle size={24} />} 
          color="text-rose-500"
        />
        <KpiCard 
          label="Livraisons à venir" 
          value="12" 
          trend="+2" 
          isPositive={true} 
          icon={<Package size={24} />} 
          color="text-amber-500"
        />
      </div>

      {/* 3. Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Execution S-Curve */}
        <div className="lg:col-span-2 bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-lg text-gb-text tracking-tight uppercase">Avancement Chantier</h3>
              <p className="text-xs text-gb-muted font-bold">Courbe S : Prévu vs Réel</p>
            </div>
            <select className="bg-gb-app border border-gb-border rounded-lg text-[10px] font-bold px-2 py-1 outline-none">
              <option>Derniers 30 jours</option>
              <option>Toute la durée</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PROGRESS_DATA}>
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#fff", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="planned" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1} 
                  fill="url(#colorPlanned)" 
                  name="Planifié"
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorActual)" 
                  name="Réalisé"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-black text-lg text-gb-text tracking-tight uppercase mb-6">Profil Risques</h3>
          <div className="h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={INCIDENT_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {INCIDENT_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-gb-text">20</span>
              <span className="text-[10px] font-bold text-gb-muted uppercase">Total</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {INCIDENT_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-gb-muted uppercase">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gb-text">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Secondary Grid: Finance & Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Budget Execution */}
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-lg text-gb-text tracking-tight uppercase">Pilotage Financier</h3>
            <button className="text-[10px] font-black text-gb-primary hover:underline uppercase">Détails Invoices</button>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BUDGET_DATA} layout="vertical" barGap={8}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <YAxis dataKey="category" type="category" fontSize={10} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="planned" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Budget" barSize={12} />
                <Bar dataKey="actual" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Dépenses" barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Site Activity / Documentation */}
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-lg text-gb-text tracking-tight uppercase">Flux Documentaire</h3>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase">Live</span>
            </div>
          </div>
          <div className="space-y-4 flex-1">
            {RECENT_DOCS.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gb-border hover:bg-gb-surface-hover transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gb-app flex items-center justify-center border border-gb-border font-black text-[10px] text-gb-primary">
                    {doc.type}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gb-text">{doc.name}</h4>
                    <p className="text-[10px] font-medium text-gb-muted">{doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gb-app text-gb-muted border border-gb-border">
                    {doc.status}
                  </span>
                  <ChevronRight size={14} className="text-gb-muted group-hover:text-gb-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 border border-dashed border-gb-border rounded-xl text-[10px] font-black uppercase text-gb-muted hover:text-gb-primary hover:border-gb-primary transition-all">
            Voir tout le journal
          </button>
        </div>

      </div>
    </div>
  );
}
