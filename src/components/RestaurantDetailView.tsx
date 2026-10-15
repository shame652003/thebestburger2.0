import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CriteriosVoto, CodigoVoto, UsuarioAuth } from '../types';
import { 
  ArrowLeft, 
  Star,
  MapPin, 
  Instagram, 
  ShieldCheck, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  UtensilsCrossed, 
  Check,
  Send,
  Play,
  Film,
  ExternalLink,
  Award,
  Volume2,
  VolumeX,
  UserCheck,
  LogOut,
  Lock,
  Mail,
  Compass,
  RefreshCw,
  KeyRound,
  User,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  ShieldAlert,
  ShieldX
} from 'lucide-react';
import { 
  emitirVotoConTransaccion, 
  hasUserVotedForRestaurant, 
  loginWithGoogle, 
  loginWithGoogleRedirect,
  loginWithEmailAndPasswordFirebase,
  registerWithEmailAndPasswordFirebase,
  resetPasswordFirebase,
  logoutFirebase 
} from '../services/firebaseService';

interface RestaurantDetailViewProps {
  restaurante: Restaurante;
  onBack: () => void;
  onVoteCompleted: () => void;
  currentUser?: UsuarioAuth | null;
  onLogin?: () => Promise<any>;
  onLogout?: () => Promise<void>;
}

