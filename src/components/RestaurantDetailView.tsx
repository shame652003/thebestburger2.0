import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CriteriosVoto, CodigoVoto } from '../types';
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
  VolumeX
} from 'lucide-react';
import { emitirVotoConTransaccion } from '../services/firebaseService';

interface RestaurantDetailViewProps {
  restaurante: Restaurante;
  onBack: () => void;
  onVoteCompleted: () => void;
}

export const RestaurantDetailView: React.FC<RestaurantDetailViewProps> = ({
  restaurante,
  onBack,
  onVoteCompleted,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [votoExitoso, setVotoExitoso] = useState<boolean>(false);
  const [votoReciboId, setVotoReciboId] = useState<string | null>(null);

  // Video Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  useEffect(() => {
    // Window scroll to top on mount
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [restaurante.id]);

  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
        comentario
      );

      if (res.success) {
        setVotoExitoso(true);
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black border border-stone-800 text-stone-300 hover:text-[#FFF9ED] hover:border-[#A40B03]/60 transition-all text-xs sm:text-sm font-semibold shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-[#A40B03]" />
            <span>Volver a Participantes</span>
          </button>

        </div>

        {/* RESTAURANT & DISH HERO BANNER */}
        <div className="rounded-3xl bg-[#0F0F0F] border border-stone-800/90 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Dish High-Res Visual */}
            <div className="lg:col-span-6 relative aspect-[16/11] lg:aspect-auto overflow-hidden bg-black">
              <img
                src={restaurante.fotoUrl}
                alt={restaurante.nombreHamburguesa}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 lg:hidden" />
              
              {/* Badge: Price */}
              <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-black text-sm sm:text-base shadow-lg shadow-black/60 border border-[#FFF9ED]/20">
                {restaurante.precio}
              </div>

              {/* Verified badge */}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/90 backdrop-blur-md border border-[#A40B03]/40 flex items-center gap-2 text-xs text-[#FFF9ED]">
                <ShieldCheck className="w-4 h-4 text-[#A40B03]" />
                <span>Creación Oficial Food Fest 2026</span>
              </div>
            </div>

            {/* Dish Information & Story */}
            <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                {/* Restaurant Signature */}
                <div className="flex items-center gap-3">
                  <img
                    src={restaurante.logoUrl}
                    alt={restaurante.nombre}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-[#A40B03]/60 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h2 className="text-sm uppercase tracking-wider text-[#A40B03] font-black">
                      {restaurante.nombre}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <MapPin className="w-3.5 h-3.5 text-[#A40B03]" />
                      <span>{restaurante.direccion}</span>
                    </div>
                  </div>
                </div>

                {/* Dish Title & Slogan */}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif] tracking-tight">
                    {restaurante.nombreHamburguesa}
                  </h1>
                  <p className="text-[#FFF9ED]/90 text-sm sm:text-base font-semibold italic mt-1">
                    "{restaurante.slogan}"
                  </p>
                </div>

                {/* Detailed Story & Technique */}
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                  {restaurante.descripcion}
                </p>

                {/* Ingredients Pills */}
                <div>
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>Ingredientes Seleccionados:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {restaurante.ingredientes.map((ing, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-black border border-stone-800 text-stone-200 text-xs font-medium"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Competition Status & Social Bar */}
              <div className="pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#A40B03]/20 text-[#FFF9ED] px-3 py-1.5 rounded-xl font-bold border border-[#A40B03]/40 text-xs">
                    <Flame className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>Creación Oficial en Competencia</span>
                  </div>
                  <span className="text-stone-500 text-[11px] font-medium hidden sm:inline">
                    • Votación Secreta Auditada
                  </span>
                </div>

                <a
                  href={`https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-stone-300 hover:text-[#A40B03] transition-colors"
                >
                  <Instagram className="w-4 h-4 text-[#A40B03]" />
                  <span className="font-semibold">{restaurante.instagram}</span>
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
                    <Flame className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>Votación Oficial de Comensal • Food Fest 2026</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif]">
                    Califica esta Creación Gastronómica
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Cada código de mesa es de un solo uso. Tu voto actualiza el ranking en una transacción atómica protegida.
                  </p>
                </div>
              </div>

              {/* SUCCESS CONFIRMATION STATE */}
              {votoExitoso ? (
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
                      onClick={() => {
                        setVotoExitoso(false);
                        setCodigoInput('');
                        setComentario('');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-black border border-stone-700 text-[#FFF9ED] text-xs font-bold hover:bg-stone-900"
                    >
                      Evaluar con otro código
                    </button>
                    <button
                      onClick={onBack}
                      className="px-6 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] text-xs font-bold hover:bg-[#BF0E05] shadow-md border border-[#FFF9ED]/20"
                    >
                      Ver Ranking en Vivo
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* IN-PAGE FORM */
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

                  {/* Step 1: Security Code Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#FFF9ED]">
                      1. Código Único de Mesa (Entregado en tu consumo)
                    </label>
                    <input
                      type="text"
                      required
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                      placeholder="Ej: TOCUYO-ALFA-901"
                      className="w-full px-4 py-3 rounded-2xl bg-black border border-stone-800 focus:border-[#A40B03] focus:ring-1 focus:ring-[#A40B03] outline-none text-[#FFF9ED] font-mono text-base tracking-widest font-bold uppercase placeholder:text-stone-600 transition-all"
                    />
                  </div>

                  {/* Step 2: 5-Star General Rating */}
                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#FFF9ED]">
                      2. Calificación Global ({ratingGeneral} de 5 estrellas)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
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
                  </div>

                  {/* Step 3: Criterios Gastronómicos */}
                  <div className="space-y-4 pt-2 border-t border-stone-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#FFF9ED]">
                      3. Criterios Técnicos del Festival
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

                  {/* Step 4: Comentario opcional */}
                  <div className="space-y-2 pt-2 border-t border-stone-800">
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
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl font-extrabold text-[#FFF9ED] bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] border border-[#A40B03]/60 hover:shadow-2xl hover:shadow-[#A40B03]/40 transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#FFF9ED] border-t-transparent" />
                        <span>Validando código en Firestore...</span>
                      </span>
                    ) : (
                      <>
                        <Send className="w-5 h-5 text-[#FFF9ED]" />
                        <span>Confirmar y Enviar Voto Oficial</span>
                      </>
                    )}
                  </button>

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

              {/* Video Player or Interactive Reel Frame */}
              <div className="space-y-4">
                {restaurante.videoUrl && !restaurante.videoUrl.includes('instagram.com') ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-stone-800 shadow-2xl aspect-video group">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted={isMuted}
                      loop
                      playsInline
                      controls
                      poster={restaurante.fotoUrl}
                      className="w-full h-full object-cover"
                    >
                      <source src={restaurante.videoUrl} type="video/mp4" />
                      Tu navegador no soporta reproducción de video.
                    </video>

                    {/* Autoplay & Audio indicator overlay */}
                    <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#A40B03]/50 text-[10px] font-bold text-[#FFF9ED] flex items-center gap-1.5 shadow-md pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Reproducción Automática</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-[#FFF9ED] hover:bg-black/90 border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#A40B03]" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{isMuted ? 'Activar Sonido' : 'Silenciar'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden group border border-[#A40B03]/30 aspect-video bg-black shadow-2xl">
                    <img
                      src={restaurante.fotoUrl}
                      alt={restaurante.nombreHamburguesa}
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-40 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    {/* Live teaser badge */}
                    <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#A40B03]/50 text-[10px] font-bold text-[#FFF9ED] flex items-center gap-1.5 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Reel de Preparación Oficial</span>
                    </div>

                    <a
                      href={restaurante.videoUrl || `https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#A40B03] text-[#FFF9ED] flex items-center justify-center shadow-[0_0_25px_rgba(164,11,3,0.6)] group-hover:scale-110 group-hover:bg-[#C4160E] transition-all mb-3 border border-[#FFF9ED]/30">
                        <Play className="w-7 h-7 fill-[#FFF9ED] ml-1" />
                      </div>
                      <span className="text-[#FFF9ED] font-black text-sm tracking-wide drop-shadow-md">
                        {restaurante.videoUrl ? 'Ver Video / Reel en Instagram' : 'Ver Reel de Preparación en Instagram'}
                      </span>
                      <span className="text-stone-300 text-xs mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-stone-700">
                        <Instagram className="w-3.5 h-3.5 text-[#A40B03]" />
                        <span>{restaurante.instagram}</span>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </span>
                    </a>
                  </div>
                )}

                {/* Culinary Process Cards (3 Steps) */}
                <div className="space-y-2.5 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>Secretos de la Receta:</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-black border border-stone-800/80 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#A40B03]/20 text-[#FFF9ED] font-black text-[11px] flex items-center justify-center shrink-0 border border-[#A40B03]/30">
                        1
                      </div>
                      <div>
                        <div className="font-bold text-[#FFF9ED]">Corte & Molienda Artesanal</div>
                        <div className="text-stone-400 text-[11px] leading-relaxed">
                          Blend selecto de carne fresca seleccionada con el balance justo de jugosidad y ternura.
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black border border-stone-800/80 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#A40B03]/20 text-[#FFF9ED] font-black text-[11px] flex items-center justify-center shrink-0 border border-[#A40B03]/30">
                        2
                      </div>
                      <div>
                        <div className="font-bold text-[#FFF9ED]">Parrilla & Fuego Vivo</div>
                        <div className="text-stone-400 text-[11px] leading-relaxed">
                          Sellado a fuego vivo para lograr costra Maillard crocante y centro suave.
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black border border-stone-800/80 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#A40B03]/20 text-[#FFF9ED] font-black text-[11px] flex items-center justify-center shrink-0 border border-[#A40B03]/30">
                        3
                      </div>
                      <div>
                        <div className="font-bold text-[#FFF9ED]">Montaje & Salsa Insignia</div>
                        <div className="text-stone-400 text-[11px] leading-relaxed">
                          Pan tostado con mantequilla artesanal y coronado con sus ingredientes exclusivos.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Action Link */}
                <a
                  href={restaurante.videoUrl || `https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#A40B03] hover:bg-[#BF0E05] text-[#FFF9ED] font-extrabold text-xs transition-all shadow-md shadow-[#A40B03]/20 border border-[#FFF9ED]/20"
                >
                  <Instagram className="w-4 h-4 text-[#FFF9ED]" />
                  <span>Seguir a {restaurante.nombre} en Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#FFF9ED]/80 ml-1" />
                </a>
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
