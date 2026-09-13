import React from 'react';
import { motion } from 'motion/react';
import { Restaurante } from '../types';
import { X, QrCode, ArrowUpRight, Copy, Check, Printer, Sparkles, MapPin } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurante: Restaurante | null;
  onSimulateScan: (restauranteId: string) => void;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  restaurante,
  onSimulateScan,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !restaurante) return null;

  const targetUrl = `https://www.lamejorhamburguesadeltocuyo.app/votar?restaurante=${restaurante.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-3xl bg-stone-900 border border-amber-500/30 shadow-2xl p-6 text-stone-100 text-center space-y-5"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-stone-950 text-stone-400 hover:text-stone-100 border border-stone-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Material Físico para Mesas
          </span>
          <h3 className="text-xl font-black font-['Cabinet_Grotesk',sans-serif] text-stone-100 pt-1">
            QR Físico para {restaurante.nombre}
          </h3>
          <p className="text-xs text-stone-400">
            Este es el diseño que se imprime en los porta-menús y caballetes de mesa.
          </p>
        </div>

        {/* Printable Stand Card Preview */}
        <div className="p-6 rounded-2xl bg-white text-stone-900 shadow-xl space-y-4 border-4 border-amber-500 text-center">
          <div className="flex items-center justify-center gap-1.5 font-black text-xs tracking-wider uppercase text-amber-600">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Burger Fest El Tocuyo 2025</span>
          </div>

          <h4 className="text-lg font-black text-stone-950 leading-tight">
            {restaurante.nombreHamburguesa}
          </h4>

          {/* Stylized QR Code Representation */}
          <div className="w-44 h-44 mx-auto p-2 bg-stone-950 rounded-xl flex items-center justify-center relative shadow-inner">
            {/* SVG stylized QR code matrix */}
            <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-400">
              {/* Corner position markers */}
              <rect x="5" y="5" width="25" height="25" fill="#f59e0b" rx="2" />
              <rect x="10" y="10" width="15" height="15" fill="#0c0a09" />
              <rect x="14" y="14" width="7" height="7" fill="#f59e0b" />

              <rect x="70" y="5" width="25" height="25" fill="#f59e0b" rx="2" />
              <rect x="75" y="10" width="15" height="15" fill="#0c0a09" />
              <rect x="79" y="14" width="7" height="7" fill="#f59e0b" />

              <rect x="5" y="70" width="25" height="25" fill="#f59e0b" rx="2" />
              <rect x="10" y="75" width="15" height="15" fill="#0c0a09" />
              <rect x="14" y="79" width="7" height="7" fill="#f59e0b" />

              {/* Data pixel simulation */}
              <rect x="35" y="8" width="6" height="6" />
              <rect x="45" y="15" width="6" height="6" />
              <rect x="55" y="8" width="8" height="8" />
              <rect x="35" y="24" width="8" height="6" />
              <rect x="48" y="28" width="6" height="8" />

              <rect x="8" y="38" width="8" height="8" />
              <rect x="22" y="42" width="6" height="6" />
              <rect x="8" y="52" width="6" height="8" />

              <rect x="38" y="38" width="24" height="24" fill="#0c0a09" rx="4" />
              <circle cx="50" cy="50" r="8" fill="#f59e0b" />

              <rect x="70" y="38" width="8" height="6" />
              <rect x="84" y="44" width="6" height="8" />
              <rect x="72" y="54" width="8" height="8" />

              <rect x="36" y="70" width="6" height="8" />
              <rect x="48" y="74" width="8" height="6" />
              <rect x="60" y="80" width="8" height="8" />
              <rect x="75" y="72" width="6" height="6" />
              <rect x="85" y="80" width="8" height="8" />
            </svg>
          </div>

          <div className="text-[11px] text-stone-600 font-semibold leading-tight">
            1. Escanea con tu cámara • 2. Pide tu código al mesero • 3. ¡Vota al instante o llévatelo a casa!
          </div>
        </div>

        {/* Simulation Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              onClose();
              onSimulateScan(restaurante.id);
            }}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <span>Simular Escaneo y Abrir Votación Directa</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡URL Copiada al Portapapeles!' : 'Copiar URL de Votación del Local'}</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};
