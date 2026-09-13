import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CodigoVoto, EstadisticasEvento } from '../types';

import { 
  KeyRound, 
  PlusCircle, 
  QrCode, 
  BarChart3, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw, 
  Code2, 
  Store, 
  Lock, 
  LogOut, 
  ArrowLeft, 
  Trophy, 
  Check, 
  AlertCircle,
  FileSpreadsheet,
  Award,
  UploadCloud
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  addRestauranteFirebase, 
  getStatsFirebase, 
  getCodigosFirebase, 
  getFraudLogsFirebase, 
  generateBatchCodesFirebase,
  FraudLogType,
  convertImageToBase64,
  addPatrocinadorFirebase
} from '../services/firebaseService';

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
  const [activeTab, setActiveTab] = useState<'stats' | 'generator' | 'entities' | 'sponsors' | 'gala' | 'architecture'>('stats');

  // Generator form state
  const [selectedRestId, setSelectedRestId] = useState<string>(restaurantes[0]?.id || '');
  const [batchCount, setBatchCount] = useState<number>(500);
  const [batchPrefix, setBatchPrefix] = useState<string>('TOCUYO');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState<boolean>(false);
  const [printRestId, setPrintRestId] = useState<string | null>(null);

  // Register Restaurant form state
  const [newRest, setNewRest] = useState({
    nombre: '',
    nombreHamburguesa: '',
    slogan: '',
    descripcion: '',
    ingredientesRaw: '',
    precio: '',
    direccion: '',
    instagram: '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingRest, setIsUploadingRest] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false);

  // Register Sponsor form state
  const [newSponsor, setNewSponsor] = useState({
    nombre: '',
    tipo: 'Aliado Gourmet' as 'Principal' | 'Aliado Gourmet' | 'Patrocinador Oficial',
    descripcion: '',
    url: '',
  });
  const [sponsorLogoFile, setSponsorLogoFile] = useState<File | null>(null);
  const [isUploadingSponsor, setIsUploadingSponsor] = useState(false);
  const [sponsorSuccess, setSponsorSuccess] = useState<boolean>(false);

  // Data
  const [stats, setStats] = useState<EstadisticasEvento>({
    totalVotos: 0, totalCodigosGenerados: 0, totalCodigosUsados: 0, promedioGlobal: 0, intentosFraudeBloqueados: 0
  });
  const [codigos, setCodigos] = useState<CodigoVoto[]>([]);
  const [fraudLogs, setFraudLogs] = useState<FraudLogType[]>([]);

  const refreshAllData = async () => {
    const s = await getStatsFirebase();
    const c = await getCodigosFirebase();
    const f = await getFraudLogsFirebase();
    setStats(s);
    setCodigos(c);
    setFraudLogs(f);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const user = userInput.trim().toLowerCase();
    const pass = passwordInput.trim();

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

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestId || isGeneratingCodes) return;

    setIsGeneratingCodes(true);
    const rest = restaurantes.find(r => r.id === selectedRestId);
    
    await generateBatchCodesFirebase({
      restauranteId: selectedRestId,
      restauranteNombre: rest ? rest.nombre : "Desconocido",
      cantidad: Number(batchCount),
      prefijoLote: batchPrefix.trim().toUpperCase()
    });
    
    // Refresh to get new codes
    const c = await getCodigosFirebase();
    setCodigos(c);
    const s = await getStatsFirebase();
    setStats(s);

    // Auto select next available
    const restSin = restaurantes.filter(r => !c.some(code => code.restauranteId === r.id));
    if (restSin.length > 0) setSelectedRestId(restSin[0].id);
    else setSelectedRestId('');

    setIsGeneratingCodes(false);
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

  const handleCreateRestaurante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRest.nombre || !newRest.nombreHamburguesa || !fotoFile || !logoFile) {
      alert("Por favor completa todos los campos y sube las 2 imágenes (Logo y Hamburguesa).");
      return;
    }

    setIsUploadingRest(true);
    
    try {
      // Compress and convert to base64
      const fotoUrl = await convertImageToBase64(fotoFile);
      const logoUrl = await convertImageToBase64(logoFile, 400); // 400px is enough for a logo

      const nextNumber = restaurantes.length + 1;
      
      const success = await addRestauranteFirebase({
        nombre: newRest.nombre,
        nombreHamburguesa: newRest.nombreHamburguesa,
        slogan: newRest.slogan,
        descripcion: newRest.descripcion,
        ingredientes: newRest.ingredientesRaw.split(',').map((s) => s.trim()),
        precio: newRest.precio,
        fotoUrl,
        logoUrl,
        direccion: newRest.direccion,
        instagram: newRest.instagram.startsWith('@') ? newRest.instagram : `@${newRest.instagram}`,
        activo: true,
        votosCount: 0,
        promedioRating: 0,
        rankingAnonimoTag: `Participante #${nextNumber}`
      });

      if (success) {
        setRegisterSuccess(true);
        onRestaurantesUpdated();
        setTimeout(() => setRegisterSuccess(false), 3000);
        
        // Limpiar
        setNewRest({
          nombre: '', nombreHamburguesa: '', slogan: '', descripcion: '', 
          ingredientesRaw: '', precio: '', direccion: '', instagram: '',
        });
        setFotoFile(null);
        setLogoFile(null);
      }
    } catch (error) {
      console.error(error);
      alert("Error al subir el restaurante o las imágenes. Revisa la consola.");
    } finally {
      setIsUploadingRest(false);
    }
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsor.nombre || !sponsorLogoFile) {
      alert("Por favor completa el nombre y sube el logo del patrocinador.");
      return;
    }

    setIsUploadingSponsor(true);
    
    try {
      const logoUrl = await convertImageToBase64(sponsorLogoFile, 400);

      const success = await addPatrocinadorFirebase({
        nombre: newSponsor.nombre,
        tipo: newSponsor.tipo,
        descripcion: newSponsor.descripcion,
        url: newSponsor.url,
        logoUrl
      });

      if (success) {
        setSponsorSuccess(true);
        onRestaurantesUpdated(); // Reusamos esto para que App.tsx haga el refreshData completo
        setTimeout(() => setSponsorSuccess(false), 3000);
        
        setNewSponsor({ nombre: '', tipo: 'Aliado Gourmet', descripcion: '', url: '' });
        setSponsorLogoFile(null);
      }
    } catch (error) {
      console.error(error);
      alert("Error al subir el patrocinador.");
    } finally {
      setIsUploadingSponsor(false);
    }
  };

  const sortedRestaurantes = [...restaurantes].sort((a, b) => {
    if (b.promedioRating === a.promedioRating) {
      return b.votosCount - a.votosCount;
    }
    return b.promedioRating - a.promedioRating;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
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
        </motion.div>
      </div>
    );
  }

  if (printRestId) {
    const printRest = restaurantes.find(r => r.id === printRestId);
    const printCodes = codigos.filter(c => c.restauranteId === printRestId);
    
    return (
      <div className="bg-white text-stone-950 min-h-screen relative pb-20">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page { margin: 0.5cm; }
            body { background: white; }
          }
        `}</style>
        
        {/* Floating Controls (Hidden in Print) */}
        <div className="no-print fixed bottom-6 right-6 flex gap-4 bg-stone-900 p-4 rounded-2xl shadow-2xl border border-stone-700 z-50">
          <button onClick={() => setPrintRestId(null)} className="px-6 py-2.5 rounded-xl bg-stone-800 text-stone-200 font-bold text-sm hover:bg-stone-700">
            Volver al Panel
          </button>
          <button onClick={() => window.print()} className="px-6 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-black text-sm hover:bg-amber-400 flex items-center gap-2">
            <QrCode className="w-5 h-5" /> <span>Imprimir PDF / Tickets</span>
          </button>
        </div>

        <div className="p-4 sm:p-8">
          <div className="text-center mb-8 no-print">
            <h1 className="text-3xl font-black">Tickets para {printRest?.nombre}</h1>
            <p className="text-stone-500">Configura tu impresora para guardar como PDF o imprimir directamente.</p>
          </div>

          {/* Tickets Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {printCodes.map((c, i) => (
              <div key={c.id} className="ticket border-2 border-stone-800 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center bg-stone-50">
                <div className="font-bold text-xs uppercase tracking-wider text-stone-500 mb-1">Burger Fest El Tocuyo</div>
                <div className="font-black text-lg leading-tight mb-3">{printRest?.nombre}</div>
                <div className="bg-white border-2 border-black px-4 py-2 w-full rounded-lg shadow-sm">
                  <div className="font-mono font-black text-xl tracking-widest">{c.codigo}</div>
                </div>
                <div className="text-[10px] text-stone-500 font-semibold mt-3 max-w-[180px]">
                  Código único e intransferible. Escanea el código QR del restaurante para votar.
                </div>
                <div className="text-[9px] text-stone-400 mt-2 font-mono">#{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Control de lotes, auditoría antifraude en tiempo real y gestión del festival.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={refreshAllData} className="p-2.5 rounded-xl bg-stone-950 text-stone-300 hover:text-amber-400 border border-stone-800 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-950 text-stone-400 hover:text-red-400 border border-stone-800 transition-colors text-xs font-semibold">
              <LogOut className="w-4 h-4" /> <span>Cerrar Sesión</span>
            </button>
            <button onClick={onExitToPublic} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400 transition-all shadow">
              <ArrowLeft className="w-4 h-4" /> <span>Sitio Público</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-stone-900/80 border border-stone-800 text-xs font-bold">
          <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'stats' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:bg-stone-950'}`}>
            <BarChart3 className="w-4 h-4" /> <span>Métricas & Fraude</span>
          </button>
          <button onClick={() => setActiveTab('generator')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'generator' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:bg-stone-950'}`}>
            <QrCode className="w-4 h-4" /> <span>Generador Códigos</span>
          </button>
          <button onClick={() => setActiveTab('gala')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'gala' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:bg-stone-950'}`}>
            <Trophy className="w-4 h-4" /> <span>Gala Oficial</span>
          </button>
          <button onClick={() => setActiveTab('entities')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'entities' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:bg-stone-950'}`}>
            <Store className="w-4 h-4" /> <span>Restaurantes</span>
          </button>
          <button onClick={() => setActiveTab('sponsors')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'sponsors' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:bg-stone-950'}`}>
            <Award className="w-4 h-4" /> <span>Patrocinadores</span>
          </button>
        </div>

        {/* TAB 1: METRICS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Votos Válidos</div>
                <div className="text-3xl font-black text-amber-400 mt-1">{stats.totalVotos}</div>
              </div>
              <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Códigos Generados</div>
                <div className="text-3xl font-black text-stone-200 mt-1">{stats.totalCodigosGenerados}</div>
              </div>
              <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Tasa de Canje</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {stats.totalCodigosGenerados > 0 ? Math.round((stats.totalCodigosUsados / stats.totalCodigosGenerados) * 100) : 0}%
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-stone-900/90 border border-red-900/50 bg-red-950/10">
                <div className="text-xs font-semibold text-red-400 uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Fraude Prevenido
                </div>
                <div className="text-3xl font-black text-red-400 mt-1">{stats.intentosFraudeBloqueados}</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
                <h3 className="font-bold text-stone-200 text-sm sm:text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500" /> <span>Votos por Restaurante</span>
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedRestaurantes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                      <XAxis dataKey="nombre" tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#fbbf24' }}
                        cursor={{ fill: '#292524' }}
                      />
                      <Bar dataKey="votosCount" name="Votos" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
                <h3 className="font-bold text-stone-200 text-sm sm:text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> <span>Calificación Promedio</span>
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedRestaurantes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                      <XAxis dataKey="nombre" tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 5]} tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#34d399' }}
                        cursor={{ fill: '#292524' }}
                      />
                      <Bar dataKey="promedioRating" name="Rating ★" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
              <h3 className="font-bold text-red-400 text-sm sm:text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> <span>Auditoría de Intentos de Fraude</span>
              </h3>
              <div className="space-y-2">
                {fraudLogs.length === 0 && <div className="text-stone-500 text-sm">No hay registros de fraude recientes.</div>}
                {fraudLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl bg-stone-950 border border-red-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-400">{log.codigoIntentado}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300">BLOQUEADO</span>
                      </div>
                      <p className="text-stone-300 text-xs">{log.motivo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GENERATOR */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            
            {/* Form to generate new codes */}
            <form onSubmit={handleGenerateCodes} className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-stone-200">Generar Nuevo Lote de Códigos</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Seleccionar Restaurante (Sin códigos generados)</label>
                  <select
                    value={selectedRestId}
                    onChange={(e) => setSelectedRestId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                    disabled={restaurantes.filter(r => !codigos.some(c => c.restauranteId === r.id)).length === 0}
                  >
                    {restaurantes.filter(r => !codigos.some(c => c.restauranteId === r.id)).length === 0 && (
                      <option value="">Todos los restaurantes ya tienen códigos</option>
                    )}
                    {restaurantes
                      .filter(r => !codigos.some(c => c.restauranteId === r.id))
                      .map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Cantidad de Códigos (Para todo el evento)</label>
                  <input type="number" min="1" max="2000" value={batchCount} onChange={(e) => setBatchCount(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none font-mono" />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  disabled={isGeneratingCodes || !selectedRestId}
                  className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingCodes ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> <span>Generando Códigos...</span></>
                  ) : (
                    <><PlusCircle className="w-4 h-4" /> <span>Generar Lote Único</span></>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-stone-500 font-semibold mt-2">
                ⚠️ Solo se puede generar códigos UNA VEZ por restaurante. Si requieres más, contacta soporte técnico.
              </p>
            </form>

            {/* List of Restaurants and their codes */}
            <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="font-bold text-stone-200 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-amber-500" /> <span>Códigos Generados por Restaurante</span>
                </h3>
              </div>

              <div className="space-y-3">
                {restaurantes.filter(r => codigos.some(c => c.restauranteId === r.id)).length === 0 && (
                  <div className="text-stone-500 text-sm">No se han generado códigos para ningún restaurante aún.</div>
                )}
                
                {restaurantes
                  .filter(r => codigos.some(c => c.restauranteId === r.id))
                  .map((r) => {
                    const rCodes = codigos.filter(c => c.restauranteId === r.id);
                    const usados = rCodes.filter(c => c.usado).length;
                    const disponibles = rCodes.length - usados;

                    return (
                      <div key={r.id} className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={r.logoUrl} alt={r.nombre} className="w-10 h-10 rounded-lg object-cover border border-stone-700" />
                          <div>
                            <div className="font-bold text-stone-100">{r.nombre}</div>
                            <div className="text-xs text-stone-400">Total generados: <span className="font-mono text-stone-200">{rCodes.length}</span></div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                          <div className="flex gap-6 text-xs font-semibold w-full sm:w-auto justify-center sm:justify-start">
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 uppercase text-[10px]">Usados</span>
                              <span className="text-emerald-400 font-mono text-sm">{usados}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 uppercase text-[10px]">Disponibles</span>
                              <span className="text-amber-400 font-mono text-sm">{disponibles}</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => setPrintRestId(r.id)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-stone-800 text-stone-200 text-xs font-bold hover:bg-stone-700 transition-colors flex justify-center items-center gap-2 border border-stone-700"
                          >
                            <QrCode className="w-4 h-4 text-amber-500" />
                            <span>Ver Tickets PDF</span>
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: GALA */}
        {activeTab === 'gala' && (
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-amber-500/40 space-y-5">
            <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
              <Trophy className="w-5 h-5" /> <span>Ranking Oficial (Desanonimizado)</span>
            </h3>
            <div className="space-y-3">
              {sortedRestaurantes.map((r, i) => (
                <div key={r.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${i === 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-stone-950 border-stone-800'}`}>
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono font-black text-base text-amber-400 w-7 text-center">#{i + 1}</span>
                    <img src={r.logoUrl} alt={r.nombre} className="w-10 h-10 rounded-xl object-cover border border-amber-500/40" />
                    <div>
                      <div className="font-bold text-stone-100">{r.nombreHamburguesa}</div>
                      <div className="text-xs text-stone-400">{r.nombre}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-amber-400 font-mono">{r.votosCount === 0 ? "0.00" : r.promedioRating.toFixed(2)} ★</div>
                    <div className="text-xs text-stone-500">{r.votosCount} votos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ENTITIES (RESTAURANTS) */}
        {activeTab === 'entities' && (
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
            <div className="flex justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-stone-200 flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-500" /> <span>Registrar Restaurante</span>
              </h3>
              {registerSuccess && <span className="text-xs text-emerald-400 font-bold">¡Restaurante guardado!</span>}
            </div>

            <form onSubmit={handleCreateRestaurante} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Restaurante</label>
                  <input type="text" required value={newRest.nombre} onChange={(e) => setNewRest({ ...newRest, nombre: e.target.value })} placeholder="Ej: Asador Tocuyano BBQ" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre Hamburguesa</label>
                  <input type="text" required value={newRest.nombreHamburguesa} onChange={(e) => setNewRest({ ...newRest, nombreHamburguesa: e.target.value })} placeholder="Ej: La Morandina Criolla" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Slogan</label>
                  <input type="text" value={newRest.slogan} onChange={(e) => setNewRest({ ...newRest, slogan: e.target.value })} placeholder="Ej: Carne jugosa ahumada" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Precio</label>
                  <input type="text" value={newRest.precio} onChange={(e) => setNewRest({ ...newRest, precio: e.target.value })} placeholder="Ej: $8.00" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Usuario de Instagram</label>
                  <input type="text" required value={newRest.instagram} onChange={(e) => setNewRest({ ...newRest, instagram: e.target.value })} placeholder="Ej: @mitocuyoburger" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Dirección</label>
                  <input type="text" value={newRest.direccion} onChange={(e) => setNewRest({ ...newRest, direccion: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Ingredientes (Separados por coma)</label>
                  <input type="text" value={newRest.ingredientesRaw} onChange={(e) => setNewRest({ ...newRest, ingredientesRaw: e.target.value })} placeholder="Carne, Queso, Tocineta" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción</label>
                  <textarea rows={2} value={newRest.descripcion} onChange={(e) => setNewRest({ ...newRest, descripcion: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none resize-none" />
                </div>

                {/* File Uploads for Restaurant */}
                <div className="p-4 rounded-xl border border-stone-700 bg-stone-950 flex flex-col gap-2">
                  <label className="block text-xs font-semibold text-stone-400">
                    <UploadCloud className="w-4 h-4 inline mr-1 text-amber-500" /> Foto de la Hamburguesa (Buena Calidad)
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    required
                    onChange={(e) => setFotoFile(e.target.files ? e.target.files[0] : null)}
                    className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30"
                  />
                </div>
                <div className="p-4 rounded-xl border border-stone-700 bg-stone-950 flex flex-col gap-2">
                  <label className="block text-xs font-semibold text-stone-400">
                    <UploadCloud className="w-4 h-4 inline mr-1 text-amber-500" /> Logo del Restaurante
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    required
                    onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                    className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30"
                  />
                </div>
              </div>

              <button type="submit" disabled={isUploadingRest} className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-2 disabled:opacity-50">
                {isUploadingRest ? 'Subiendo imágenes y guardando...' : 'Inscribir Restaurante y Subir Fotos'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: SPONSORS */}
        {activeTab === 'sponsors' && (
          <div className="p-6 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-4">
            <div className="flex justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-stone-200 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> <span>Registrar Patrocinador</span>
              </h3>
              {sponsorSuccess && <span className="text-xs text-emerald-400 font-bold">¡Patrocinador guardado!</span>}
            </div>

            <form onSubmit={handleCreateSponsor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre de la Empresa</label>
                  <input type="text" required value={newSponsor.nombre} onChange={(e) => setNewSponsor({ ...newSponsor, nombre: e.target.value })} placeholder="Ej: Cerveza Zulia" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Tipo de Patrocinio</label>
                  <select 
                    value={newSponsor.tipo} 
                    onChange={(e) => setNewSponsor({ ...newSponsor, tipo: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none"
                  >
                    <option value="Principal">Principal</option>
                    <option value="Aliado Gourmet">Aliado Gourmet</option>
                    <option value="Patrocinador Oficial">Patrocinador Oficial</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción Breve</label>
                  <input type="text" value={newSponsor.descripcion} onChange={(e) => setNewSponsor({ ...newSponsor, descripcion: e.target.value })} placeholder="Apoyando la gastronomía tocuyana" className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs outline-none" />
                </div>
                
                <div className="sm:col-span-2 p-4 rounded-xl border border-stone-700 bg-stone-950 flex flex-col gap-2">
                  <label className="block text-xs font-semibold text-stone-400">
                    <UploadCloud className="w-4 h-4 inline mr-1 text-amber-500" /> Logo del Patrocinador
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    required
                    onChange={(e) => setSponsorLogoFile(e.target.files ? e.target.files[0] : null)}
                    className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30"
                  />
                </div>
              </div>

              <button type="submit" disabled={isUploadingSponsor} className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-2 disabled:opacity-50">
                {isUploadingSponsor ? 'Subiendo logo y guardando...' : 'Registrar Patrocinador'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
