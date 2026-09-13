import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Restaurante, CriteriosVoto, CodigoVoto } from '../types';
import { VotingEngine } from '../services/votingEngine';
import { 
  X, 
  ShieldCheck, 
  Star, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  QrCode, 
  KeyRound, 
  Flame, 
  MessageSquare, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantes: Restaurante[];
  preSelectedRestauranteId?: string;
  onVoteSuccess: () => void;
}

export const VoteModal: React.FC<VoteModalProps> = ({
  isOpen,
  onClose,
  restaurantes,
  preSelectedRestauranteId,
  onVoteSuccess,
}) => {
  const [restauranteId, setRestauranteId] = useState<string>('');
  const [codigoInput, setCodigoInput] = useState<string>('');
  const [ratingGeneral, setRatingGeneral] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [criterios, setCriterios] = useState<CriteriosVoto>({
    saborCarne: 5,
    calidadPan: 5,
    salsasYToppings: 5,
    creatividad: 5,
  });
  const [comentario, setComentario] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ votoId: string; message: string } | null>(null);

  // Available demo codes for easy tester convenience
  const [demoCodes, setDemoCodes] = useState<CodigoVoto[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRestauranteId(preSelectedRestauranteId || restaurantes[0]?.id || '');
      setErrorMessage(null);
      setSuccessInfo(null);
      setDemoCodes(VotingEngine.getCodigos());
    }
  }, [isOpen, preSelectedRestauranteId, restaurantes]);

  const selectedRestaurante = restaurantes.find((r) => r.id === restauranteId);

  const handleRatingCriterion = (key: keyof CriteriosVoto, val: number) => {
    setCriterios((prev) => ({ ...prev, [key]: val }));
  };

  const handleApplyDemoCode = (code: string, restId: string) => {
    setCodigoInput(code);
    setRestauranteId(restId);
    setErrorMessage(null);
  };

  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoInput.trim()) {
      setErrorMessage('Por favor ingresa el código de votación proporcionado por el restaurante.');
      return;
    }

    if (!restauranteId) {
      setErrorMessage('Por favor selecciona el restaurante que estás evaluando.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await VotingEngine.executeAtomicVoteTransaction({
        codigoRaw: codigoInput,
        restauranteId,
        ratingGeneral,
        criterios,
        comentario,
      });

      setSuccessInfo({
        votoId: result.votoId || 'VOTO-CONFIRMADO',
        message: result.message,
      });
      onVoteSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error desconocido al validar el voto. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-xl rounded-3xl bg-stone-900 border border-amber-500/30 shadow-2xl shadow-black p-6 sm:p-8 text-stone-100 overflow-hidden"
      >
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-stone-950 text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors border border-stone-800"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!successInfo ? (
          <div>
            {/* Header */}
            <div className="space-y-1.5 pr-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Transacción Atómica Segura</span>
              </div>
              <h3 className="text-2xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif]">
                Emitir Voto Oficial
              </h3>
              <p className="text-xs sm:text-sm text-stone-400">
                Tu código único garantiza que tu voto sea computado de forma limpia y transparente.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitVote} className="mt-6 space-y-5">
              
              {/* Restaurant Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                  1. Hamburguesa a Calificar
                </label>
                <select
                  value={restauranteId}
                  onChange={(e) => {
                    setRestauranteId(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-100 text-sm font-semibold transition-all outline-none"
                >
                  {restaurantes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombreHamburguesa} — {r.nombre}
                    </option>
                  ))}
                </select>

                {selectedRestaurante && (
                  <div className="mt-2 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/80 flex items-center gap-3">
                    <img
                      src={selectedRestaurante.fotoUrl}
                      alt={selectedRestaurante.nombreHamburguesa}
                      className="w-10 h-10 rounded-lg object-cover border border-stone-700 shrink-0"
                    />
                    <div className="text-xs truncate">
                      <div className="font-bold text-stone-200 truncate">{selectedRestaurante.nombreHamburguesa}</div>
                      <div className="text-stone-400 truncate">{selectedRestaurante.direccion}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Code Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span>2. Código Alfanumérico del Mesero</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold">1 solo uso</span>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    value={codigoInput}
                    onChange={(e) => {
                      setCodigoInput(e.target.value.toUpperCase());
                      setErrorMessage(null);
                    }}
                    placeholder="EJ: TOCUYO-7X82-K"
                    maxLength={20}
                    className="w-full px-4 py-3.5 rounded-xl bg-stone-950 border border-stone-700 text-amber-400 font-mono font-bold text-base sm:text-lg tracking-widest uppercase focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-stone-600"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-mono">
                    {codigoInput.length > 0 && `${codigoInput.length}/20`}
                  </div>
                </div>

                {/* Quick Demo Codes for Testing / Verification */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-stone-950/80 border border-stone-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span className="font-semibold text-stone-300">Códigos demo para probar ahora:</span>
                    <button 
                      type="button" 
                      onClick={() => setDemoCodes(VotingEngine.getCodigos())}
                      className="hover:text-amber-400 flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Actualizar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {demoCodes.slice(0, 3).map((cd) => (
                      <button
                        key={cd.id}
                        type="button"
                        onClick={() => handleApplyDemoCode(cd.codigo, cd.restauranteId)}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition-all ${
                          cd.usado
                            ? 'bg-red-950/50 text-red-400 border border-red-900/50 line-through cursor-pointer'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                        title={cd.usado ? 'Código ya usado (probará rechazo antifraude)' : `Código válido para ${cd.restauranteNombre}`}
                      >
                        {cd.codigo} {cd.usado ? '(Ya usado)' : '(Válido)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5-Star General Rating */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-300">
                    3. Calificación Global (1 a 5 Estrellas)
                  </label>
                  <span className="text-sm font-black text-amber-400">
                    {ratingGeneral} de 5 Estrellas
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || ratingGeneral) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRatingGeneral(star)}
                        className="p-1 hover:scale-125 active:scale-95 transition-all text-stone-700"
                        aria-label={`Calificar con ${star} estrellas`}
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-stone-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Criteria Breakdown */}
                <div className="pt-3 border-t border-stone-800/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-stone-400 mb-1 flex justify-between">
                      <span>Sabor de la Carne</span>
                      <strong className="text-amber-400">{criterios.saborCarne}★</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={criterios.saborCarne}
                      onChange={(e) => handleRatingCriterion('saborCarne', Number(e.target.value))}
                      className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-stone-400 mb-1 flex justify-between">
                      <span>Pan & Textura</span>
                      <strong className="text-amber-400">{criterios.calidadPan}★</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={criterios.calidadPan}
                      onChange={(e) => handleRatingCriterion('calidadPan', Number(e.target.value))}
                      className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-stone-400 mb-1 flex justify-between">
                      <span>Salsas & Toppings</span>
                      <strong className="text-amber-400">{criterios.salsasYToppings}★</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={criterios.salsasYToppings}
                      onChange={(e) => handleRatingCriterion('salsasYToppings', Number(e.target.value))}
                      className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-stone-400 mb-1 flex justify-between">
                      <span>Creatividad</span>
                      <strong className="text-amber-400">{criterios.creatividad}★</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={criterios.creatividad}
                      onChange={(e) => handleRatingCriterion('creatividad', Number(e.target.value))}
                      className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Optional Comment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                  <span>4. Comentario u Opinión (Opcional)</span>
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="¿Qué te pareció el término de la carne, el toque de queso o la salsa especial?"
                  rows={2}
                  maxLength={300}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-red-300">Alerta de Seguridad / Validación:</strong>
                    <span>{errorMessage}</span>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl font-black text-sm text-stone-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 shadow-xl shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-stone-950" />
                    <span>Ejecutando Transacción Atómica Firestore...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-stone-950" />
                    <span>Confirmar y Enviar Voto Oficial</span>
                  </>
                )}
              </button>

            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="py-8 text-center space-y-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif]">
                ¡Voto Registrado con Éxito!
              </h3>
              <p className="text-sm text-stone-300 max-w-sm mx-auto">
                Tu evaluación para <strong className="text-amber-400">{selectedRestaurante?.nombreHamburguesa}</strong> ha sido verificada y sumada al Leaderboard en tiempo real.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-xs font-mono space-y-1.5 max-w-sm mx-auto text-left">
              <div className="flex justify-between text-stone-400">
                <span>Código Consumido:</span>
                <span className="text-amber-400 font-bold">{codigoInput}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Hash Transacción:</span>
                <span className="text-stone-300">{successInfo.votoId}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Estado en Firestore:</span>
                <span className="text-emerald-400 font-bold">usado: true (Atómico)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-sm hover:bg-amber-400 transition-all shadow-lg"
            >
              Volver al Festival
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
};
