import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CodigoVoto, EstadisticasEvento } from '../types';

import { QRCodeSVG } from 'qrcode.react';

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
  UploadCloud,
  Copy,
  Printer,
  ExternalLink,
  X,
  Film,
  Crown,
  Star
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
  addPatrocinadorFirebase,
  setPatrocinadorPrincipalFirebase
} from '../services/firebaseService';
import logoBlanco from '../img/logo blanco.svg';
import logoRed from '../img/logo.svg';

interface AdminPortalViewProps {
  restaurantes: Restaurante[];
  patrocinadores?: Patrocinador[];
  onRestaurantesUpdated: () => void;
  onExitToPublic: () => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  restaurantes,
  patrocinadores = [],
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
  const [batchPrefix, setBatchPrefix] = useState<string>('FOODFEST');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState<boolean>(false);
  const [printRestId, setPrintRestId] = useState<string | null>(null);

  // QR Mesa Inspector state
  const [selectedQrRest, setSelectedQrRest] = useState<Restaurante | null>(null);
  const [copiedTableUrl, setCopiedTableUrl] = useState(false);

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
    videoUrl: '',
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
    esPrincipal: false,
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
        videoUrl: newRest.videoUrl.trim() || undefined,
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
          videoUrl: ''
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
        tipo: newSponsor.esPrincipal ? 'Principal' : newSponsor.tipo,
        descripcion: newSponsor.descripcion,
        url: newSponsor.url,
        logoUrl,
        esPrincipal: newSponsor.esPrincipal
      });

      if (success) {
        if (newSponsor.esPrincipal) {
          await setPatrocinadorPrincipalFirebase(success.id);
        }
        setSponsorSuccess(true);
        onRestaurantesUpdated(); // Reusamos esto para que App.tsx haga el refreshData completo
        setTimeout(() => setSponsorSuccess(false), 3000);
        
        setNewSponsor({ nombre: '', tipo: 'Aliado Gourmet', descripcion: '', url: '', esPrincipal: false });
        setSponsorLogoFile(null);
      }
    } catch (error) {
      console.error(error);
      alert("Error al subir el patrocinador.");
    } finally {
      setIsUploadingSponsor(false);
    }
  };

  const handleSetPrincipalSponsor = async (sponsorId: string) => {
    try {
      const ok = await setPatrocinadorPrincipalFirebase(sponsorId);
      if (ok) {
        onRestaurantesUpdated();
      }
    } catch (err) {
      console.error(err);
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
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-[#FFF9ED] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#A40B03]" />
            <span>Volver a la vista pública de comensales</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl bg-[#0F0F0F] border border-[#A40B03]/40 shadow-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="flex flex-col items-center justify-center">
              <div className="h-16 w-auto px-4 py-2 rounded-2xl bg-black border border-[#A40B03]/50 shadow-lg shadow-[#A40B03]/25 flex items-center justify-center mb-2">
                <img src={logoBlanco} alt="Food Fest 2026" className="h-12 w-auto object-contain" />
              </div>
              <span className="text-[11px] font-bold text-[#A40B03] uppercase tracking-widest">
                Comité Organizador • Edición 2026
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
              Portal Superadministrador
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
                className="w-full px-4 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs sm:text-sm focus:border-[#A40B03] outline-none transition-all"
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
                className="w-full px-4 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs sm:text-sm focus:border-[#A40B03] outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] hover:shadow-xl hover:shadow-[#A40B03]/30 text-[#FFF9ED] font-extrabold text-xs sm:text-sm border border-[#A40B03]/50 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-[#FFF9ED]" />
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
        <div className="no-print fixed bottom-6 right-6 flex gap-4 bg-black p-4 rounded-2xl shadow-2xl border border-stone-800 z-50">
          <button onClick={() => setPrintRestId(null)} className="px-6 py-2.5 rounded-xl bg-stone-900 text-stone-200 font-bold text-sm hover:bg-stone-800">
            Volver al Panel
          </button>
          <button onClick={() => window.print()} className="px-6 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-black text-sm hover:bg-[#BF0E05] flex items-center gap-2 border border-[#A40B03]/60 shadow-lg shadow-[#A40B03]/30">
            <QrCode className="w-5 h-5 text-[#FFF9ED]" /> <span>Imprimir PDF / Tickets</span>
          </button>
        </div>

        <div className="p-4 sm:p-8">
          <div className="text-center mb-8 no-print">
            <h1 className="text-3xl font-black text-stone-950">Tickets para {printRest?.nombre}</h1>
            <p className="text-stone-500">Configura tu impresora para guardar como PDF o imprimir directamente.</p>
          </div>

          {/* Tickets Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {printCodes.map((c, i) => (
              <div key={c.id} className="ticket border-2 border-black border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white shadow-sm">
                <img src={logoRed} alt="Food Fest" className="h-7 w-auto mb-1 object-contain" />
                <div className="font-black text-xs uppercase tracking-wider text-[#A40B03]">Food Fest 2026 • El Tocuyo</div>
                <div className="font-extrabold text-base leading-tight my-1 text-stone-900">{printRest?.nombre}</div>
                <div className="bg-stone-50 border-2 border-black px-4 py-2 w-full rounded-lg shadow-inner my-1.5">
                  <div className="font-mono font-black text-xl tracking-widest text-black">{c.codigo}</div>
                </div>
                <div className="text-[10px] text-stone-600 font-semibold mt-1 max-w-[180px]">
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
    <div className="min-h-screen bg-black text-[#FFF9ED] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0F0F0F] border border-[#A40B03]/40 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-auto px-3 py-1 rounded-2xl bg-black border border-[#A40B03]/50 flex items-center justify-center">
              <img src={logoBlanco} alt="Food Fest 2026" className="h-9 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
                  Panel Superadministrador <span className="text-[#A40B03]">2026</span>
                </h1>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Control de lotes, auditoría antifraude en tiempo real y gestión del Food Fest.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={refreshAllData} className="p-2.5 rounded-xl bg-black text-stone-300 hover:text-[#FFF9ED] border border-stone-800 hover:border-[#A40B03]/40 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black text-stone-400 hover:text-red-400 border border-stone-800 transition-colors text-xs font-semibold">
              <LogOut className="w-4 h-4" /> <span>Cerrar Sesión</span>
            </button>
            <button onClick={onExitToPublic} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] text-xs font-bold hover:bg-[#BF0E05] transition-all shadow-md border border-[#FFF9ED]/20">
              <ArrowLeft className="w-4 h-4 text-[#FFF9ED]" /> <span>Sitio Público</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#0F0F0F] border border-stone-800 text-xs font-bold">
          <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'stats' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <BarChart3 className="w-4 h-4" /> <span>Métricas & Fraude</span>
          </button>
          <button onClick={() => setActiveTab('generator')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'generator' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <QrCode className="w-4 h-4" /> <span>Generador Códigos</span>
          </button>
          <button onClick={() => setActiveTab('gala')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'gala' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <Trophy className="w-4 h-4" /> <span>Gala Oficial</span>
          </button>
          <button onClick={() => setActiveTab('entities')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'entities' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <Store className="w-4 h-4" /> <span>Restaurantes</span>
          </button>
          <button onClick={() => setActiveTab('sponsors')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'sponsors' ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' : 'text-stone-400 hover:bg-stone-900'}`}>
            <Award className="w-4 h-4" /> <span>Patrocinadores</span>
          </button>
        </div>

        {/* TAB 1: METRICS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#0F0F0F] border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Votos Válidos</div>
                <div className="text-3xl font-black text-[#FFF9ED] mt-1">{stats.totalVotos}</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#0F0F0F] border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Códigos Generados</div>
                <div className="text-3xl font-black text-stone-200 mt-1">{stats.totalCodigosGenerados}</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#0F0F0F] border border-stone-800">
                <div className="text-xs font-semibold text-stone-400 uppercase">Tasa de Canje</div>
                <div className="text-3xl font-black text-[#A40B03] mt-1">
                  {stats.totalCodigosGenerados > 0 ? Math.round((stats.totalCodigosUsados / stats.totalCodigosGenerados) * 100) : 0}%
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-red-950/20 border border-red-900/40">
                <div className="text-xs font-semibold text-red-400 uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Fraude Prevenido
                </div>
                <div className="text-3xl font-black text-red-400 mt-1">{stats.intentosFraudeBloqueados}</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
                <h3 className="font-bold text-stone-200 text-sm sm:text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#A40B03]" /> <span>Votos por Restaurante</span>
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedRestaurantes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="nombre" tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#FFF9ED' }}
                        cursor={{ fill: '#171717' }}
                      />
                      <Bar dataKey="votosCount" name="Votos" fill="#A40B03" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
                <h3 className="font-bold text-stone-200 text-sm sm:text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#A40B03]" /> <span>Calificación Promedio</span>
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedRestaurantes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="nombre" tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 5]} tick={{ fill: '#a8a29e', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#A40B03' }}
                        cursor={{ fill: '#171717' }}
                      />
                      <Bar dataKey="promedioRating" name="Rating ★" fill="#FFF9ED" radius={[4, 4, 0, 0]} />
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
                  className="px-6 py-3 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-bold text-xs hover:bg-[#BF0E05] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-[#A40B03]/60 shadow-md shadow-[#A40B03]/30"
                >
                  {isGeneratingCodes ? (
                    <><RefreshCw className="w-4 h-4 animate-spin text-[#FFF9ED]" /> <span>Generando Códigos...</span></>
                  ) : (
                    <><PlusCircle className="w-4 h-4 text-[#FFF9ED]" /> <span>Generar Lote Único</span></>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-stone-500 font-semibold mt-2">
                ⚠️ Solo se puede generar códigos UNA VEZ por restaurante. Si requieres más, contacta soporte técnico.
              </p>
            </form>

            {/* List of Restaurants and their codes */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-[#A40B03]" /> <span>Códigos Generados por Restaurante</span>
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
                      <div key={r.id} className="p-4 rounded-xl bg-black border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={r.logoUrl} alt={r.nombre} className="w-10 h-10 rounded-lg object-cover border border-[#A40B03]/40" />
                          <div>
                            <div className="font-bold text-[#FFF9ED]">{r.nombre}</div>
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
                              <span className="text-[#A40B03] font-mono text-sm font-bold">{disponibles}</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => setPrintRestId(r.id)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-stone-900 text-[#FFF9ED] text-xs font-bold hover:bg-stone-800 hover:border-[#A40B03]/50 transition-colors flex justify-center items-center gap-2 border border-stone-800"
                          >
                            <QrCode className="w-4 h-4 text-[#A40B03]" />
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
          <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-[#A40B03]/40 space-y-5">
            <h3 className="text-lg font-black text-[#FFF9ED] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#A40B03]" /> <span>Ranking Oficial Desanonimizado • Food Fest 2026</span>
            </h3>
            <div className="space-y-3">
              {sortedRestaurantes.map((r, i) => (
                <div key={r.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${i === 0 ? 'bg-[#A40B03]/15 border-[#A40B03]/50' : 'bg-black border-stone-800'}`}>
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono font-black text-base text-[#A40B03] w-7 text-center">#{i + 1}</span>
                    <img src={r.logoUrl} alt={r.nombre} className="w-10 h-10 rounded-xl object-cover border border-[#A40B03]/40" />
                    <div>
                      <div className="font-bold text-[#FFF9ED]">{r.nombreHamburguesa}</div>
                      <div className="text-xs text-stone-400">{r.nombre}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-[#FFF9ED] font-mono">{r.votosCount === 0 ? "0.00" : r.promedioRating.toFixed(2)} ★</div>
                    <div className="text-xs text-stone-500">{r.votosCount} votos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ENTITIES (RESTAURANTS) & TABLE QR GENERATION */}
        {activeTab === 'entities' && (
          <div className="space-y-6">

            {/* SECTION 1: LIST OF RESTAURANTS & TABLE QR GENERATOR */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                <div>
                  <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2 text-base">
                    <QrCode className="w-5 h-5 text-[#A40B03]" /> 
                    <span>Generador de QRs Oficiales de Mesa</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Genera e imprime el código QR exclusivo de mesa para cada participante. Al escanearlo, el comensal entra directamente a la ficha de votación del restaurante.
                  </p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-xl bg-black border border-stone-800 text-stone-300 font-medium">
                  {restaurantes.length} Participantes Registrados
                </div>
              </div>

              {/* Grid of registered restaurants */}
              {restaurantes.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-xs">
                  No hay restaurantes registrados aún. Registra el primero en el formulario inferior.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restaurantes.map((r) => {
                    const tableUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}${window.location.pathname}?restaurante=${r.id}`
                      : `https://tocuyo-burgerfest.com/?restaurante=${r.id}`;

                    return (
                      <div 
                        key={r.id} 
                        className="p-4 rounded-xl bg-black border border-stone-800 hover:border-[#A40B03]/50 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="flex items-start gap-3">
                          <img 
                            src={r.fotoUrl} 
                            alt={r.nombreHamburguesa} 
                            className="w-14 h-14 rounded-lg object-cover border border-stone-800 shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[#FFF9ED] text-xs truncate group-hover:text-[#A40B03] transition-colors">
                              {r.nombreHamburguesa}
                            </h4>
                            <p className="text-stone-400 text-[11px] truncate">{r.nombre}</p>
                            <p className="text-[#A40B03] text-[11px] font-semibold">{r.instagram}</p>
                            {r.videoUrl && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                                <Film className="w-3 h-3" /> Con video
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-900 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQrRest(r)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#A40B03]/20 hover:bg-[#A40B03] text-[#FFF9ED] font-bold text-xs border border-[#A40B03]/40 transition-all shadow-sm"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#FFF9ED]" />
                            <span>Ver / Imprimir QR de Mesa</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MODAL: QR DE MESA VISUALIZADOR & IMPRESOR */}
            {selectedQrRest && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Modal Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
                    <div>
                      <h4 className="font-extrabold text-[#FFF9ED] text-base flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-[#A40B03]" />
                        <span>QR Oficial de Mesa</span>
                      </h4>
                      <p className="text-xs text-stone-400">
                        {selectedQrRest.nombre} • {selectedQrRest.nombreHamburguesa}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedQrRest(null)}
                      className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Printable Table Card Visual */}
                  {(() => {
                    const tableUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}${window.location.pathname}?restaurante=${selectedQrRest.id}`
                      : `https://tocuyo-burgerfest.com/?restaurante=${selectedQrRest.id}`;

                    return (
                      <div className="space-y-4">
                        <div className="p-6 rounded-2xl bg-[#FFF9ED] text-stone-950 flex flex-col items-center text-center space-y-3 shadow-xl border-2 border-stone-300">
                          <div className="text-[11px] font-black uppercase tracking-widest text-[#A40B03]">
                            FOOD FEST EL TOCUYO 2026
                          </div>

                          <div className="p-3 bg-white rounded-2xl border border-stone-300 shadow-inner">
                            <QRCodeSVG
                              value={tableUrl}
                              size={180}
                              level="H"
                              includeMargin={true}
                            />
                          </div>

                          <div className="space-y-0.5">
                            <div className="font-black text-stone-900 text-sm">
                              {selectedQrRest.nombreHamburguesa}
                            </div>
                            <div className="text-xs text-stone-600 font-semibold">
                              {selectedQrRest.nombre}
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-[#A40B03] bg-red-50 border border-red-200 px-3.5 py-1 rounded-full">
                            Escanea para votar en tu mesa
                          </div>
                        </div>

                        {/* URL & Action buttons */}
                        <div className="space-y-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-black border border-stone-800 font-mono text-[11px] text-stone-400 break-all select-all">
                            {tableUrl}
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(tableUrl);
                                setCopiedTableUrl(true);
                                setTimeout(() => setCopiedTableUrl(false), 2500);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black border border-stone-800 hover:border-[#A40B03]/60 text-stone-200 font-bold transition-all text-xs"
                            >
                              {copiedTableUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#A40B03]" />}
                              <span>{copiedTableUrl ? 'Copiado' : 'Copiar URL'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] font-bold transition-all text-xs border border-[#FFF9ED]/20 shadow-md"
                            >
                              <Printer className="w-4 h-4 text-[#FFF9ED]" />
                              <span>Imprimir Mesa</span>
                            </button>
                          </div>

                          <a
                            href={tableUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 hover:bg-stone-900 text-stone-400 hover:text-stone-200 text-xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir Vista de Comensal en Pestaña Nueva</span>
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            )}

            {/* SECTION 2: FORM TO REGISTER NEW RESTAURANT */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex justify-between border-b border-stone-800 pb-3">
                <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#A40B03]" /> <span>Inscribir Nuevo Restaurante / Competidor</span>
                </h3>
                {registerSuccess && <span className="text-xs text-emerald-400 font-bold">¡Restaurante guardado exitosamente!</span>}
              </div>

              <form onSubmit={handleCreateRestaurante} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Restaurante</label>
                    <input type="text" required value={newRest.nombre} onChange={(e) => setNewRest({ ...newRest, nombre: e.target.value })} placeholder="Ej: Asador Tocuyano BBQ" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre Plato / Creación</label>
                    <input type="text" required value={newRest.nombreHamburguesa} onChange={(e) => setNewRest({ ...newRest, nombreHamburguesa: e.target.value })} placeholder="Ej: La Tocuyana Especial" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Slogan</label>
                    <input type="text" value={newRest.slogan} onChange={(e) => setNewRest({ ...newRest, slogan: e.target.value })} placeholder="Ej: Ahumado a fuego lento" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Precio</label>
                    <input type="text" value={newRest.precio} onChange={(e) => setNewRest({ ...newRest, precio: e.target.value })} placeholder="Ej: $8.00" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Usuario de Instagram</label>
                    <input type="text" required value={newRest.instagram} onChange={(e) => setNewRest({ ...newRest, instagram: e.target.value })} placeholder="Ej: @mitocuyoburger" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Dirección</label>
                    <input type="text" value={newRest.direccion} onChange={(e) => setNewRest({ ...newRest, direccion: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      <Film className="w-3.5 h-3.5 inline mr-1 text-[#A40B03]" /> URL de Video / Reel de Preparación (Instagram Reel o MP4)
                    </label>
                    <input 
                      type="url" 
                      value={newRest.videoUrl} 
                      onChange={(e) => setNewRest({ ...newRest, videoUrl: e.target.value })} 
                      placeholder="Ej: https://www.instagram.com/reel/C... o https://servidor.com/video.mp4" 
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Ingredientes (Separados por coma)</label>
                    <input type="text" value={newRest.ingredientesRaw} onChange={(e) => setNewRest({ ...newRest, ingredientesRaw: e.target.value })} placeholder="Carne madurada, Queso local, Salsa especial" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción</label>
                    <textarea rows={2} value={newRest.descripcion} onChange={(e) => setNewRest({ ...newRest, descripcion: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none resize-none focus:border-[#A40B03]" />
                  </div>

                  {/* File Uploads for Restaurant */}
                  <div className="p-4 rounded-xl border border-stone-800 bg-black flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-stone-400">
                      <UploadCloud className="w-4 h-4 inline mr-1 text-[#A40B03]" /> Foto de la Creación (Buena Calidad)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => setFotoFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#A40B03]/20 file:text-[#FFF9ED] hover:file:bg-[#A40B03]/30"
                    />
                  </div>
                  <div className="p-4 rounded-xl border border-stone-800 bg-black flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-stone-400">
                      <UploadCloud className="w-4 h-4 inline mr-1 text-[#A40B03]" /> Logo del Restaurante
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#A40B03]/20 file:text-[#FFF9ED] hover:file:bg-[#A40B03]/30"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isUploadingRest} className="px-6 py-3 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-bold text-xs hover:bg-[#BF0E05] transition-all flex items-center gap-2 disabled:opacity-50 border border-[#A40B03]/50 shadow-md">
                  {isUploadingRest ? 'Subiendo imágenes y guardando...' : 'Inscribir Restaurante y Subir Fotos'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: SPONSORS & PYRAMID MANAGEMENT */}
        {activeTab === 'sponsors' && (
          <div className="space-y-6">

            {/* SECTION 1: SPONSORS PYRAMID DIRECTORY */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2 text-base">
                    <Crown className="w-5 h-5 text-amber-400" /> 
                    <span>Pirámide Oficial de Patrocinadores</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    El patrocinador en la cúspide se muestra en la web pública con el diseño más grande, luminoso e impactante. Puedes ascender a cualquier marca a la cúspide con un clic.
                  </p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-xl bg-black border border-stone-800 text-stone-300 font-medium">
                  {patrocinadores.length} Marcas Registradas
                </div>
              </div>

              {patrocinadores.length === 0 ? (
                <div className="text-center py-6 text-stone-500 text-xs">
                  Aún no has registrado patrocinadores. Registra el primero en el formulario inferior y quedará fijado automáticamente en la cúspide.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const currentApex = patrocinadores.find(p => p.esPrincipal || p.tipo === 'Principal') || patrocinadores[0];

                    return patrocinadores.map((pat) => {
                      const isApex = currentApex?.id === pat.id;

                      return (
                        <div
                          key={pat.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                            isApex
                              ? 'bg-gradient-to-br from-[#1F0706] to-black border-[#A40B03] shadow-lg shadow-[#A40B03]/25'
                              : 'bg-black border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-stone-800 shrink-0 p-1 flex items-center justify-center">
                              <img
                                src={pat.logoUrl}
                                alt={pat.nombre}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-[#FFF9ED] text-xs truncate">
                                  {pat.nombre}
                                </h4>
                              </div>
                              <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5">
                                {pat.descripcion}
                              </p>
                              {pat.url && (
                                <a
                                  href={pat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#A40B03] hover:underline flex items-center gap-1 mt-1 truncate"
                                >
                                  <span>{pat.url}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-stone-900 flex items-center justify-between">
                            {isApex ? (
                              <div className="w-full text-center py-1.5 px-3 rounded-lg bg-[#A40B03] text-amber-300 font-extrabold text-[11px] flex items-center justify-center gap-1.5 border border-amber-400/40 shadow-sm">
                                <Crown className="w-3.5 h-3.5 text-amber-300" />
                                <span>Cúspide de la Pirámide (Oficial Principal)</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrincipalSponsor(pat.id)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-[#A40B03] text-stone-300 hover:text-[#FFF9ED] font-bold text-xs border border-stone-800 hover:border-[#A40B03] transition-all"
                              >
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                                <span>Ascender a Cúspide de la Pirámide</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* SECTION 2: REGISTER NEW SPONSOR FORM */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex justify-between border-b border-stone-800 pb-3">
                <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#A40B03]" /> <span>Registrar Nuevo Patrocinador</span>
                </h3>
                {sponsorSuccess && <span className="text-xs text-emerald-400 font-bold">¡Patrocinador guardado con éxito!</span>}
              </div>

              <form onSubmit={handleCreateSponsor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Cúspide toggle */}
                  <label className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-black border border-stone-800 hover:border-[#A40B03]/60 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={newSponsor.esPrincipal} 
                      onChange={(e) => setNewSponsor({ 
                        ...newSponsor, 
                        esPrincipal: e.target.checked, 
                        tipo: e.target.checked ? 'Principal' : newSponsor.tipo 
                      })} 
                      className="w-4 h-4 accent-[#A40B03] rounded cursor-pointer" 
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-xs font-bold text-[#FFF9ED] flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        Fijar como Patrocinador Oficial Principal (Cúspide de la Pirámide)
                      </span>
                      <span className="text-[11px] text-stone-400">
                        — Se ubicará centrado en la cima con diseño gigante y luminoso.
                      </span>
                    </div>
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Nombre de la Empresa</label>
                    <input type="text" required value={newSponsor.nombre} onChange={(e) => setNewSponsor({ ...newSponsor, nombre: e.target.value })} placeholder="Ej: Polar / Zulia / Pepsi" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Tipo de Patrocinio</label>
                    <select 
                      value={newSponsor.tipo} 
                      onChange={(e) => setNewSponsor({ ...newSponsor, tipo: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                    >
                      <option value="Principal">Principal (Cúspide)</option>
                      <option value="Aliado Gourmet">Aliado Gourmet</option>
                      <option value="Patrocinador Oficial">Patrocinador Oficial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Sitio Web / Instagram (Opcional)</label>
                    <input type="url" value={newSponsor.url} onChange={(e) => setNewSponsor({ ...newSponsor, url: e.target.value })} placeholder="https://instagram.com/empresa" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Descripción Breve</label>
                    <input type="text" value={newSponsor.descripcion} onChange={(e) => setNewSponsor({ ...newSponsor, descripcion: e.target.value })} placeholder="Ej: Impulsando el desarrollo gastronómico y comercial de El Tocuyo" className="w-full px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]" />
                  </div>
                  
                  <div className="sm:col-span-2 p-4 rounded-xl border border-stone-800 bg-black flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-stone-400">
                      <UploadCloud className="w-4 h-4 inline mr-1 text-[#A40B03]" /> Logo del Patrocinador (Fondo transparente o JPG limpio)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => setSponsorLogoFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#A40B03]/20 file:text-[#FFF9ED] hover:file:bg-[#A40B03]/30"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isUploadingSponsor} className="px-6 py-3 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-bold text-xs hover:bg-[#BF0E05] transition-all flex items-center gap-2 disabled:opacity-50 border border-[#A40B03]/50 shadow-md">
                  {isUploadingSponsor ? 'Subiendo logo y guardando...' : 'Inscribir Patrocinador en la Pirámide'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
