import React from 'react';
import { Flame, ShieldCheck, Heart, MapPin, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="bg-stone-950 border-t border-stone-900 py-12 text-stone-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md text-stone-950">
              <Flame className="w-5 h-5 fill-stone-950" />
            </div>
            <div>
              <div className="font-extrabold text-stone-100 text-base font-['Cabinet_Grotesk',sans-serif]">
                BURGER FEST <span className="text-amber-500">EL TOCUYO</span>
              </div>
              <div className="text-[11px] text-stone-500">
                La Mejor Hamburguesa de la Ciudad Madre • Edición 2025
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-stone-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              El Tocuyo, Municipio Morán, Estado Lara
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Votación Criptográfica & Antifraude
            </span>
          </div>

        </div>

        <div className="pt-6 border-t border-stone-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} Festival Gastronómico El Tocuyo. Todos los derechos reservados.
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-stone-400">
              <span>Hecho con orgullo y tradición tocuyana</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            </div>

            {/* Discreet Admin Portal Access Link */}
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 text-stone-500 hover:text-amber-400 transition-colors px-2 py-1 rounded-lg border border-transparent hover:border-stone-800"
              title="Portal de Gestión para el Comité Organizador"
            >
              <Lock className="w-3 h-3" />
              <span>Acceso Comité / Admin</span>
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
