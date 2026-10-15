import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CodigoVoto, EstadisticasEvento, Patrocinador, RegistroCompraPatrocinador } from '../types';

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
  Star,
  Edit3,
  Wand2,
  ShieldX,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Eye,
  Calendar,
  DollarSign,
  UserCheck,
  FileText,
  Camera,
  ShoppingBag
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
  updateRestauranteFirebase,
  toggleDescalificarRestauranteFirebase,
  getStatsFirebase, 
  getCodigosFirebase, 
  getFraudLogsFirebase, 
  generateBatchCodesFirebase,
  FraudLogType,
  convertImageToBase64,
  addPatrocinadorFirebase,
  setPatrocinadorPrincipalFirebase,
  updateRestauranteVideoFirebase,
  getComprasPatrocinadoresFirebase
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
  const [activeTab, setActiveTab] = useState<'stats' | 'generator' | 'entities' | 'sponsors' | 'gala' | 'architecture' | 'sponsor_audit'>('stats');

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
    usuarioAcceso: '',
    claveAcceso: ''
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingRest, setIsUploadingRest] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false);

  // Edit Video Modal state
  const [editingVideoRest, setEditingVideoRest] = useState<Restaurante | null>(null);
  const [editVideoUrlInput, setEditVideoUrlInput] = useState('');
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [videoSaveSuccess, setVideoSaveSuccess] = useState(false);

  // Edit Restaurant Full Information Modal state
  const [editingRest, setEditingRest] = useState<Restaurante | null>(null);
  const [editRestForm, setEditRestForm] = useState({
    nombre: '',
    nombreHamburguesa: '',
    slogan: '',
    descripcion: '',
    ingredientesRaw: '',
    precio: '',
    direccion: '',
    instagram: '',
    videoUrl: '',
    usuarioAcceso: '',
    claveAcceso: ''
  });
  const [editFotoFile, setEditFotoFile] = useState<File | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [isSavingEditRest, setIsSavingEditRest] = useState(false);
  const [editRestSuccess, setEditRestSuccess] = useState(false);

  // Disqualification Security Modal state (Código Secreto: 0987654321)
  const [disqualifyTargetRest, setDisqualifyTargetRest] = useState<Restaurante | null>(null);
  const [disqualifyCodeInput, setDisqualifyCodeInput] = useState('');
  const [disqualifyReasonInput, setDisqualifyReasonInput] = useState('');
  const [disqualifyError, setDisqualifyError] = useState<string | null>(null);
  const [isSubmittingDisqualify, setIsSubmittingDisqualify] = useState(false);
  const [disqualifySuccessMsg, setDisqualifySuccessMsg] = useState<string | null>(null);

  // Sponsor Store QR Modal state
  const [selectedSponsorQr, setSelectedSponsorQr] = useState<Patrocinador | null>(null);
  const [copiedSponsorUrl, setCopiedSponsorUrl] = useState(false);

  // Sponsor Invoices Audit state
  const [comprasAuditList, setComprasAuditList] = useState<RegistroCompraPatrocinador[]>([]);
  const [isLoadingComprasAudit, setIsLoadingComprasAudit] = useState(false);
  const [selectedAuditImage, setSelectedAuditImage] = useState<string | null>(null);
  const [auditFilterSponsor, setAuditFilterSponsor] = useState<string>('todos');
  const [auditFilterRest, setAuditFilterRest] = useState<string>('todos');

  const fetchComprasAudit = async () => {
    setIsLoadingComprasAudit(true);
    try {
      const data = await getComprasPatrocinadoresFirebase();
      setComprasAuditList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingComprasAudit(false);
    }
  };

  // --- HELPERS DE FORMATEO Y CAPITALIZACIÓN AUTOMÁTICA ---
  const toTitleCase = (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
      .join(' ');
  };

  const toSentenceCase = (text: string): string => {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const formatInstagramHandle = (input: string): string => {
    let clean = input.trim();
    const urlMatch = clean.match(/(?:instagram\.com\/)([a-zA-Z0-9._]+)/i);
    if (urlMatch) {
      return `@${urlMatch[1]}`;
    }
    if (clean && !clean.startsWith('@')) {
      return `@${clean}`;
    }
    return clean;
  };

  const formatPrice = (price: string): string => {
    let clean = price.trim().replace(/\s+/g, '');
    if (!clean) return '$8.00';
    if (!clean.startsWith('$')) {
      const num = parseFloat(clean);
      if (!isNaN(num)) return `$${num.toFixed(2)}`;
      return `$${clean}`;
    } else {
      const num = parseFloat(clean.replace('$', ''));
      if (!isNaN(num)) return `$${num.toFixed(2)}`;
      return clean;
    }
  };

  const formatIngredientesRaw = (raw: string): string => {
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(', ');
  };

  const autoFormatNewRest = () => {
    setNewRest(prev => ({
      ...prev,
      nombre: toTitleCase(prev.nombre),
      nombreHamburguesa: toTitleCase(prev.nombreHamburguesa),
      slogan: toSentenceCase(prev.slogan),
      precio: formatPrice(prev.precio),
      instagram: formatInstagramHandle(prev.instagram),
      direccion: toSentenceCase(prev.direccion),
      ingredientesRaw: formatIngredientesRaw(prev.ingredientesRaw),
      descripcion: toSentenceCase(prev.descripcion),
      videoUrl: prev.videoUrl.trim()
    }));
  };

  const autoFormatEditRest = () => {
    setEditRestForm(prev => ({
      ...prev,
      nombre: toTitleCase(prev.nombre),
      nombreHamburguesa: toTitleCase(prev.nombreHamburguesa),
      slogan: toSentenceCase(prev.slogan),
      precio: formatPrice(prev.precio),
      instagram: formatInstagramHandle(prev.instagram),
      direccion: toSentenceCase(prev.direccion),
      ingredientesRaw: formatIngredientesRaw(prev.ingredientesRaw),
      descripcion: toSentenceCase(prev.descripcion),
      videoUrl: prev.videoUrl.trim()
    }));
  };

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
    fetchComprasAudit();
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
      
      const defaultUser = newRest.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
      const defaultPass = 'burger2026';

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
        usuarioAcceso: newRest.usuarioAcceso.trim() || defaultUser,
        claveAcceso: newRest.claveAcceso.trim() || defaultPass,
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
          videoUrl: '', usuarioAcceso: '', claveAcceso: ''
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

  const openEditRestModal = (r: Restaurante) => {
    if (r.descalificado) {
      alert("Este restaurante se encuentra descalificado. Debes reincorporarlo mediante auditoría antes de poder modificar sus datos.");
      return;
    }
    setEditingRest(r);
    setEditRestForm({
      nombre: r.nombre,
      nombreHamburguesa: r.nombreHamburguesa,
      slogan: r.slogan || '',
      descripcion: r.descripcion || '',
      ingredientesRaw: (r.ingredientes || []).join(', '),
      precio: r.precio || '',
      direccion: r.direccion || '',
      instagram: r.instagram || '',
      videoUrl: r.videoUrl || '',
      usuarioAcceso: r.usuarioAcceso || r.nombre.toLowerCase().replace(/[^a-z0-9]/g, ''),
      claveAcceso: r.claveAcceso || 'burger2026'
    });
    setEditFotoFile(null);
    setEditLogoFile(null);
    setEditRestSuccess(false);
  };

  const handleSaveRestaurantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRest) return;
    if (editingRest.descalificado) {
      alert("No se pueden modificar los datos de un participante descalificado.");
      return;
    }
    setIsSavingEditRest(true);

    try {
      const updates: Partial<Restaurante> = {
        nombre: toTitleCase(editRestForm.nombre),
        nombreHamburguesa: toTitleCase(editRestForm.nombreHamburguesa),
        slogan: toSentenceCase(editRestForm.slogan),
        descripcion: toSentenceCase(editRestForm.descripcion),
        ingredientes: editRestForm.ingredientesRaw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        precio: formatPrice(editRestForm.precio),
        direccion: toSentenceCase(editRestForm.direccion),
        instagram: formatInstagramHandle(editRestForm.instagram),
        videoUrl: editRestForm.videoUrl.trim() || "",
        usuarioAcceso: editRestForm.usuarioAcceso.trim() || undefined,
        claveAcceso: editRestForm.claveAcceso.trim() || undefined
      };

      if (editFotoFile) {
        updates.fotoUrl = await convertImageToBase64(editFotoFile);
      }
      if (editLogoFile) {
        updates.logoUrl = await convertImageToBase64(editLogoFile, 400);
      }

      const ok = await updateRestauranteFirebase(editingRest.id, updates);
      if (ok) {
        setEditRestSuccess(true);
        onRestaurantesUpdated();
        setTimeout(() => {
          setEditRestSuccess(false);
          setEditingRest(null);
        }, 1500);
      } else {
        alert("Error al actualizar la información en Firebase. Revisa los datos ingresados.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error procesando los cambios.");
    } finally {
      setIsSavingEditRest(false);
    }
  };

  const openDisqualifyModal = (r: Restaurante) => {
    setDisqualifyTargetRest(r);
    setDisqualifyCodeInput('');
    setDisqualifyReasonInput(r.motivoDescalificacion || '');
    setDisqualifyError(null);
    setDisqualifySuccessMsg(null);
  };

  const handleConfirmDisqualification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disqualifyTargetRest) return;
    setDisqualifyError(null);

    // Verificación estricta de código de seguridad: 0987654321
    if (disqualifyCodeInput.trim() !== '0987654321') {
      setDisqualifyError('Código de seguridad incorrecto. Acción denegada por auditoría.');
      return;
    }

    setIsSubmittingDisqualify(true);
    try {
      const newStatus = !disqualifyTargetRest.descalificado;
      const ok = await toggleDescalificarRestauranteFirebase(
        disqualifyTargetRest.id,
        newStatus,
        disqualifyReasonInput
      );

      if (ok) {
        setDisqualifySuccessMsg(newStatus ? 'Restaurante marcado como DESCALIFICADO con éxito.' : 'Restaurante reincorporado a la competencia.');
        onRestaurantesUpdated();
        setTimeout(() => {
          setDisqualifyTargetRest(null);
          setDisqualifySuccessMsg(null);
        }, 1800);
      } else {
        setDisqualifyError('Error al actualizar el estado en Firebase.');
      }
    } catch (err: any) {
      setDisqualifyError(err.message || 'Error en la operación.');
    } finally {
      setIsSubmittingDisqualify(false);
    }
  };

  const handleSaveRestaurantVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoRest) return;
    setIsSavingVideo(true);
    try {
      const ok = await updateRestauranteVideoFirebase(editingVideoRest.id, editVideoUrlInput);
      if (ok) {
        setVideoSaveSuccess(true);
        onRestaurantesUpdated();
        setTimeout(() => {
          setVideoSaveSuccess(false);
          setEditingVideoRest(null);
        }, 1500);
      } else {
        alert("No se pudo actualizar el video en Firebase.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar el enlace de video.");
    } finally {
      setIsSavingVideo(false);
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
          <button 
            onClick={() => {
              setActiveTab('sponsor_audit');
              fetchComprasAudit();
            }} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'sponsor_audit' 
                ? 'bg-[#A40B03] text-[#FFF9ED] shadow-[0_0_15px_rgba(164,11,3,0.35)] border border-[#A40B03]/60' 
                : 'text-stone-400 hover:bg-stone-900'
            }`}
          >
            <Receipt className="w-4 h-4" /> <span>Auditoría Compras</span>
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
                        className={`p-4 rounded-xl bg-black border transition-all flex flex-col justify-between space-y-3 group ${
                          r.descalificado 
                            ? 'border-red-600/60 bg-gradient-to-b from-red-950/20 to-black' 
                            : 'border-stone-800 hover:border-[#A40B03]/50'
                        }`}
                      >
                        {/* Status & Quick Actions Bar */}
                        <div className="flex items-center justify-between gap-2 border-b border-stone-900 pb-2.5">
                          {r.descalificado ? (
                            <span className="px-2 py-0.5 rounded-md bg-red-600/30 border border-red-500/80 text-red-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <ShieldX className="w-3 h-3 text-red-400" /> Descalificado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> En Competencia
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditRestModal(r)}
                              disabled={r.descalificado}
                              className={`px-2 py-1 rounded-lg border transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                                r.descalificado
                                  ? 'opacity-40 cursor-not-allowed bg-stone-950 border-stone-800 text-stone-500'
                                  : 'bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-800 hover:border-stone-700 cursor-pointer'
                              }`}
                              title={r.descalificado ? 'Bloqueado: El restaurante está descalificado. Reincorpóralo para editar.' : 'Editar información completa'}
                            >
                              <Edit3 className="w-3 h-3 text-[#A40B03]" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openDisqualifyModal(r)}
                              className={`px-2 py-1 rounded-lg border transition-colors text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                                r.descalificado
                                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                  : 'bg-red-950/30 border-red-700/50 text-red-400 hover:bg-red-900/40'
                              }`}
                              title="Control de Descalificación con código de seguridad"
                            >
                              {r.descalificado ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <ShieldX className="w-3 h-3 text-red-400" />}
                              <span>{r.descalificado ? 'Reincorporar' : 'Descalificar'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Restaurant Info */}
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

                        {/* Manager Credentials Badge */}
                        <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-[11px] flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="text-stone-500 font-bold block text-[10px] uppercase">Credenciales Encargado:</span>
                            <span className="font-mono text-stone-300">
                              User: <strong className="text-[#FFF9ED]">{r.usuarioAcceso || r.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}</strong>
                            </span>
                            <span className="text-stone-600 mx-1">•</span>
                            <span className="font-mono text-stone-300">
                              Clave: <strong className="text-amber-400">{r.claveAcceso || 'burger2026'}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const u = r.usuarioAcceso || r.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
                              const p = r.claveAcceso || 'burger2026';
                              navigator.clipboard.writeText(`Credenciales The Best Burger 2026\nRestaurante: ${r.nombre}\nUsuario: ${u}\nClave: ${p}`);
                              alert(`Credenciales de ${r.nombre} copiadas al portapapeles.`);
                            }}
                            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 shrink-0 cursor-pointer"
                            title="Copiar credenciales para enviar al encargado"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Action Buttons: QR & Video */}
                        <div className="pt-2 border-t border-stone-900 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQrRest(r)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#A40B03]/20 hover:bg-[#A40B03] text-[#FFF9ED] font-bold text-xs border border-[#A40B03]/40 transition-all shadow-sm cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#FFF9ED]" />
                            <span>QR de Mesa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVideoRest(r);
                              setEditVideoUrlInput(r.videoUrl || '');
                            }}
                            className="px-3 py-2 rounded-lg bg-black hover:bg-stone-900 border border-stone-800 hover:border-[#A40B03]/60 text-stone-300 hover:text-[#FFF9ED] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Editar Enlace de Video / Reel"
                          >
                            <Film className="w-3.5 h-3.5 text-[#A40B03]" />
                            <span>Video</span>
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

            {/* MODAL: EDITAR VIDEO / ENLACE DE RESTAURANTE */}
            {editingVideoRest && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
                    <div>
                      <h4 className="font-extrabold text-[#FFF9ED] text-base flex items-center gap-2">
                        <Film className="w-5 h-5 text-[#A40B03]" />
                        <span>Video de Preparación</span>
                      </h4>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {editingVideoRest.nombre} • {editingVideoRest.nombreHamburguesa}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingVideoRest(null)}
                      className="p-1.5 rounded-xl bg-stone-900 text-stone-400 hover:text-[#FFF9ED] border border-stone-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRestaurantVideo} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                        Enlace del Video o Reel:
                      </label>
                      <input
                        type="url"
                        value={editVideoUrlInput}
                        onChange={(e) => setEditVideoUrlInput(e.target.value)}
                        placeholder="Ej: https://www.instagram.com/reel/C... o https://.../video.mp4 o YouTube"
                        className="w-full px-4 py-3 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                      />
                      <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                        💡 Soporta <strong>Reels de Instagram</strong> (ej: <code className="text-stone-400">instagram.com/reel/...</code>), videos de <strong>YouTube</strong> y archivos directos <strong>MP4</strong>.
                      </p>
                    </div>

                    {videoSaveSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>¡Enlace de video guardado exitosamente!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingVideoRest(null)}
                        className="px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-xs font-bold text-stone-400 hover:text-stone-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingVideo}
                        className="px-5 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSavingVideo ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Guardar Enlace</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 1: EDITAR INFORMACIÓN COMPLETA DEL RESTAURANTE */}
            {editingRest && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden">
                <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                  {/* Modal Header (Fixed) */}
                  <div className="p-5 sm:p-6 pb-4 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#FFF9ED] text-[11px] font-bold uppercase tracking-wider mb-1.5">
                        <Edit3 className="w-3 h-3 text-[#A40B03]" />
                        <span>Edición de Ficha Oficial</span>
                      </div>
                      <h4 className="font-extrabold text-[#FFF9ED] text-base sm:text-lg">
                        Modificar Ficha de {editingRest.nombreHamburguesa}
                      </h4>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {editingRest.nombre} • Modifica ingredientes, precios, descripciones o enlaces.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingRest(null)}
                      className="p-1.5 rounded-xl bg-stone-900 text-stone-400 hover:text-[#FFF9ED] border border-stone-800 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Body (Single Scrollbar) */}
                  <form id="edit-rest-form" onSubmit={handleSaveRestaurantEdit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                    {/* Auto-format Button */}
                    <div className="flex items-center justify-between pb-1 border-b border-stone-900">
                      <span className="text-xs text-stone-400 font-medium">
                        Datos del participante y burger
                      </span>
                      <button
                        type="button"
                        onClick={autoFormatEditRest}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Capitalizar y Formatear Automático</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Nombre del Restaurante
                        </label>
                        <input
                          type="text"
                          required
                          value={editRestForm.nombre}
                          onChange={(e) => setEditRestForm({ ...editRestForm, nombre: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Nombre de la Hamburguesa / Plato
                        </label>
                        <input
                          type="text"
                          required
                          value={editRestForm.nombreHamburguesa}
                          onChange={(e) => setEditRestForm({ ...editRestForm, nombreHamburguesa: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Slogan
                        </label>
                        <input
                          type="text"
                          value={editRestForm.slogan}
                          onChange={(e) => setEditRestForm({ ...editRestForm, slogan: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Precio Oficial
                        </label>
                        <input
                          type="text"
                          value={editRestForm.precio}
                          onChange={(e) => setEditRestForm({ ...editRestForm, precio: e.target.value })}
                          placeholder="Ej: $8.00"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Instagram
                        </label>
                        <input
                          type="text"
                          value={editRestForm.instagram}
                          onChange={(e) => setEditRestForm({ ...editRestForm, instagram: e.target.value })}
                          placeholder="@usuario"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Dirección en El Tocuyo
                        </label>
                        <input
                          type="text"
                          value={editRestForm.direccion}
                          onChange={(e) => setEditRestForm({ ...editRestForm, direccion: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      {/* Credenciales de Acceso para Encargado */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                          Usuario Encargado (Acceso QR)
                        </label>
                        <input
                          type="text"
                          value={editRestForm.usuarioAcceso}
                          onChange={(e) => setEditRestForm({ ...editRestForm, usuarioAcceso: e.target.value })}
                          placeholder="Ej: burger_el_tocuyo"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                          Clave de Acceso (Acceso QR)
                        </label>
                        <input
                          type="text"
                          value={editRestForm.claveAcceso}
                          onChange={(e) => setEditRestForm({ ...editRestForm, claveAcceso: e.target.value })}
                          placeholder="Ej: burger2026"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          URL de Video / Reel (Instagram o MP4)
                        </label>
                        <input
                          type="url"
                          value={editRestForm.videoUrl}
                          onChange={(e) => setEditRestForm({ ...editRestForm, videoUrl: e.target.value })}
                          placeholder="https://www.instagram.com/reel/... o https://.../video.mp4"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Ingredientes (Separados por coma)
                        </label>
                        <input
                          type="text"
                          value={editRestForm.ingredientesRaw}
                          onChange={(e) => setEditRestForm({ ...editRestForm, ingredientesRaw: e.target.value })}
                          placeholder="Pan brioche artesanal, 180g blend de carne, queso cheddar..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          Descripción de la Hamburguesa
                        </label>
                        <textarea
                          rows={3}
                          value={editRestForm.descripcion}
                          onChange={(e) => setEditRestForm({ ...editRestForm, descripcion: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03] resize-none"
                        />
                      </div>

                      {/* Optional Image Replacement */}
                      <div className="p-3 rounded-xl border border-stone-800 bg-black space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-stone-400">
                          Reemplazar Foto (Opcional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditFotoFile(e.target.files ? e.target.files[0] : null)}
                          className="text-[11px] text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-stone-900 file:text-stone-300"
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-stone-800 bg-black space-y-1">
                        <label className="block text-[11px] font-bold uppercase text-stone-400">
                          Reemplazar Logo (Opcional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditLogoFile(e.target.files ? e.target.files[0] : null)}
                          className="text-[11px] text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-stone-900 file:text-stone-300"
                        />
                      </div>
                    </div>

                    {editRestSuccess && (
                      <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>¡Información del restaurante actualizada exitosamente en Firebase!</span>
                      </div>
                    )}
                  </form>

                  {/* Modal Footer (Fixed at Bottom) */}
                  <div className="p-4 sm:p-5 border-t border-stone-800 bg-[#0A0A0A] rounded-b-3xl flex items-center justify-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingRest(null)}
                      className="px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-xs font-bold text-stone-400 hover:text-stone-200 cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form="edit-rest-form"
                      disabled={isSavingEditRest}
                      className="px-5 py-2.5 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingEditRest ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando en Firebase...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar Modificaciones</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 2: SEGURIDAD DE DESCALIFICACIÓN (CÓDIGO: 0987654321) */}
            {disqualifyTargetRest && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-[#0F0F0F] border border-red-600/50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#FFF9ED] text-base">
                          {disqualifyTargetRest.descalificado ? 'Reincorporar Restaurante' : 'Descalificar Participante'}
                        </h4>
                        <p className="text-xs text-red-400 font-semibold">
                          Acción de Auditoría Oficial • Seguridad Requerida
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisqualifyTargetRest(null)}
                      className="p-1.5 rounded-xl bg-stone-900 text-stone-400 hover:text-[#FFF9ED] border border-stone-800 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleConfirmDisqualification} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-black border border-stone-800 text-xs space-y-1">
                      <p className="font-bold text-[#FFF9ED]">{disqualifyTargetRest.nombre}</p>
                      <p className="text-stone-400">{disqualifyTargetRest.nombreHamburguesa}</p>
                      <p className="text-[11px] text-stone-500 pt-1">
                        {disqualifyTargetRest.descalificado 
                          ? 'Al reincorporar, el restaurante volverá a estar activo y recibirá votos nuevamente.'
                          : 'Al descalificar, aparecerá con una cinta roja pública de DESCALIFICADO y se bloquearán todos sus votos y códigos de mesa.'}
                      </p>
                    </div>

                    {/* Secret Security Code Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center justify-between">
                        <span>Código de Auditoría Superadmin:</span>
                        <span className="text-[10px] text-red-400 font-mono">Requerido</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={disqualifyCodeInput}
                          onChange={(e) => setDisqualifyCodeInput(e.target.value)}
                          placeholder="Ingresa el código secreto de 10 dígitos"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black border border-stone-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-[#FFF9ED] text-xs font-mono tracking-widest transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-stone-500">
                        Código de seguridad preestablecido para autorizar descalificaciones oficiales.
                      </p>
                    </div>

                    {/* Reason Input */}
                    {!disqualifyTargetRest.descalificado && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                          Motivo de la Descalificación (Público):
                        </label>
                        <textarea
                          rows={2}
                          value={disqualifyReasonInput}
                          onChange={(e) => setDisqualifyReasonInput(e.target.value)}
                          placeholder="Ej: Incumplimiento del gramaje de carne reglamentario, irregularidad en códigos..."
                          className="w-full px-3.5 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-red-500 resize-none"
                        />
                      </div>
                    )}

                    {disqualifyError && (
                      <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{disqualifyError}</span>
                      </div>
                    )}

                    {disqualifySuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{disqualifySuccessMsg}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setDisqualifyTargetRest(null)}
                        className="px-4 py-2.5 rounded-xl bg-black border border-stone-800 text-xs font-bold text-stone-400 hover:text-stone-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingDisqualify}
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                          disqualifyTargetRest.descalificado
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white border border-red-500/50'
                        }`}
                      >
                        {isSubmittingDisqualify ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Validando...</span>
                          </>
                        ) : (
                          <>
                            {disqualifyTargetRest.descalificado ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
                            <span>{disqualifyTargetRest.descalificado ? 'Confirmar Reincorporación' : 'Aplicar Descalificación'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SECTION 2: FORM TO REGISTER NEW RESTAURANT */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <h3 className="font-bold text-[#FFF9ED] flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#A40B03]" /> <span>Inscribir Nuevo Restaurante / Competidor</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={autoFormatNewRest}
                    className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Corrige mayúsculas/minúsculas, arroba de Instagram y formato de precios automáticamente"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Capitalizar y Formatear Automático</span>
                  </button>
                  {registerSuccess && <span className="text-xs text-emerald-400 font-bold">¡Restaurante guardado exitosamente!</span>}
                </div>
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

                  {/* Credenciales de Acceso para Compras en Patrocinadores */}
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Credenciales de Acceso para el Encargado (Visitas a Patrocinadores)</span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      Con este usuario y contraseña, el encargado del restaurante podrá iniciar sesión al escanear los códigos QR en las tiendas de los patrocinadores para subir sus facturas de compras. Si se dejan vacíos, se generarán automáticamente (ej: <code className="text-stone-300">nombre / burger2026</code>).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-400 mb-1">Usuario de Acceso</label>
                        <input
                          type="text"
                          value={newRest.usuarioAcceso}
                          onChange={(e) => setNewRest({ ...newRest, usuarioAcceso: e.target.value })}
                          placeholder="Ej: asadortocuyano"
                          className="w-full px-3 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-400 mb-1">Contraseña de Acceso</label>
                        <input
                          type="text"
                          value={newRest.claveAcceso}
                          onChange={(e) => setNewRest({ ...newRest, claveAcceso: e.target.value })}
                          placeholder="Ej: burger2026"
                          className="w-full px-3 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                        />
                      </div>
                    </div>
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

                          <div className="pt-2 border-t border-stone-900 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSponsorQr(pat);
                                setCopiedSponsorUrl(false);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5 text-amber-400" />
                              <span>Ver / Imprimir QR de Tienda</span>
                            </button>

                            {isApex ? (
                              <div className="w-full text-center py-1.5 px-3 rounded-lg bg-[#A40B03] text-amber-300 font-extrabold text-[11px] flex items-center justify-center gap-1.5 border border-amber-400/40 shadow-sm">
                                <Crown className="w-3.5 h-3.5 text-amber-300" />
                                <span>Cúspide de la Pirámide (Oficial Principal)</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrincipalSponsor(pat.id)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-[#A40B03] text-stone-300 hover:text-[#FFF9ED] font-bold text-xs border border-stone-800 hover:border-[#A40B03] transition-all cursor-pointer"
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

        {/* TAB 6: SPONSOR PURCHASES AUDIT (COMPLIANCE COMMITTEE) */}
        {activeTab === 'sponsor_audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Card */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Control de Reglas y Suministros Oficiales</span>
                  </div>
                  <h3 className="text-lg font-black text-[#FFF9ED] flex items-center gap-2">
                    Auditoría de Compras en Tiendas de Patrocinadores
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
                    Verificación del cumplimiento de la regla oficial: cada restaurante participante debe comprar suministros en las tiendas de los patrocinadores del Food Fest y respaldarlo con factura y descripción.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={fetchComprasAudit}
                    disabled={isLoadingComprasAudit}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black hover:bg-stone-900 border border-stone-800 text-xs font-bold text-stone-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingComprasAudit ? 'animate-spin' : ''}`} />
                    <span>{isLoadingComprasAudit ? 'Actualizando...' : 'Recargar Auditoría'}</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              {(() => {
                const uniqueRestaurantsWithPurchases = new Set(comprasAuditList.map(c => c.restauranteId)).size;
                const uniqueSponsorsVisited = new Set(comprasAuditList.map(c => c.patrocinadorId)).size;
                const compliancePercentage = restaurantes.length > 0 
                  ? Math.round((uniqueRestaurantsWithPurchases / restaurantes.length) * 100) 
                  : 0;

                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Total Facturas</span>
                        <Receipt className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black text-[#FFF9ED] font-mono">
                        {comprasAuditList.length}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Comprobantes auditables
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Restaurantes al Día</span>
                        <Store className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">
                        {uniqueRestaurantsWithPurchases} <span className="text-xs text-stone-500">/ {restaurantes.length}</span>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Con al menos 1 compra registrada
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Tiendas Visitadas</span>
                        <ShoppingBag className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="text-2xl font-black text-sky-400 font-mono">
                        {uniqueSponsorsVisited} <span className="text-xs text-stone-500">/ {patrocinadores.length}</span>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Puntos de venta de patrocinadores
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black border border-stone-800 space-y-1">
                      <div className="flex items-center justify-between text-stone-400 text-xs">
                        <span>Cumplimiento Global</span>
                        <Award className="w-4 h-4 text-[#A40B03]" />
                      </div>
                      <div className="text-2xl font-black text-[#FFF9ED] font-mono">
                        {compliancePercentage}%
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Tasa de adhesión a la regla
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Compliance Matrix by Restaurant */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h4 className="font-bold text-[#FFF9ED] text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>Control de Cumplimiento por Participante</span>
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Resumen de visitas y facturas presentadas por cada restaurante participante.
                  </p>
                </div>
                <div className="text-xs text-stone-400 font-medium">
                  {restaurantes.length} Competidores
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {restaurantes.map((rest) => {
                  const restCompras = comprasAuditList.filter(c => c.restauranteId === rest.id);
                  const sponsorIds = new Set(restCompras.map(c => c.patrocinadorId));
                  const isCompliant = restCompras.length > 0;

                  return (
                    <div
                      key={rest.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        isCompliant 
                          ? 'bg-black border-stone-800 hover:border-emerald-500/40' 
                          : 'bg-black border-amber-900/40 hover:border-amber-700/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={rest.logoUrl}
                          alt={rest.nombre}
                          className="w-10 h-10 rounded-xl object-contain bg-stone-900 border border-stone-800 p-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-[#FFF9ED] text-xs truncate">{rest.nombreHamburguesa}</h5>
                          <p className="text-[11px] text-stone-400 truncate">{rest.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                              👤 {rest.usuarioAcceso || rest.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-900 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-stone-300">
                            {restCompras.length} {restCompras.length === 1 ? 'Factura' : 'Facturas'}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            {sponsorIds.size} {sponsorIds.size === 1 ? 'tienda' : 'tiendas'}
                          </div>
                        </div>

                        <div>
                          {isCompliant ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> Al día
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-400" /> Sin compras
                            </span>
                          )}
                        </div>
                      </div>

                      {restCompras.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuditFilterRest(rest.id);
                            setAuditFilterSponsor('todos');
                          }}
                          className="w-full text-center py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-[11px] font-semibold text-stone-300 transition-colors cursor-pointer"
                        >
                          Ver sus facturas ({restCompras.length})
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter and Detailed Invoices Table */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-stone-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <h4 className="font-bold text-[#FFF9ED] text-base flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Registro Detallado de Facturas de Compras</span>
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Historial cronológico de todos los comprobantes y descripciones cargados por los restaurantes participantes.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={auditFilterRest}
                    onChange={(e) => setAuditFilterRest(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                  >
                    <option value="todos">Todos los Restaurantes</option>
                    {restaurantes.map(r => (
                      <option key={r.id} value={r.id}>{r.nombreHamburguesa} ({r.nombre})</option>
                    ))}
                  </select>

                  <select
                    value={auditFilterSponsor}
                    onChange={(e) => setAuditFilterSponsor(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black border border-stone-800 text-[#FFF9ED] text-xs outline-none focus:border-[#A40B03]"
                  >
                    <option value="todos">Todos los Patrocinadores</option>
                    {patrocinadores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>

                  {(auditFilterRest !== 'todos' || auditFilterSponsor !== 'todos') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuditFilterRest('todos');
                        setAuditFilterSponsor('todos');
                      }}
                      className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold cursor-pointer"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Invoices List */}
              {(() => {
                const filtered = comprasAuditList.filter(item => {
                  if (auditFilterRest !== 'todos' && item.restauranteId !== auditFilterRest) return false;
                  if (auditFilterSponsor !== 'todos' && item.patrocinadorId !== auditFilterSponsor) return false;
                  return true;
                });

                if (isLoadingComprasAudit) {
                  return (
                    <div className="text-center py-12 text-stone-400 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                      <span>Cargando registro de compras...</span>
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-stone-500 text-xs bg-black/40 rounded-xl border border-dashed border-stone-800">
                      No se encontraron compras ni facturas registradas con los filtros seleccionados.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-black border border-stone-800 hover:border-stone-700 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2 border-b border-stone-900 pb-2">
                            <div>
                              <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                                Tienda Patrocinadora
                              </div>
                              <div className="font-extrabold text-[#FFF9ED] text-sm">
                                {item.patrocinadorNombre}
                              </div>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                              {item.fecha ? new Date(item.fecha).toLocaleDateString() : ''}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] uppercase font-mono text-stone-500 font-semibold">
                              Restaurante Comprador
                            </div>
                            <div className="text-xs font-bold text-stone-200">
                              {item.restauranteNombreHamburguesa || item.restauranteNombre}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              {item.restauranteNombre}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-900 space-y-1">
                            <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                              <FileText className="w-3 h-3 text-stone-400" />
                              <span>Detalle de Productos / Insumos Adquiridos:</span>
                            </div>
                            <p className="text-xs text-stone-300 leading-relaxed font-sans">
                              {item.descripcion}
                            </p>
                          </div>

                          {(item.monto || item.numeroFactura) && (
                            <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                              {item.monto && (
                                <span className="bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-emerald-400 font-bold">
                                  {item.monto}
                                </span>
                              )}
                              {item.numeroFactura && (
                                <span className="bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
                                  Factura: {item.numeroFactura}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Invoice Photo Preview or Indicator */}
                        <div className="pt-2 border-t border-stone-900">
                          {item.facturaFotoUrl ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <img
                                  src={item.facturaFotoUrl}
                                  alt="Factura"
                                  className="w-9 h-9 rounded-lg object-cover border border-stone-800 cursor-pointer hover:opacity-80"
                                  onClick={() => setSelectedAuditImage(item.facturaFotoUrl || null)}
                                />
                                <span className="text-[11px] text-stone-400">Foto de factura adjunta</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedAuditImage(item.facturaFotoUrl || null)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-stone-500 italic flex items-center gap-1">
                              <span>(Registro con descripción sin foto adjunta)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* MODAL: QR DE TIENDA DEL PATROCINADOR */}
        {selectedSponsorQr && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
                <div>
                  <h4 className="font-extrabold text-[#FFF9ED] text-base flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-400" />
                    <span>QR Oficial de Tienda Patrocinadora</span>
                  </h4>
                  <p className="text-xs text-stone-400">
                    {selectedSponsorQr.nombre} • {selectedSponsorQr.tipo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSponsorQr(null)}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const sponsorCheckinUrl = typeof window !== 'undefined'
                  ? `${window.location.origin}${window.location.pathname}?patrocinador=${selectedSponsorQr.id}`
                  : `https://tocuyo-burgerfest.com/?patrocinador=${selectedSponsorQr.id}`;

                return (
                  <div className="space-y-4">
                    <div className="p-6 rounded-2xl bg-[#FFF9ED] text-stone-950 flex flex-col items-center text-center space-y-3 shadow-xl border-2 border-amber-300">
                      <div className="text-[11px] font-black uppercase tracking-widest text-[#A40B03]">
                        FOOD FEST EL TOCUYO 2026 • TIENDA OFICIAL
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-stone-300 shadow-inner">
                        <QRCodeSVG
                          value={sponsorCheckinUrl}
                          size={180}
                          level="H"
                          includeMargin={true}
                        />
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-black text-stone-900 text-base">
                          {selectedSponsorQr.nombre}
                        </div>
                        <div className="text-xs text-amber-900 font-bold">
                          Punto Oficial de Facturación y Compras
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-3.5 py-1 rounded-full">
                        Escanea para registrar factura de compra
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-black border border-stone-800 font-mono text-[11px] text-stone-400 break-all select-all">
                        {sponsorCheckinUrl}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(sponsorCheckinUrl);
                            setCopiedSponsorUrl(true);
                            setTimeout(() => setCopiedSponsorUrl(false), 2500);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black border border-stone-800 hover:border-amber-400/60 text-stone-200 font-bold transition-all text-xs cursor-pointer"
                        >
                          {copiedSponsorUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                          <span>{copiedSponsorUrl ? 'Copiado' : 'Copiar Enlace'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black transition-all text-xs border border-amber-300 shadow-md cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-stone-950" />
                          <span>Imprimir QR Tienda</span>
                        </button>
                      </div>

                      <a
                        href={sponsorCheckinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 hover:bg-stone-900 text-stone-400 hover:text-stone-200 text-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Módulo de Registro en Pestaña Nueva</span>
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* MODAL: VISOR DE FACTURA COMPLETA */}
        {selectedAuditImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <div className="bg-[#0F0F0F] border border-stone-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FFF9ED]">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Comprobante de Factura Oficial</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAuditImage(null)}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-black/60 min-h-[300px]">
                <img
                  src={selectedAuditImage}
                  alt="Factura completa"
                  className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg border border-stone-800"
                />
              </div>
              <div className="p-3 border-t border-stone-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAuditImage(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar Visor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
