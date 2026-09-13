import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CodigoVoto, EstadisticasEvento } from '../types';
import { VotingEngine, FraudLog } from '../services/votingEngine';
import { 
  KeyRound, 
  PlusCircle, 
  QrCode, 
  BarChart3, 
  Download, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw, 
  Code2, 
  Store, 
  Lock, 
  LogOut, 
  ArrowLeft, 
  Eye, 
  Trophy, 
  Check, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface AdminPortalViewProps {
  restaurantes: Restaurante[];
  onRestaurantesUpdated: () => void;
  onExitToPublic: () => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  restaurantes,
  onRestaurantesUpdated,
  onExitToPublic,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('admin');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'stats' | 'generator' | 'entities' | 'gala' | 'architecture'>('stats');

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const user = userInput.trim().toLowerCase();
    const pass = passwordInput.trim();

    // Check credentials: admin / tocuyo2025 or admin / admin
    if ((user === 'admin' || user === 'organizador') && (pass === 'tocuyo2025' || pass === 'admin')) {
      setIsAuthenticated(true);
      refreshAllData();
    } else {
      setAuthError('Credenciales no autorizadas. Verifica tu usuario y clave de organizador.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
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

  // Sorted list for official gala reveal
  const sortedRestaurantes = [...restaurantes].sort((a, b) => {
    if (b.promedioRating === a.promedioRating) {
      return b.votosCount - a.votosCount;
    }
    return b.promedioRating - a.promedioRating;
  });

  /* =========================================================
     VIEW A: LOGIN SCREEN IF NOT AUTHENTICATED
     ========================================================= */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
        
        {/* Back link */}
        <div className="w-full max-w-md mb-6">
          <button
            onClick={onExitToPublic}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la vista pública de comensales</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl bg-stone-900 border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-2">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif]">
              Portal Administrativo
            </h1>
            <p className="text-xs text-stone-400">
              Acceso restringido para el comité organizador del Burger Fest El Tocuyo 2025.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Usuario de Administrador
              </label>
              <input
                type="text"
                required
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:border-amber-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                Contraseña / Clave Maestra
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:border-amber-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Ingresar al Panel de Control</span>
            </button>
          </form>

          {/* Quick Credential Helper for Testing */}
          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-[11px] text-stone-400 space-y-1">
            <span className="font-bold text-stone-300 block">Credenciales de acceso para evaluación:</span>
            <div className="flex justify-between font-mono text-[10px] text-amber-400/90">
              <span>Usuario: <strong>admin</strong></span>
              <span>Clave: <strong>tocuyo2025</strong></span>
            </div>
          </div>
        </motion.div>

      </div>
    );
  }

  /* =========================================================
     VIEW B: FULL SUPERADMIN DASHBOARD IF AUTHENTICATED
     ========================================================= */
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-stone-900 border border-amber-500/40 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif]">
                  Panel Superadministrador
                </h1>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  AUTORIZADO
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Control de lotes, auditoría antifraude en tiempo real y gestión del festival.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={refreshAllData}
              className="p-2.5 rounded-xl bg-stone-950 text-stone-300 hover:text-amber-400 border border-stone-800 transition-colors"
              title="Actualizar datos en vivo"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-950 text-stone-400 hover:text-red-400 border border-stone-800 transition-colors text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
            <button
              onClick={onExitToPublic}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400 transition-all shadow"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sitio Público</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-stone-900/80 border border-stone-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'stats'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas & Fraude</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'generator'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Generador de Códigos</span>
          </button>

          <button
            onClick={() => setActiveTab('gala')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'gala'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Revelación de Gala Oficial</span>
          </button>

          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'entities'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Registro de Restaurantes</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'architecture'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-950'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Firestore Spec</span>
          </button>
        </div>

        {/* TAB 1: METRICS & FRAUD AUDIT */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Votos Válidos</div>
                <div className="text-3xl font-black text-amber-400 mt-1">{stats.totalVotos}</div>
                <div className="text-[10px] text-stone-500 mt-1">Transacciones atómicas completadas</div>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Códigos Impresos</div>
                <div className="text-3xl font-black text-stone-200 mt-1">{stats.totalCodigosGenerados}</div>
                <div className="text-[10px] text-stone-500 mt-1">En mesas y tickets</div>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Tasa de Canje</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {stats.totalCodigosGenerados > 0 
                    ? Math.round((stats.totalCodigosUsados / stats.totalCodigosGenerados) * 100) 
                    : 0}%
                </div>
                <div className="text-[10px] text-stone-500 mt-1">{stats.totalCodigosUsados} canjeados</div>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900/90 border border-red-900/50 bg-red-950/10">
                <div className="text-xs font-semibold text-red-400 uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Fraude Prevenido
                </div>
                <div className="text-3xl font-black text-red-400 mt-1">{stats.intentosFraudeBloqueados}</div>
                <div className="text-[10px] text-stone-500 mt-1">Rechazos en base de datos</div>
              </div>
            </div>

            {/* Antifraud Logs */}
            <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-red-400 text-sm sm:text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span>Auditoría de Intentos de Fraude en Vivo</span>
                </h3>
                <span className="text-xs text-stone-500 font-mono">Reglas de seguridad activas</span>
              </div>

              <div className="space-y-2">
                {fraudLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-stone-950 border border-red-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-400">{log.codigoIntentado}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/50">
                          BLOQUEADO
                        </span>
                      </div>
                      <p className="text-stone-300 text-xs">{log.motivo}</p>
                    </div>

                    <div className="text-right text-[11px] text-stone-500 font-mono shrink-0">
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
            <form onSubmit={handleGenerateCodes} className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-200 text-sm sm:text-base">
                  Generador de Lotes Alfanuméricos para Mesas
                </h3>
                <span className="text-xs text-amber-400 font-mono font-bold">TOCUYO-[XXXX]-[XXX]</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Restaurante Asignado</label>
                  <select
                    value={selectedRestId}
                    onChange={(e) => setSelectedRestId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  >
                    {restaurantes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} ({r.nombreHamburguesa})
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Identificador de Turno / Mesero</label>
                  <input
                    type="text"
                    value={waiterTag}
                    onChange={(e) => setWaiterTag(e.target.value)}
                    placeholder="Ej: Mesonero Pedro - Turno Noche"
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Generar {batchCount} Códigos Únicos</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Descargar Todo el Inventario en CSV ({codigos.length})</span>
                </button>
              </div>
            </form>

            {/* Newly generated preview */}
            {newlyGenerated.length > 0 && (
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-2 text-xs sm:text-sm">
                    <CheckCircle className="w-4 h-4" />
                    ¡Se generaron {newlyGenerated.length} códigos con éxito!
                  </span>
                  <span className="text-[11px] text-stone-400">Listos para imprimir o entregar en comandas</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-xs">
                  {newlyGenerated.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-amber-300 font-bold text-center">
                      {c.codigo}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Codes Master Table */}
            <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-200 text-sm sm:text-base">
                  Inventario de Códigos Activos ({codigos.length})
                </h3>
                <span className="text-xs text-stone-400">
                  {codigos.filter((c) => !c.usado).length} disponibles • {codigos.filter((c) => c.usado).length} canjeados
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {codigos.slice(0, 30).map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400">{c.codigo}</span>
                      <span className="text-stone-300 font-semibold">{c.restauranteNombre}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-stone-500 font-mono text-[11px]">{c.meseroOMesa}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
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

        {/* TAB 3: OFFICIAL GALA REVEAL (ADMIN ONLY) */}
        {activeTab === 'gala' && (
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-amber-500/40 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Ranking Oficial Desanonimizado (Exclusivo Administrador)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  En la vista de clientes este ranking está 100% enmascarado. Aquí puedes ver los nombres reales de los ganadores para la premiación.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sortedRestaurantes.map((r, i) => (
                <div
                  key={r.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    i === 0
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-stone-950 border-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono font-black text-base text-amber-400 w-7 text-center">
                      #{i + 1}
                    </span>
                    <img
                      src={r.logoUrl}
                      alt={r.nombre}
                      className="w-10 h-10 rounded-xl object-cover border border-amber-500/40"
                    />
                    <div>
                      <div className="font-bold text-stone-100 text-sm sm:text-base">
                        {r.nombreHamburguesa}
                      </div>
                      <div className="text-xs text-stone-400">
                        {r.nombre} • {r.rankingAnonimoTag}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-amber-400 font-mono">
                      {r.promedioRating.toFixed(2)} ★
                    </div>
                    <div className="text-xs text-stone-500">
                      {r.votosCount} votos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: REGISTER NEW RESTAURANT */}
        {activeTab === 'entities' && (
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-bold text-stone-200 text-sm sm:text-base flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-500" />
                <span>Registrar Nuevo Restaurante Participante</span>
              </h3>
              {registerSuccess && (
                <span className="text-xs text-emerald-400 font-bold animate-pulse">
                  ¡Restaurante guardado exitosamente!
                </span>
              )}
            </div>

            <form onSubmit={handleCreateRestaurante} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre del Restaurante</label>
                  <input
                    type="text"
                    required
                    value={newRest.nombre}
                    onChange={(e) => setNewRest({ ...newRest, nombre: e.target.value })}
                    placeholder="Ej: Asador Tocuyano BBQ"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre de la Hamburguesa</label>
                  <input
                    type="text"
                    required
                    value={newRest.nombreHamburguesa}
                    onChange={(e) => setNewRest({ ...newRest, nombreHamburguesa: e.target.value })}
                    placeholder="Ej: La Morandina Criolla"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Slogan</label>
                  <input
                    type="text"
                    value={newRest.slogan}
                    onChange={(e) => setNewRest({ ...newRest, slogan: e.target.value })}
                    placeholder="Ej: Carne jugosa ahumada a la leña"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Precio Competencia</label>
                  <input
                    type="text"
                    value={newRest.precio}
                    onChange={(e) => setNewRest({ ...newRest, precio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Ingredientes (Separados por coma)</label>
                  <input
                    type="text"
                    value={newRest.ingredientesRaw}
                    onChange={(e) => setNewRest({ ...newRest, ingredientesRaw: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción Gourmet</label>
                  <textarea
                    rows={2}
                    value={newRest.descripcion}
                    onChange={(e) => setNewRest({ ...newRest, descripcion: e.target.value })}
                    placeholder="Describe la técnica de preparación y la propuesta gastronómica..."
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">URL de Foto de Hamburguesa (HQ)</label>
                  <input
                    type="url"
                    value={newRest.fotoUrl}
                    onChange={(e) => setNewRest({ ...newRest, fotoUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Dirección en El Tocuyo</label>
                  <input
                    type="text"
                    value={newRest.direccion}
                    onChange={(e) => setNewRest({ ...newRest, direccion: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Inscribir Restaurante Oficialmente</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: ARCHITECTURE SPEC */}
        {activeTab === 'architecture' && (
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
              <Code2 className="w-5 h-5" />
              <span>Especificación de Seguridad y Transacción Firestore</span>
            </div>
            
            <p className="text-stone-300 text-xs leading-relaxed">
              Cada voto ejecuta una transacción atómica verificando que el código no haya sido canjeado. Las reglas de seguridad de Firestore bloquean cualquier escritura que no provenga de un código válido.
            </p>

            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] text-amber-300 overflow-x-auto space-y-1">
              <div className="text-stone-500">// Atomic Transaction Signature:</div>
              <div>await runTransaction(db, async (transaction) =&gt; {'{'}</div>
              <div className="pl-4 text-stone-300">const codeRef = doc(db, 'codigos', codeId);</div>
              <div className="pl-4 text-stone-300">const codeSnap = await transaction.get(codeRef);</div>
              <div className="pl-4 text-red-300">if (!codeSnap.exists() || codeSnap.data().usado) throw Error('CÓDIGO_INVÁLIDO');</div>
              <div className="pl-4 text-emerald-300">transaction.update(codeRef, {'{'} usado: true, usadoEn: serverTimestamp() {'}'});</div>
              <div className="pl-4 text-emerald-300">transaction.set(votoRef, {'{'} ...votoPayload {'}'});</div>
              <div className="pl-4 text-emerald-300">transaction.update(restRef, {'{'} votosCount: inc(1), promedioRating: newAvg {'}'});</div>
              <div>{'}'});</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
