import React from 'react';
import { Flame, ShieldCheck, Heart, MapPin, Lock } from 'lucide-react';
import logoBlanco from '../img/logo blanco.svg';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="bg-black border-t border-[#A40B03]/20 py-12 text-stone-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-auto px-2 py-1 rounded-xl bg-black border border-[#A40B03]/40 shadow-md text-stone-950">
              <img src={logoBlanco} alt="Food Fest 2026" className="h-9 w-auto object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-[#FFF9ED] text-base font-['Cabinet_Grotesk',sans-serif]">
                FOOD FEST <span className="text-[#A40B03]">EL TOCUYO</span>
              </div>
              <div className="text-[11px] text-stone-500">
                La Fiesta Gastronómica de la Ciudad Madre • Edición 2026
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-stone-400">
            <span className="flex items-center gap-1 text-stone-300">
              <MapPin className="w-3.5 h-3.5 text-[#A40B03]" />
              El Tocuyo, Municipio Morán, Estado Lara
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-stone-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A40B03]" />
              Votación Criptográfica & Antifraude 2026
            </span>
          </div>

        </div>

        <div className="pt-6 border-t border-stone-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} Food Fest El Tocuyo 2026. Todos los derechos reservados.
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-stone-400">
              <span>Hecho con orgullo y tradición tocuyana</span>
              <Heart className="w-3.5 h-3.5 text-[#A40B03] fill-[#A40B03]" />
            </div>

            {/* Discreet Admin Portal Access Link */}
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 text-stone-400 hover:text-[#FFF9ED] hover:border-[#A40B03]/50 transition-colors px-2 py-1 rounded-lg border border-transparent"
              title="Portal de Gestión para el Comité Organizador"
            >
              <Lock className="w-3 h-3 text-[#A40B03]" />
              <span>Acceso Comité / Admin</span>
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