export const RestaurantDetailView: React.FC<RestaurantDetailViewProps> = ({
  restaurante,
  onBack,
  onVoteCompleted,
  currentUser,
  onLogin,
  onLogout,
}) => {
  // Form State
  const [codigoInput, setCodigoInput] = useState('');
  const [ratingGeneral, setRatingGeneral] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [criterios, setCriterios] = useState<CriteriosVoto>({
    saborCarne: 5,
    calidadPan: 5,
    salsasYToppings: 5,
    creatividad: 5,
  });
  const [comentario, setComentario] = useState('');

  // Status & Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [votoExitoso, setVotoExitoso] = useState<boolean>(false);
  const [votoReciboId, setVotoReciboId] = useState<string | null>(null);

  // Verification: 1 vote per user per restaurant
  const [yaVotoEnEsteRestaurante, setYaVotoEnEsteRestaurante] = useState(false);
  const [checkingVotoPrevio, setCheckingVotoPrevio] = useState(false);

  // Email & Password Auth State (Real Firebase Auth)
  const [mostrarEmailAuth, setMostrarEmailAuth] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nombreInput, setNombreInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Password Reset State
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Avatar Image load error fallback
  const [imgError, setImgError] = useState(false);

  // Video Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Analyze video URL type (Instagram Reel, YouTube, or direct MP4/WebM)
  const rawVideoUrl = (restaurante.videoUrl || '').trim();
  const tieneVideo = Boolean(rawVideoUrl);

  // Check Instagram Reel or Post
  const igMatch = rawVideoUrl.match(/(?:instagram\.com\/(?:reel|reels|p)\/)([A-Za-z0-9_-]+)/i);
  const igReelId = igMatch ? igMatch[1] : null;
  const isInstagramVideo = Boolean(igReelId);
  const instagramEmbedUrl = igReelId ? `https://www.instagram.com/reel/${igReelId}/embed/` : null;

  // Check YouTube Video or Shorts
  const ytMatch = rawVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/i);
  const ytId = ytMatch ? ytMatch[1] : null;
  const isYoutubeVideo = Boolean(ytId);
  const youtubeEmbedUrl = ytId 
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=1&playsinline=1&modestbranding=1&rel=0`
    : null;

  // Direct video file (MP4, WebM, etc.)
  const isDirectVideo = tieneVideo && !isInstagramVideo && !isYoutubeVideo;

  useEffect(() => {
    // Window scroll to top on mount
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [restaurante.id]);

  // Autoplay video loop muted without user effort when using direct video
  useEffect(() => {
    if (isDirectVideo && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = isMuted;
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Handled gracefully if browser restricts
        });
      }
    }
  }, [rawVideoUrl, isMuted, isDirectVideo]);

  // Check if current user already voted for this restaurant
  useEffect(() => {
    let isMounted = true;
    const verifyUserVote = async () => {
      if (currentUser?.uid && restaurante.id) {
        setCheckingVotoPrevio(true);
        const alreadyVoted = await hasUserVotedForRestaurant(currentUser.uid, restaurante.id, currentUser.email);
        if (isMounted) {
          setYaVotoEnEsteRestaurante(alreadyVoted);
          setCheckingVotoPrevio(false);
        }
      } else {
        if (isMounted) {
          setYaVotoEnEsteRestaurante(false);
          setCheckingVotoPrevio(false);
        }
      }
    };
    verifyUserVote();
    return () => { isMounted = false; };
  }, [currentUser?.uid, currentUser?.email, restaurante.id]);

  const handleGoogleLogin = async (useRedirect = false) => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      if (useRedirect) {
        await loginWithGoogleRedirect();
        return;
      }
      
      const res = await loginWithGoogle(false);
      if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setErrorMessage(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setAuthError('Por favor ingresa un correo electrónico válido (ej: nombre@dominio.com).');
      return;
    }

    if (!passwordInput || passwordInput.length < 6) {
      setAuthError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (emailAuthMode === 'register') {
        const res = await registerWithEmailAndPasswordFirebase(cleanEmail, passwordInput, nombreInput);
        if (!res.success && res.error) {
          setAuthError(res.error);
        } else {
          setMostrarEmailAuth(false);
          setEmailInput('');
          setPasswordInput('');
          setNombreInput('');
        }
      } else {
        const res = await loginWithEmailAndPasswordFirebase(cleanEmail, passwordInput);
        if (!res.success && res.error) {
          setAuthError(res.error);
        } else {
          setMostrarEmailAuth(false);
          setEmailInput('');
          setPasswordInput('');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error durante la autenticación.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetEmailSent(false);

    const cleanEmail = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setAuthError('Por favor ingresa un correo válido para enviarte el enlace de recuperación.');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await resetPasswordFirebase(cleanEmail);
      if (!res.success && res.error) {
        setAuthError(res.error);
      } else {
        setResetEmailSent(true);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error al enviar enlace de recuperación.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await logoutFirebase();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (restaurante.descalificado) {
      setErrorMessage('Este restaurante ha sido descalificado de la competición. No se permiten votos.');
      return;
    }

    if (!currentUser || !currentUser.uid) {
      setErrorMessage('Debes iniciar sesión con tu cuenta de Google / Gmail en el Paso 1 para poder votar.');
      return;
    }

    if (yaVotoEnEsteRestaurante) {
      setErrorMessage('Ya has emitido tu voto para este restaurante con tu cuenta. Solo se permite 1 voto por restaurante.');
      return;
    }

    const cleanCode = codigoInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Por favor ingresa el código alfanumérico impreso en tu comprobante de mesa.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await emitirVotoConTransaccion(
        cleanCode,
        restaurante.id,
        ratingGeneral,
        criterios,
        comentario,
        currentUser
      );

      if (res.success) {
        setVotoExitoso(true);
        setYaVotoEnEsteRestaurante(true);
        setVotoReciboId('VOTO-' + Math.floor(Math.random() * 90000 + 10000));
        onVoteCompleted();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el voto. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/60 backdrop-blur-[2px] text-[#FFF9ED] py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Breadcrumb & Back Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black border border-stone-800 text-stone-300 hover:text-[#FFF9ED] hover:border-[#A40B03]/60 transition-all text-xs sm:text-sm font-semibold shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#A40B03]" />
            <span>Volver a Participantes</span>
          </button>
        </div>

        {/* RESTAURANTE DESCALIFICADO - BANNER DE AUDITORÍA SUPERIOR */}
        {restaurante.descalificado && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-950 via-red-900/60 to-black border-2 border-red-600 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-7 h-7 text-red-500 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
                  Decisión de Auditoría • Food Fest 2026
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  PARTICIPANTE DESCALIFICADO DE LA COMPETICIÓN
                </h3>
                <p className="text-xs text-red-200 mt-0.5">
                  {restaurante.motivoDescalificacion || 'Este establecimiento ha sido descalificado por infringir las normativas oficiales del festival.'}
                </p>
              </div>
            </div>
            <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-black/70 border border-red-500/50 text-red-400 text-xs font-mono font-bold uppercase tracking-wider shrink-0">
              ⛔ Votación Bloqueada
            </div>
          </div>
        )}

        {/* RESTAURANT & DISH HERO BANNER - REDISEÑO DINÁMICO & ATRACTIVO */}
        <div className="rounded-3xl bg-gradient-to-br from-[#161616] via-[#0F0F0F] to-[#0A0A0A] border border-stone-800 hover:border-[#A40B03]/50 transition-all duration-500 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] group">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Dish High-Res Visual */}
            <div className="lg:col-span-6 relative aspect-[16/11] lg:aspect-auto overflow-hidden bg-black flex items-center justify-center">
              <img
                src={restaurante.fotoUrl}
                alt={restaurante.nombreHamburguesa}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30 lg:bg-gradient-to-r lg:from-transparent lg:via-black/20 lg:to-[#0F0F0F]/90" />
              
              {/* Badge: Price */}
              <div className="absolute top-4 left-4 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#A40B03] to-[#800701] text-[#FFF9ED] font-black text-sm sm:text-base shadow-xl shadow-black/80 border border-[#FFF9ED]/25 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#FFF9ED] animate-pulse" />
                <span>{restaurante.precio}</span>
              </div>

              {/* Verified badge */}
              <div className="absolute bottom-4 left-4 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-[#A40B03]/50 flex items-center gap-2 text-xs text-[#FFF9ED] shadow-lg">
                <ShieldCheck className="w-4 h-4 text-[#A40B03]" />
                <span className="font-semibold">Creación Oficial Food Fest 2026</span>
              </div>
            </div>

            {/* Dish Information & Story */}
            <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                {/* Restaurant Signature */}
                <div className="flex items-center gap-3.5 pb-2 border-b border-stone-800/80">
                  <div className="relative">
                    <img
                      src={restaurante.logoUrl}
                      alt={restaurante.nombre}
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-[#A40B03] shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#A40B03] border-2 border-black flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-[#FFF9ED]" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm uppercase tracking-wider text-[#A40B03] font-black flex items-center gap-1.5">
                      <span>{restaurante.nombre}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#A40B03]/20 border border-[#A40B03]/40 text-[#FFF9ED]">OFICIAL</span>
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#A40B03]" />
                      <span>{restaurante.direccion}</span>
                    </div>
                  </div>
                </div>

                {/* Dish Title & Slogan */}
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif] tracking-tight leading-tight">
                    {restaurante.nombreHamburguesa}
                  </h1>
                  <div className="mt-2.5 p-3 rounded-2xl bg-black/50 border border-stone-800/90 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#A40B03] shrink-0 mt-0.5" />
                    <p className="text-[#FFF9ED] text-xs sm:text-sm font-semibold italic">
                      "{restaurante.slogan}"
                    </p>
                  </div>
                </div>

                {/* Detailed Story & Technique */}
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                  {restaurante.descripcion}
                </p>

                {/* Ingredients Pills - Dynamic Chips */}
                <div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>Ingredientes & Toppings de Autor:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {restaurante.ingredientes.map((ing, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-stone-800 hover:border-[#A40B03]/60 text-stone-200 hover:text-[#FFF9ED] text-xs font-medium transition-all shadow-sm group/chip"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A40B03] group-hover/chip:scale-125 transition-transform" />
                        <span>{ing}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Competition Status & Social Bar */}
              <div className="pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#A40B03]/20 text-[#FFF9ED] px-3.5 py-1.5 rounded-xl font-bold border border-[#A40B03]/40 text-xs shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>En Concurso Oficial</span>
                  </div>
                  <span className="text-stone-500 text-[11px] font-medium hidden sm:inline">
                    • 1 Voto Por Comensal
                  </span>
                </div>

                <a
                  href={`https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-black border border-stone-800 hover:border-[#A40B03]/60 text-stone-300 hover:text-[#FFF9ED] transition-all font-semibold"
                >
                  <Instagram className="w-4 h-4 text-[#A40B03]" />
                  <span>{restaurante.instagram}</span>
                  <ExternalLink className="w-3 h-3 text-stone-500" />
                </a>
              </div>

            </div>

          </div>
        </div>

        {/* TWO-COLUMN WORKFLOW: 1. OFFICIAL VOTING STATION + 2. TABLE QR CODE GENERATOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMN 1: DEDICATED IN-PAGE VOTING FORM (NO MODAL) */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0F0F0F] border border-[#A40B03]/30 shadow-2xl relative overflow-hidden space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#A40B03]/20 text-[#FFF9ED] border border-[#A40B03]/40 text-xs font-bold uppercase mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>Votación Oficial Segura • 1 Voto Por Restaurante</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
                    Califica esta Creación Gastronómica
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Cada comensal puede votar 1 sola vez por restaurante con su cuenta de Google. Tu voto se registra de forma atómica y auditada.
                  </p>
                </div>
              </div>

              {/* FICHA DINÁMICA DE LA HAMBURGUESA EN LA ESTACIÓN DE VOTACIÓN */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-stone-950 via-[#141414] to-black border border-stone-800 hover:border-[#A40B03]/50 transition-all shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-2 border-[#A40B03]/60 shadow-lg shadow-black/80">
                  <img
                    src={restaurante.fotoUrl}
                    alt={restaurante.nombreHamburguesa}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-[#A40B03] text-[10px] font-black text-[#FFF9ED] shadow">
                    {restaurante.precio}
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#A40B03]">
                      {restaurante.nombre}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A40B03]/20 text-[#FFF9ED] border border-[#A40B03]/40 font-bold">
                      🍔 Creación a Calificar
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-[#FFF9ED]">
                    {restaurante.nombreHamburguesa}
                  </h4>
                  <p className="text-xs text-stone-400 italic line-clamp-1">
                    "{restaurante.slogan}"
                  </p>
                  
                  {/* Dynamic mini-chips */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                    {restaurante.ingredientes.slice(0, 4).map((ing, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-stone-300 font-medium"
                      >
                        {ing}
                      </span>
                    ))}
                    {restaurante.ingredientes.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-900 text-stone-500 font-semibold">
                        +{restaurante.ingredientes.length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CASE 0: RESTAURANTE DESCALIFICADO */}
              {restaurante.descalificado ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-red-950/40 via-black to-black border-2 border-red-600/60 text-center space-y-4 shadow-[0_0_30px_rgba(220,38,38,0.2)]"
                >
                  <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-400 border border-red-600/50 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                    <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950 border border-red-500/50 text-red-300 text-xs font-black uppercase tracking-wider mb-2">
                      <ShieldX className="w-3.5 h-3.5 text-red-400" />
                      Participación Suspendida
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                      Restaurante Descalificado
                    </h4>
                    <p className="text-xs sm:text-sm text-red-300/80 mt-2 max-w-md mx-auto">
                      Este participante ha sido retirado oficialmente del concurso por el Comité de Auditoría y Control de Calidad The Best Burger 2026.
                    </p>
                    {restaurante.motivoDescalificacion && (
                      <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-200/90 text-left max-w-md mx-auto">
                        <span className="font-bold text-red-400 block mb-0.5">Motivo del dictamen:</span>
                        {restaurante.motivoDescalificacion}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/60 border border-red-900/40 text-stone-400 text-xs max-w-md mx-auto">
                    El sistema de votación, emisión de códigos QR y evaluación sensorial se encuentra bloqueado para esta ficha.
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={onBack}
                      className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
                    >
                      ← Volver a la Galería de Hamburguesas
                    </button>
                  </div>
                </motion.div>
              ) : votoExitoso ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl bg-black border border-[#A40B03]/60 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-[#A40B03]/20 text-[#FFF9ED] border border-[#A40B03]/50 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(164,11,3,0.3)]">
                    <CheckCircle2 className="w-8 h-8 text-[#A40B03]" />
                  </div>

                  <div>
                    <h4 className="text-xl font-bold text-[#FFF9ED]">
                      ¡Tu Voto ha Sido Registrado!
                    </h4>
                    <p className="text-xs text-stone-400 mt-1">
                      Has evaluado exitosamente a <strong className="text-[#FFF9ED]">{restaurante.nombreHamburguesa}</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#141414] border border-stone-800 font-mono text-xs text-stone-300 inline-block">
                    <span>Recibo Criptográfico: </span>
                    <strong className="text-[#A40B03]">{votoReciboId}</strong>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={onBack}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] text-xs font-bold hover:bg-[#BF0E05] shadow-md border border-[#FFF9ED]/20"
                    >
                      Ver Ranking en Vivo
                    </button>
                  </div>
                </motion.div>
              ) : yaVotoEnEsteRestaurante && currentUser ? (
                /* CASE 2: USER ALREADY VOTED FOR THIS RESTAURANT */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 sm:p-8 rounded-2xl bg-stone-950 border border-emerald-500/40 text-center space-y-4 shadow-xl"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Voto ya emitido para este restaurante</span>
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
                      ¡Tu Voto ya fue Registrado!
                    </h4>
                    <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                      Tu cuenta <strong className="text-[#FFF9ED] font-mono">{currentUser.email}</strong> ya emitió su voto oficial para <strong className="text-[#FFF9ED]">{restaurante.nombreHamburguesa}</strong>.
                    </p>
                    <p className="text-xs text-stone-400 max-w-md mx-auto">
                      Para garantizar la transparencia, cada comensal solo puede votar una vez por restaurante. ¡Te invitamos a probar las creaciones de los demás restaurantes del Food Fest y evaluarlos con tu misma cuenta!
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={onBack}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#A40B03] to-[#BF0E05] text-[#FFF9ED] text-xs sm:text-sm font-extrabold hover:shadow-lg hover:shadow-[#A40B03]/40 transition-all border border-[#A40B03]/60 flex items-center justify-center gap-2"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Votar en Otros Restaurantes</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl bg-black border border-stone-800 text-stone-400 hover:text-stone-200 text-xs font-semibold hover:border-stone-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cambiar de Cuenta</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* CASE 3: INTERACTIVE 4-STEP VOTING FORM */
                <form onSubmit={handleSubmitVote} className="space-y-6">
                  
                  {/* Error banner */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Error de Votación: </strong>
                        <span>{errorMessage}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 1: AUTHENTICATION (GOOGLE AS PRIMARY, EMAIL/PASSWORD AS SECONDARY) */}
                  {!currentUser ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-950 via-stone-900/90 to-black border border-[#A40B03]/40 space-y-4 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-[#A40B03] flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            Paso 1 de 4 • Identificación de Comensal
                          </span>
                          <h4 className="text-base sm:text-lg font-bold text-[#FFF9ED] mt-1">
                            Inicia Sesión para Registrar tu Voto
                          </h4>
                          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                            Para garantizar la transparencia y la regla de <strong>1 voto por restaurante</strong>, identifícate antes de ingresar el código de mesa:
                          </p>
                        </div>
                      </div>

                      {/* PRIMARY OPTION: GOOGLE FAST TRACK (1-CLICK, ULTRA-RÁPIDO) */}
                      <div className="p-3 sm:p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Vía Rápida Oficial (Recomendada)
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">1 Clic • Sin Claves</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleGoogleLogin(false)}
                          disabled={isLoggingIn}
                          className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-extrabold text-sm flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                        >
                          {/* Official Google G Logo */}
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                          </svg>
                          <span>{isLoggingIn ? 'Conectando con Google...' : 'Continuar con Google'}</span>
                        </button>
                        <p className="text-[11px] text-stone-400 text-center">
                          Tu sesión queda guardada en tu teléfono para votar directamente en los demás restaurantes.
                        </p>
                      </div>

                      {/* DIVIDER */}
                      <div className="relative flex items-center justify-center my-2">
                        <div className="border-t border-stone-800 w-full" />
                        <span className="bg-stone-950 px-3 text-[11px] text-stone-500 font-semibold uppercase tracking-wider shrink-0">
                          O utiliza correo y contraseña
                        </span>
                        <div className="border-t border-stone-800 w-full" />
                      </div>

                      {/* SECONDARY OPTION TOGGLE: EMAIL & PASSWORD */}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setMostrarEmailAuth(!mostrarEmailAuth);
                            setAuthError(null);
                            setIsResettingPassword(false);
                            setResetEmailSent(false);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                            mostrarEmailAuth 
                              ? 'bg-stone-800 text-[#FFF9ED] border-stone-700' 
                              : 'bg-black hover:bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          <Mail className="w-4 h-4 text-[#A40B03]" />
                          <span>{mostrarEmailAuth ? 'Ocultar formulario de correo' : 'Acceder con Correo Electrónico y Contraseña'}</span>
                        </button>

                        {/* Collapsible Form */}
                        {mostrarEmailAuth && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 rounded-2xl bg-black border border-stone-800 space-y-4 mt-3"
                          >
                            {/* CASE A: PASSWORD RESET FORM */}
                            {isResettingPassword ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                                  <h5 className="text-xs font-bold text-[#FFF9ED] flex items-center gap-1.5">
                                    <KeyRound className="w-3.5 h-3.5 text-[#A40B03]" />
                                    Recuperar Contraseña
                                  </h5>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsResettingPassword(false);
                                      setResetEmailSent(false);
                                      setAuthError(null);
                                    }}
                                    className="text-[11px] text-stone-400 hover:text-[#FFF9ED] cursor-pointer"
                                  >
                                    Volver
                                  </button>
                                </div>

                                {resetEmailSent ? (
                                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs space-y-2">
                                    <p className="font-bold flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                      ¡Enlace de recuperación enviado!
                                    </p>
                                    <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                                      Revisa tu bandeja de entrada o spam en <strong>{emailInput}</strong>. Al hacer clic en el enlace podrás crear tu nueva clave e ingresar de inmediato.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsResettingPassword(false);
                                        setResetEmailSent(false);
                                      }}
                                      className="text-xs font-bold text-white underline pt-1 cursor-pointer"
                                    >
                                      Ir a Iniciar Sesión con mi nueva clave
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[11px] text-stone-400 leading-relaxed">
                                      Ingresa tu correo registrado y Firebase te enviará un enlace automático para restablecer tu contraseña en segundos:
                                    </p>

                                    {authError && (
                                      <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                        <span>{authError}</span>
                                      </div>
                                    )}

                                    <div className="relative">
                                      <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="tu.correo@ejemplo.com"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 focus:border-[#A40B03] outline-none text-xs text-[#FFF9ED] placeholder:text-stone-600 transition-all"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleResetPasswordSubmit}
                                      disabled={isSubmittingReset}
                                      className="w-full py-2.5 px-4 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] text-xs font-bold transition-all border border-[#A40B03]/60 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                      {isSubmittingReset ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              /* CASE B: LOGIN OR REGISTER FORM */
                              <div className="space-y-4">
                                {/* Tabs */}
                                <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEmailAuthMode('login');
                                      setAuthError(null);
                                    }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                      emailAuthMode === 'login'
                                        ? 'bg-[#A40B03] text-[#FFF9ED] shadow-sm'
                                        : 'text-stone-400 hover:text-stone-200'
                                    }`}
                                  >
                                    <LogIn className="w-3.5 h-3.5" />
                                    <span>Ya tengo cuenta</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEmailAuthMode('register');
                                      setAuthError(null);
                                    }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                      emailAuthMode === 'register'
                                        ? 'bg-[#A40B03] text-[#FFF9ED] shadow-sm'
                                        : 'text-stone-400 hover:text-stone-200'
                                    }`}
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Crear cuenta nueva</span>
                                  </button>
                                </div>

                                {authError && (
                                  <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    <span>{authError}</span>
                                  </div>
                                )}

                                <div className="space-y-3">
                                  {emailAuthMode === 'register' && (
                                    <div className="space-y-1">
                                      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                        Tu Nombre y Apellido
                                      </label>
                                      <div className="relative">
                                        <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                          type="text"
                                          value={nombreInput}
                                          onChange={(e) => setNombreInput(e.target.value)}
                                          placeholder="Ej: Carlos Pérez"
                                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 focus:border-[#A40B03] outline-none text-xs text-[#FFF9ED] placeholder:text-stone-600 transition-all"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                      Correo Electrónico
                                    </label>
                                    <div className="relative">
                                      <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="tu.correo@ejemplo.com"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 focus:border-[#A40B03] outline-none text-xs text-[#FFF9ED] placeholder:text-stone-600 transition-all"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <label className="font-bold uppercase tracking-wider text-stone-400">
                                        Contraseña
                                      </label>
                                      {emailAuthMode === 'login' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsResettingPassword(true);
                                            setAuthError(null);
                                          }}
                                          className="text-stone-400 hover:text-amber-400 underline decoration-stone-700 cursor-pointer text-[10px]"
                                        >
                                          ¿Olvidaste tu contraseña?
                                        </button>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <KeyRound className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                      <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-stone-900 border border-stone-800 focus:border-[#A40B03] outline-none text-xs text-[#FFF9ED] placeholder:text-stone-600 transition-all"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                                        tabIndex={-1}
                                      >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleEmailAuthSubmit}
                                  disabled={isSubmittingAuth}
                                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] hover:opacity-95 text-[#FFF9ED] text-xs font-bold transition-all border border-[#A40B03]/60 shadow-md cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                  {isSubmittingAuth ? (
                                    <span>Verificando con Firebase...</span>
                                  ) : emailAuthMode === 'register' ? (
                                    <>
                                      <UserPlus className="w-4 h-4" />
                                      <span>Crear Cuenta y Votar</span>
                                    </>
                                  ) : (
                                    <>
                                      <LogIn className="w-4 h-4" />
                                      <span>Iniciar Sesión y Continuar</span>
                                    </>
                                  )}
                                </button>

                                <div className="text-center pt-1">
                                  {emailAuthMode === 'login' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEmailAuthMode('register');
                                        setAuthError(null);
                                      }}
                                      className="text-[11px] text-stone-400 hover:text-[#FFF9ED] underline decoration-stone-700 cursor-pointer"
                                    >
                                      ¿Primera vez en el festival? Regístrate aquí
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEmailAuthMode('login');
                                        setAuthError(null);
                                      }}
                                      className="text-[11px] text-stone-400 hover:text-[#FFF9ED] underline decoration-stone-700 cursor-pointer"
                                    >
                                      ¿Ya creaste tu cuenta anteriormente? Inicia sesión aquí
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Fallback for in-app mobile browsers */}
                      <div className="pt-2 border-t border-stone-800/80 text-center">
                        <button
                          type="button"
                          onClick={() => handleGoogleLogin(true)}
                          className="text-[11px] text-stone-500 hover:text-stone-300 underline decoration-stone-700 hover:decoration-[#A40B03] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="w-3 h-3 text-[#A40B03]" />
                          <span>¿El navegador de Instagram o teléfono bloqueó la ventana? Probar con Redirección</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-3 min-w-0">
                        {currentUser.photoURL && !imgError ? (
                          <img 
                            src={currentUser.photoURL} 
                            alt={currentUser.displayName || ''} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full border border-emerald-500/40 shrink-0 object-cover shadow-sm"
                            onError={() => setImgError(true)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#A40B03] text-[#FFF9ED] font-bold flex items-center justify-center shrink-0 text-sm shadow-sm border border-[#A40B03]/60">
                            {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Paso 1: Identidad Verificada
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-[#FFF9ED] truncate">
                            {currentUser.displayName}
                          </p>
                          <p className="text-[11px] text-stone-400 font-mono truncate">
                            {currentUser.email}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3 py-1.5 rounded-lg bg-black border border-stone-800 text-stone-400 hover:text-stone-200 text-xs font-semibold hover:border-stone-700 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Cerrar sesión o cambiar de cuenta"
                      >
                        <LogOut className="w-3 h-3" />
                        <span className="hidden sm:inline">Cambiar</span>
                      </button>
                    </div>
                  )}

                  {/* Step 2: Security Code Input */}
                  <div className={`space-y-2 ${!currentUser ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#FFF9ED]">
                      2. Código Único de Mesa (Entregado con tu hamburguesa)
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!currentUser}
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                      placeholder={currentUser ? "Ej: TOCUYO-ALFA-901" : "Inicia sesión con Google para ingresar el código"}
                      className="w-full px-4 py-3 rounded-2xl bg-black border border-stone-800 focus:border-[#A40B03] focus:ring-1 focus:ring-[#A40B03] outline-none text-[#FFF9ED] font-mono text-base tracking-widest font-bold uppercase placeholder:text-stone-600 transition-all disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Step 3: 5-Star General Rating */}
                  <div className={`space-y-2 pt-2 border-t border-stone-800 ${!currentUser ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#FFF9ED]">
                      3. Calificación Global ({ratingGeneral} de 5 estrellas)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={!currentUser}
                          onClick={() => setRatingGeneral(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="p-2 transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                        >
                          <Star
                            className={`w-8 h-8 transition-colors ${
                              (hoverRating !== null ? star <= hoverRating : star <= ratingGeneral)
                                ? 'fill-[#A40B03] text-[#A40B03] drop-shadow-[0_0_8px_rgba(164,11,3,0.5)]'
                                : 'text-stone-700 hover:text-stone-500'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 font-bold text-lg text-[#FFF9ED] font-mono">
                        {ratingGeneral}.0
                      </span>
                    </div>

                    {/* Criterios Técnicos Gastronómicos */}
                    <div className="space-y-4 pt-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                        Criterios Técnicos del Festival
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Sabor de la Carne */}
                        <div className="p-3 rounded-xl bg-black border border-stone-800 space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-stone-300">
                            <span>Sabor & Punto del Plato</span>
                            <span className="text-[#A40B03] font-bold font-mono">{criterios.saborCarne}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={criterios.saborCarne}
                            onChange={(e) => setCriterios({ ...criterios, saborCarne: Number(e.target.value) })}
                            className="w-full accent-[#A40B03] cursor-pointer"
                          />
                        </div>

                        {/* Calidad del Pan */}
                        <div className="p-3 rounded-xl bg-black border border-stone-800 space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-stone-300">
                            <span>Textura & Presentación</span>
                            <span className="text-[#A40B03] font-bold font-mono">{criterios.calidadPan}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={criterios.calidadPan}
                            onChange={(e) => setCriterios({ ...criterios, calidadPan: Number(e.target.value) })}
                            className="w-full accent-[#A40B03] cursor-pointer"
                          />
                        </div>

                        {/* Salsas y Toppings */}
                        <div className="p-3 rounded-xl bg-black border border-stone-800 space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-stone-300">
                            <span>Salsas & Acompañamientos</span>
                            <span className="text-[#A40B03] font-bold font-mono">{criterios.salsasYToppings}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={criterios.salsasYToppings}
                            onChange={(e) => setCriterios({ ...criterios, salsasYToppings: Number(e.target.value) })}
                            className="w-full accent-[#A40B03] cursor-pointer"
                          />
                        </div>

                        {/* Creatividad */}
                        <div className="p-3 rounded-xl bg-black border border-stone-800 space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-stone-300">
                            <span>Creatividad & Toque Autóctono</span>
                            <span className="text-[#A40B03] font-bold font-mono">{criterios.creatividad}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={criterios.creatividad}
                            onChange={(e) => setCriterios({ ...criterios, creatividad: Number(e.target.value) })}
                            className="w-full accent-[#A40B03] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Comentario opcional */}
                  <div className={`space-y-2 pt-2 border-t border-stone-800 ${!currentUser ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                      4. Comentario u Opinión (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Comparte tu experiencia gourmet con el restaurante..."
                      className="w-full px-4 py-3 rounded-2xl bg-black border border-stone-800 focus:border-[#A40B03] focus:ring-1 focus:ring-[#A40B03] outline-none text-stone-200 text-xs sm:text-sm placeholder:text-stone-600 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  {!currentUser ? (
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin(false)}
                      disabled={isLoggingIn}
                      className="w-full py-4 rounded-2xl font-extrabold text-[#FFF9ED] bg-gradient-to-r from-stone-800 to-stone-900 border border-stone-700 hover:border-[#A40B03] transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                    >
                      <Lock className="w-5 h-5 text-[#A40B03]" />
                      <span>Inicia Sesión con Google para Votar</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-2xl font-extrabold text-[#FFF9ED] bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] border border-[#A40B03]/60 hover:shadow-2xl hover:shadow-[#A40B03]/40 transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#FFF9ED] border-t-transparent" />
                          <span>Verificando unicidad y guardando voto...</span>
                        </span>
                      ) : (
                        <>
                          <Send className="w-5 h-5 text-[#FFF9ED]" />
                          <span>Confirmar y Enviar Voto Oficial</span>
                        </>
                      )}
                    </button>
                  )}

                </form>
              )}

            </div>
          </div>

          {/* COLUMN 2: CÓMO SE PREPARA LA HAMBURGUESA (VIDEO / REEL SHOWCASE) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 sm:p-7 rounded-3xl bg-[#0F0F0F] border border-stone-800 shadow-xl space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-800">
                <div className="p-2 rounded-xl bg-[#A40B03]/15 text-[#A40B03] border border-[#A40B03]/30">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#FFF9ED] text-base flex items-center gap-2">
                    <span>Cómo se Prepara</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#A40B03]/20 text-[#FFF9ED] border border-[#A40B03]/40">
                      En Vivo
                    </span>
                  </h4>
                  <p className="text-xs text-stone-400">
                    El ritual artesanal de {restaurante.nombre}
                  </p>
                </div>
              </div>

              {/* Video Player or Interactive Instagram / YouTube Frame */}
              <div className="space-y-4">
                {isInstagramVideo && instagramEmbedUrl ? (
                  /* CASO 1: REEL OFICIAL DE INSTAGRAM EMBED */
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-[#A40B03]/40 shadow-2xl w-full min-h-[480px] sm:min-h-[520px] flex items-center justify-center">
                      <iframe
                        src={instagramEmbedUrl}
                        className="w-full min-h-[480px] sm:min-h-[520px] border-0 rounded-2xl bg-black"
                        scrolling="no"
                        allowFullScreen
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        title={`Reel de preparación de ${restaurante.nombre}`}
                      />
                    </div>

                    {/* Direct Action Link to Instagram */}
                    <a
                      href={rawVideoUrl || `https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#A40B03] to-[#800701] hover:from-[#BF0E05] hover:to-[#A40B03] text-[#FFF9ED] font-extrabold text-xs transition-all shadow-md shadow-[#A40B03]/20 border border-[#FFF9ED]/20"
                    >
                      <Instagram className="w-4 h-4 text-[#FFF9ED]" />
                      <span>Abrir Reel en Instagram Oficial</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#FFF9ED]/80 ml-1" />
                    </a>
                  </div>
                ) : isYoutubeVideo && youtubeEmbedUrl ? (
                  /* CASO 2: YOUTUBE / YOUTUBE SHORTS (AUTOPLAY EN BUCLE) */
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-[#A40B03]/40 shadow-2xl aspect-video w-full">
                      <iframe
                        src={youtubeEmbedUrl}
                        className="w-full h-full border-0 rounded-2xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`Video de preparación de ${restaurante.nombre}`}
                      />
                    </div>

                    <a
                      href={rawVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FFF9ED] font-bold text-xs transition-all border border-stone-800"
                    >
                      <Play className="w-4 h-4 text-red-500" />
                      <span>Ver Video en YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 ml-1" />
                    </a>
                  </div>
                ) : isDirectVideo ? (
                  /* CASO 3: VIDEO DIRECTO MP4 / WEBM (AUTOPLAY EN BUCLE SIN AUDIO) */
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-[#A40B03]/40 shadow-2xl aspect-video group">
                      <video
                        ref={videoRef}
                        src={rawVideoUrl}
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        preload="auto"
                        poster={restaurante.fotoUrl}
                        className="w-full h-full object-cover"
                      >
                        Tu navegador no soporta reproducción directa de video.
                      </video>

                      {/* Autoplay & Audio indicator overlay */}
                      <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-[#A40B03]/50 text-[10px] font-bold text-[#FFF9ED] flex items-center gap-1.5 shadow-md pointer-events-none">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>{isMuted ? 'Sin Audio (Silenciado)' : 'Sonido Activado'}</span>
                      </div>

                      {/* Floating Quick Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            const nextState = !isMuted;
                            videoRef.current.muted = nextState;
                            if (!nextState) videoRef.current.volume = 1.0;
                            setIsMuted(nextState);
                          }
                        }}
                        className={`absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer border ${
                          isMuted 
                            ? 'bg-black/85 text-[#FFF9ED] hover:bg-black border-stone-700 hover:border-[#A40B03]' 
                            : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                        }`}
                      >
                        {isMuted ? (
                          <>
                            <VolumeX className="w-4 h-4 text-[#A40B03]" />
                            <span>Activar Sonido</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            <span>Silenciar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* DEDICATED AUDIO CONTROL STRIP */}
                    <div className="p-3 rounded-xl bg-black border border-stone-800/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-[#A40B03]" />
                        <span className="text-stone-300 font-medium text-xs">
                          {isMuted ? 'El video se reproduce sin audio por defecto' : 'Audio en reproducción'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            const nextState = !isMuted;
                            videoRef.current.muted = nextState;
                            if (!nextState) videoRef.current.volume = 1.0;
                            setIsMuted(nextState);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isMuted
                            ? 'bg-[#A40B03]/20 hover:bg-[#A40B03] text-[#FFF9ED] border-[#A40B03]/40'
                            : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-700'
                        }`}
                      >
                        {isMuted ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-[#FFF9ED]" />
                            <span>Activar Volumen</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                            <span>Silenciar Video</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Direct Action Link to Instagram */}
                    <a
                      href={`https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#A40B03] to-[#800701] hover:from-[#BF0E05] hover:to-[#A40B03] text-[#FFF9ED] font-extrabold text-xs transition-all shadow-md shadow-[#A40B03]/20 border border-[#FFF9ED]/20"
                    >
                      <Instagram className="w-4 h-4 text-[#FFF9ED]" />
                      <span>Ver más y seguir a {restaurante.nombre} en Instagram</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#FFF9ED]/80 ml-1" />
                    </a>
                  </div>
                ) : (
                  /* CASO 4: SI NO TIENE VIDEO REGISTRADO: MOSTRAR IMAGEN Y PROMOCIÓN PARA SEGUIR EN INSTAGRAM */
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border border-[#A40B03]/40 shadow-2xl bg-black group">
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={restaurante.fotoUrl}
                          alt={restaurante.nombreHamburguesa}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-65"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />

                        {/* Instagram Brand Badge */}
                        <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-gradient-to-r from-[#833ab4]/90 via-[#fd1d1d]/90 to-[#fcb045]/90 text-white text-[10px] font-black tracking-wide flex items-center gap-1.5 shadow-lg border border-white/20">
                          <Instagram className="w-3 h-3 text-white" />
                          <span>Comunidad Instagram Oficial</span>
                        </div>

                        {/* Center message */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-2">
                          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-0.5 shadow-[0_0_20px_rgba(220,39,67,0.5)] group-hover:scale-110 transition-transform">
                            <div className="w-full h-full bg-black/90 rounded-[14px] flex items-center justify-center">
                              <Instagram className="w-6 h-6 text-[#FFF9ED]" />
                            </div>
                          </div>
                          <div>
                            <h5 className="text-base font-black text-[#FFF9ED] drop-shadow-md">
                              ¡Sigue a {restaurante.nombre}!
                            </h5>
                            <p className="text-xs text-stone-300 max-w-xs mx-auto drop-shadow-sm mt-0.5">
                              Descubre en Instagram sus historias del día a día, reels y apóyalos con tu voto y comentarios.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Details & Button */}
                      <div className="p-4 bg-[#0A0A0A] border-t border-stone-800 space-y-3">
                        <div className="flex items-center justify-between text-xs text-stone-300 px-1">
                          <span className="font-semibold text-stone-400">Cuenta de Instagram:</span>
                          <span className="font-bold text-[#A40B03] flex items-center gap-1">
                            <Instagram className="w-3.5 h-3.5" />
                            {restaurante.instagram}
                          </span>
                        </div>

                        <a
                          href={`https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 text-white font-extrabold text-xs transition-all shadow-md hover:shadow-lg border border-white/20 active:scale-[0.99]"
                        >
                          <Instagram className="w-4 h-4 text-white" />
                          <span>Seguir en Instagram @{restaurante.instagram.replace('@', '')}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Antifraud Guarantee Notice */}
            <div className="p-5 rounded-3xl bg-black border border-stone-800 text-xs space-y-2.5 text-stone-400">
              <div className="flex items-center gap-2 text-[#FFF9ED] font-bold">
                <ShieldCheck className="w-4 h-4 text-[#A40B03]" />
                <span>Garantía de Voto Transparente • Food Fest 2026</span>
              </div>
              <p className="leading-relaxed">
                El sistema valida en microsegundos que el código pertenezca a la orden de <strong>{restaurante.nombre}</strong> y que no haya sido utilizado antes. Los votos dobles son bloqueados y registrados en auditoría.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
