import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CodigoVoto, Patrocinador, EstadisticasEvento } from '../types';
import { VotingEngine, FraudLog } from '../services/votingEngine';
import { 
  KeyRound, 
  PlusCircle, 
  QrCode, 
  BarChart3, 
  Download, 
  ShieldAlert, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Printer, 
  Code2, 
  Store, 
  Award, 
  Trash2,
  Lock,
  ExternalLink
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantes: Restaurante[];
  onRestaurantesUpdated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  restaurantes,
  onRestaurantesUpdated,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Pre-unlocked for seamless inspection with option to lock
  const [pinInput, setPinInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stats' | 'generator' | 'entities' | 'architecture'>('stats');

  // Generator form state
  const [selectedRestId, setSelectedRestId] = useState<string>(restaurantes[0]?.id || '');
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchPrefix, setBatchPrefix] = useState<string>('TOCUYO');
  const [waiterTag, setWaiterTag] = useState<string>('Mesa / Mesero Lote 1');
  const [newlyGenerated, setNewlyGenerated] = useState<CodigoVoto[]>([]);

  // Register Restaurant form state
  const [newRest, setNewRest] = useState({
    nombre: '',
    nombreHamburguesa: '',
    slogan: '',
    descripcion: '',
    ingredientesRaw: 'Carne Angus, Queso de Mano, Tocineta, Salsa Especial',
    precio: '$8.00',
    fotoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
    direccion: 'Av. Lisandro Alvarado, El Tocuyo',
    instagram: '@nuevoburger.tocuyo',
  });
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false);

  // Data
  const [stats, setStats] = useState<EstadisticasEvento>(VotingEngine.getStats());
  const [codigos, setCodigos] = useState<CodigoVoto[]>(VotingEngine.getCodigos());
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>(VotingEngine.getFraudLogs());

  const refreshAllData = () => {
    setStats(VotingEngine.getStats());
    setCodigos(VotingEngine.getCodigos());
    setFraudLogs(VotingEngine.getFraudLogs());
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === 'tocuyo2025' || pinInput === 'admin') {
      setIsAuthenticated(true);
    } else {
      alert('Clave incorrecta. Usa: tocuyo2025');
    }
  };

  const handleGenerateCodes = (e: React.FormEvent) => {
    e.preventDefault();
    const created = VotingEngine.generateBatchCodes({
      restauranteId: selectedRestId,
      cantidad: Number(batchCount),
      prefijoLote: batchPrefix.trim().toUpperCase(),
      identificadorMesa: waiterTag.trim(),
    });
    setNewlyGenerated(created);
    refreshAllData();
  };

  const handleExportCSV = () => {
    const rows = [
      ['ID_CODIGO', 'RESTAURANTE', 'ESTADO', 'CREADO_EN', 'MESA_MESERO'],
      ...codigos.map((c) => [c.codigo, c.restauranteNombre || c.restauranteId, c.usado ? 'USADO' : 'DISPONIBLE', c.creadoEn, c.meseroOMesa || 'N/A']),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `codigos_tocuyo_burgerfest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateRestaurante = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRest.nombre || !newRest.nombreHamburguesa) return;

    VotingEngine.addRestaurante({
      nombre: newRest.nombre,
      nombreHamburguesa: newRest.nombreHamburguesa,
      slogan: newRest.slogan,
      descripcion: newRest.descripcion,
      ingredientes: newRest.ingredientesRaw.split(',').map((s) => s.trim()),
      precio: newRest.precio,
      fotoUrl: newRest.fotoUrl,
      logoUrl: newRest.logoUrl,
      direccion: newRest.direccion,
      instagram: newRest.instagram,
      activo: true,
    });

    setRegisterSuccess(true);
    onRestaurantesUpdated();
    setTimeout(() => setRegisterSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl rounded-3xl bg-stone-900 border border-amber-500/40 shadow-2xl p-4 sm:p-7 text-stone-100 max-h-[92vh] flex flex-col"
      >
        
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black font-['Cabinet_Grotesk',sans-serif] text-stone-100 flex items-center gap-2">
                Panel Superadministrador
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ACCESO AUTORIZADO
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Gestión de códigos seguros, auditoría antifraude y control del festival.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshAllData}
              className="p-2 rounded-xl bg-stone-950 text-stone-400 hover:text-amber-400 border border-stone-800 transition-colors"
              title="Actualizar datos en vivo"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-950 text-stone-400 hover:text-stone-100 border border-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 py-3 border-b border-stone-800/80 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'stats'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Estadísticas & Fraude</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'generator'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Generador de Códigos</span>
          </button>

          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'entities'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Registro de Restaurantes</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === 'architecture'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Arquitectura Firestore & Reglas</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 text-xs sm:text-sm">
          
          {/* TAB 1: STATS & FRAUD AUDIT */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase">Votos Emitidos</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{stats.totalVotos}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Transacciones atómicas exitosas</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase">Códigos Generados</div>
                  <div className="text-2xl font-black text-stone-200 mt-1">{stats.totalCodigosGenerados}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Entregados a restaurantes</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase">Tasa de Canje</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {stats.totalCodigosGenerados > 0 
                      ? Math.round((stats.totalCodigosUsados / stats.totalCodigosGenerados) * 100) 
                      : 0}%
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{stats.totalCodigosUsados} canjeados</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950 border border-red-900/50 bg-red-950/10">
                  <div className="text-[11px] font-semibold text-red-400 uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Fraude Bloqueado
                  </div>
                  <div className="text-2xl font-black text-red-400 mt-1">{stats.intentosFraudeBloqueados}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Rechazos en transacción</div>
                </div>
              </div>

              {/* Performance Table */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <h4 className="font-bold text-stone-200 text-sm flex items-center justify-between">
                  <span>Rendimiento Actual por Restaurante</span>
                  <span className="text-xs text-amber-400">Puntaje Oficial Promedio</span>
                </h4>

                <div className="divide-y divide-stone-800/80">
                  {restaurantes.map((r, i) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono text-stone-500 text-xs w-4">#{i + 1}</span>
                        <div className="truncate">
                          <div className="font-bold text-stone-200 truncate">{r.nombreHamburguesa}</div>
                          <div className="text-[11px] text-stone-400 truncate">{r.nombre}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 text-right">
                        <div>
                          <span className="text-stone-300 font-bold">{r.votosCount}</span>
                          <span className="text-stone-500 text-[10px]"> votos</span>
                        </div>
                        <div className="font-black text-amber-400 font-mono text-sm w-12">
                          {r.promedioRating.toFixed(2)} ★
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Antifraud Audit Logs */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-red-400 text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Registro de Auditoría y Detección de Fraude</span>
                  </h4>
                  <span className="text-[11px] text-stone-500">Últimos incidentes prevenidos</span>
                </div>

                <div className="space-y-2">
                  {fraudLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-stone-900/60 border border-red-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-red-400">{log.codigoIntentado}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/50">
                            RECHAZADO
                          </span>
                        </div>
                        <p className="text-stone-300 text-[11px]">{log.motivo}</p>
                      </div>

                      <div className="text-right text-[10px] text-stone-500 font-mono shrink-0">
                        <div>IP: {log.ipSimulada}</div>
                        <div>{log.fecha}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CODE GENERATOR */}
          {activeTab === 'generator' && (
            <div className="space-y-6">
              
              {/* Generation Form */}
              <form onSubmit={handleGenerateCodes} className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-200 text-sm">
                    Generador de Lotes Criptográficamente Seguros
                  </h4>
                  <span className="text-xs text-amber-400 font-semibold">Formato: [PREFIJO]-[XXXX]-[XXX]</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Restaurante Asignado</label>
                    <select
                      value={selectedRestId}
                      onChange={(e) => setSelectedRestId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    >
                      {restaurantes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Cantidad de Códigos</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={batchCount}
                      onChange={(e) => setBatchCount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Etiqueta Lote / Mesonero</label>
                    <input
                      type="text"
                      value={waiterTag}
                      onChange={(e) => setWaiterTag(e.target.value)}
                      placeholder="Ej: Mesonero Pedro - Turno Noche"
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Generar {batchCount} Códigos Únicos</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar Todos a CSV ({codigos.length})</span>
                  </button>
                </div>
              </form>

              {/* Newly generated visual card preview */}
              {newlyGenerated.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                      <CheckCircle className="w-4 h-4" />
                      ¡Se generaron {newlyGenerated.length} códigos con éxito!
                    </span>
                    <span className="text-[10px] text-stone-400">Listos para imprimir o entregar</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-xs">
                    {newlyGenerated.map((c) => (
                      <div key={c.id} className="p-2 rounded-lg bg-stone-950 border border-stone-800 text-amber-300 font-bold text-center">
                        {c.codigo}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Codes Master Table */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-200 text-sm">
                    Inventario de Códigos en Base de Datos ({codigos.length})
                  </h4>
                  <span className="text-xs text-stone-400">
                    {codigos.filter((c) => !c.usado).length} disponibles • {codigos.filter((c) => c.usado).length} canjeados
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {codigos.slice(0, 25).map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-400">{c.codigo}</span>
                        <span className="text-stone-400 truncate max-w-[150px]">{c.restauranteNombre}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-stone-500 font-mono text-[10px]">{c.meseroOMesa}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.usado
                              ? 'bg-red-950/80 text-red-400 border border-red-800/40'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                          }`}
                        >
                          {c.usado ? 'CANJEADO' : 'DISPONIBLE'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: REGISTER ENTITIES */}
          {activeTab === 'entities' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateRestaurante} className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-200 text-sm flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-500" />
                    <span>Registrar Nuevo Restaurante Competidor</span>
                  </h4>
                  {registerSuccess && (
                    <span className="text-xs text-emerald-400 font-bold animate-pulse">
                      ¡Restaurante guardado exitosamente!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre del Restaurante</label>
                    <input
                      type="text"
                      required
                      value={newRest.nombre}
                      onChange={(e) => setNewRest({ ...newRest, nombre: e.target.value })}
                      placeholder="Ej: Asador Tocuyano BBQ"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre de la Hamburguesa</label>
                    <input
                      type="text"
                      required
                      value={newRest.nombreHamburguesa}
                      onChange={(e) => setNewRest({ ...newRest, nombreHamburguesa: e.target.value })}
                      placeholder="Ej: La Tocuyana Criolla"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Slogan o Frase Ganadora</label>
                    <input
                      type="text"
                      value={newRest.slogan}
                      onChange={(e) => setNewRest({ ...newRest, slogan: e.target.value })}
                      placeholder="Ej: Fusión de carnes larenses al leño"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Precio Competencia</label>
                    <input
                      type="text"
                      value={newRest.precio}
                      onChange={(e) => setNewRest({ ...newRest, precio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción Gourmet</label>
                    <textarea
                      rows={2}
                      value={newRest.descripcion}
                      onChange={(e) => setNewRest({ ...newRest, descripcion: e.target.value })}
                      placeholder="Explica la técnica, maduración y salsas exclusivas..."
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none resize-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Ingredientes (Separados por coma)</label>
                    <input
                      type="text"
                      value={newRest.ingredientesRaw}
                      onChange={(e) => setNewRest({ ...newRest, ingredientesRaw: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">URL de Foto de Hamburguesa (HQ)</label>
                    <input
                      type="url"
                      value={newRest.fotoUrl}
                      onChange={(e) => setNewRest({ ...newRest, fotoUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Dirección en El Tocuyo</label>
                    <input
                      type="text"
                      value={newRest.direccion}
                      onChange={(e) => setNewRest({ ...newRest, direccion: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar Restaurante en la Plataforma</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: ARCHITECTURE & FIRESTORE CODE SPEC */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Code2 className="w-4 h-4" />
                  <span>Modelo NoSQL y Transacción Atómica Firestore</span>
                </div>
                <p className="text-stone-400">
                  A continuación se visualizan las colecciones creadas en Firestore y la lógica exacta de la transacción atómica que se ejecuta en el backend para prevenir fraudes:
                </p>
              </div>

              {/* Collections Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                  <span className="text-amber-400 font-bold">/restaurantes/{'{restauranteId}'}</span>
                  <p className="text-stone-400 text-[11px] font-sans">
                    Guarda perfil, votosCount, promedioRating (actualizados atómicamente).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                  <span className="text-emerald-400 font-bold">/codigos/{'{codigoHash}'}</span>
                  <p className="text-stone-400 text-[11px] font-sans">
                    Guarda código único, restauranteId, usado: boolean, usadoEn: timestamp.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                  <span className="text-blue-400 font-bold">/votos/{'{votoId}'}</span>
                  <p className="text-stone-400 text-[11px] font-sans">
                    Guarda voto individual, rating, criterios, comentario, hash antifraude.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                  <span className="text-purple-400 font-bold">/patrocinadores/{'{patrocinadorId}'}</span>
                  <p className="text-stone-400 text-[11px] font-sans">
                    Marcas auspiciantes, categorías de patrocinio y enlaces.
                  </p>
                </div>
              </div>

              {/* Code Preview box */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] text-amber-300 overflow-x-auto space-y-1">
                <div className="text-stone-500">// Firestore RunTransaction Signature:</div>
                <div>await runTransaction(db, async (transaction) =&gt; {'{'}</div>
                <div className="pl-4 text-stone-300">const codeRef = doc(db, 'codigos', codeId);</div>
                <div className="pl-4 text-stone-300">const codeSnap = await transaction.get(codeRef);</div>
                <div className="pl-4 text-red-300">if (!codeSnap.exists() || codeSnap.data().usado) throw Error('Código Inválido');</div>
                <div className="pl-4 text-emerald-300">transaction.update(codeRef, {'{'} usado: true, usadoEn: serverTimestamp() {'}'});</div>
                <div className="pl-4 text-emerald-300">transaction.set(votoRef, {'{'} ...votoPayload {'}'});</div>
                <div className="pl-4 text-emerald-300">transaction.update(restRef, {'{'} votosCount: inc, promedioRating: newAvg {'}'});</div>
                <div>{'}'});</div>
              </div>
            </div>
          )}

        </div>

      </motion.div>
    </div>
  );
};
