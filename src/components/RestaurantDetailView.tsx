import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Restaurante, CriteriosVoto, CodigoVoto } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Instagram, 
  ShieldCheck, 
  Flame, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Printer, 
  Sparkles, 
  Clock, 
  UtensilsCrossed, 
  Check,
  Send
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
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Window scroll to top on mount
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [restaurante.id]);

  // Construct direct QR URL for this restaurant
  const directTableUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?restaurante=${restaurante.id}`
    : `https://tocuyo-burgerfest.com/?restaurante=${restaurante.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directTableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrintQR = () => {
    window.print();
  };

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
    <div className="min-h-screen bg-stone-950 text-stone-100 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Breadcrumb & Back Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900/90 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/40 transition-all text-xs sm:text-sm font-semibold shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Galería de Hamburguesas</span>
          </button>

        </div>

        {/* RESTAURANT & BURGER HERO BANNER */}
        <div className="rounded-3xl bg-stone-900/70 border border-stone-800/90 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Burger High-Res Visual */}
            <div className="lg:col-span-6 relative aspect-[16/11] lg:aspect-auto overflow-hidden bg-stone-950">
              <img
                src={restaurante.fotoUrl}
                alt={restaurante.nombreHamburguesa}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-black/30 lg:hidden" />
              
              {/* Badge: Price */}
              <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-black text-sm sm:text-base shadow-lg shadow-black/50">
                {restaurante.precio}
              </div>

              {/* Verified badge */}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-stone-950/90 backdrop-blur-md border border-stone-800 flex items-center gap-2 text-xs text-stone-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Hamburguesa Oficial Inscrita 2025</span>
              </div>
            </div>

            {/* Burger Information & Story */}
            <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                {/* Restaurant Signature */}
                <div className="flex items-center gap-3">
                  <img
                    src={restaurante.logoUrl}
                    alt={restaurante.nombre}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h2 className="text-sm uppercase tracking-wider text-amber-500 font-extrabold">
                      {restaurante.nombre}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <MapPin className="w-3.5 h-3.5 text-stone-500" />
                      <span>{restaurante.direccion}</span>
                    </div>
                  </div>
                </div>

                {/* Burger Title & Slogan */}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif] tracking-tight">
                    {restaurante.nombreHamburguesa}
                  </h1>
                  <p className="text-amber-400/90 text-sm sm:text-base font-semibold italic mt-1">
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
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ingredientes Seleccionados:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {restaurante.ingredientes.map((ing, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs font-medium"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats & Social Bar */}
              <div className="pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-amber-500 text-stone-950 px-2.5 py-1 rounded-lg font-black">
                    <Star className="w-3.5 h-3.5 fill-stone-950" />
                    <span>{restaurante.votosCount === 0 ? "0.00" : restaurante.promedioRating.toFixed(2)}</span>
                  </div>
                  <span className="text-stone-400">
                    ({restaurante.votosCount} comensales han calificado)
                  </span>
                </div>

                <a
                  href={`https://instagram.com/${restaurante.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-stone-300 hover:text-amber-400 transition-colors"
                >
                  <Instagram className="w-4 h-4 text-pink-500" />
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
            <div className="p-6 sm:p-8 rounded-3xl bg-stone-900/90 border border-amber-500/30 shadow-2xl relative overflow-hidden space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold uppercase mb-2">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Votación Oficial de Comensal</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif]">
                    Califica esta Hamburguesa
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
                  className="p-6 rounded-2xl bg-stone-950 border border-emerald-500/50 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-xl font-bold text-stone-100">
                      ¡Tu Voto ha Sido Registrado!
                    </h4>
                    <p className="text-xs text-stone-400 mt-1">
                      Has evaluado exitosamente a <strong className="text-amber-400">{restaurante.nombreHamburguesa}</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 font-mono text-xs text-stone-300 inline-block">
                    <span>Recibo Criptográfico: </span>
                    <strong className="text-emerald-400">{votoReciboId}</strong>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setVotoExitoso(false);
                        setCodigoInput('');
                        setComentario('');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs font-bold hover:bg-stone-800"
                    >
                      Evaluar con otro código
                    </button>
                    <button
                      onClick={onBack}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400 shadow-md"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                      1. Código Único de Mesa (Entregado por tu mesero)
                    </label>
                    <input
                      type="text"
                      required
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                      placeholder="Ej: TOCUYO-ALFA-901"
                      className="w-full px-4 py-3 rounded-2xl bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-amber-400 font-mono text-base tracking-widest font-bold uppercase placeholder:text-stone-600 transition-all"
                    />
                    
                  </div>

                  {/* Step 2: 5-Star General Rating */}
                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
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
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : 'text-stone-700 hover:text-stone-500'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 font-bold text-lg text-amber-400 font-mono">
                        {ratingGeneral}.0
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Criterios Gastronómicos */}
                  <div className="space-y-4 pt-2 border-t border-stone-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                      3. Criterios Técnicos del Festival
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sabor de la Carne */}
                      <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-stone-300">
                          <span>Sabor & Punto de la Carne</span>
                          <span className="text-amber-400 font-mono">{criterios.saborCarne}/5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={criterios.saborCarne}
                          onChange={(e) => setCriterios({ ...criterios, saborCarne: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Calidad del Pan */}
                      <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-stone-300">
                          <span>Calidad & Textura del Pan</span>
                          <span className="text-amber-400 font-mono">{criterios.calidadPan}/5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={criterios.calidadPan}
                          onChange={(e) => setCriterios({ ...criterios, calidadPan: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Salsas y Toppings */}
                      <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-stone-300">
                          <span>Salsas & Toppings</span>
                          <span className="text-amber-400 font-mono">{criterios.salsasYToppings}/5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={criterios.salsasYToppings}
                          onChange={(e) => setCriterios({ ...criterios, salsasYToppings: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Creatividad */}
                      <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-stone-300">
                          <span>Creatividad & Toque Tocuyano</span>
                          <span className="text-amber-400 font-mono">{criterios.creatividad}/5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={criterios.creatividad}
                          onChange={(e) => setCriterios({ ...criterios, creatividad: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
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
                      className="w-full px-4 py-3 rounded-2xl bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-stone-200 text-xs sm:text-sm placeholder:text-stone-600 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl font-extrabold text-stone-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-stone-950 border-t-transparent" />
                        <span>Validando código en Firestore...</span>
                      </span>
                    ) : (
                      <>
                        <Send className="w-5 h-5 text-stone-950" />
                        <span>Confirmar y Enviar Voto Oficial</span>
                      </>
                    )}
                  </button>

                </form>
              )}

            </div>
          </div>

          {/* COLUMN 2: QR TABLE CARD GENERATOR FOR PHYSICAL TABLES */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 sm:p-7 rounded-3xl bg-stone-900/80 border border-stone-800 shadow-xl space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-800">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-stone-100 text-base">
                    QR Oficial de Mesa
                  </h4>
                  <p className="text-xs text-stone-400">
                    Apunta a este restaurante directamente
                  </p>
                </div>
              </div>

              {/* Printable Table Card Visual */}
              <div className="p-5 rounded-2xl bg-white text-stone-950 flex flex-col items-center text-center space-y-3 shadow-md">
                <div className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                  BURGER FEST EL TOCUYO 2025
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <QRCodeSVG
                    value={directTableUrl}
                    size={170}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="font-black text-stone-900 text-sm">
                    {restaurante.nombreHamburguesa}
                  </div>
                  <div className="text-xs text-stone-600 font-semibold">
                    {restaurante.nombre}
                  </div>
                </div>

                <div className="text-[11px] font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                  Escanea para votar en tu mesa
                </div>
              </div>

              {/* URL & Action controls */}
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] text-stone-400 break-all select-all">
                  {directTableUrl}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/40 text-stone-200 font-bold transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintQR}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/40 text-stone-200 font-bold transition-all"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Imprimir Mesa</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Antifraud Guarantee Notice */}
            <div className="p-5 rounded-3xl bg-stone-950 border border-stone-800 text-xs space-y-2.5 text-stone-400">
              <div className="flex items-center gap-2 text-stone-200 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Garantía de Voto Transparente</span>
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
