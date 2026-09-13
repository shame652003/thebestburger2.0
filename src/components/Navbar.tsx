import React from 'react';
import { Flame, QrCode, ShieldCheck, Trophy, Sparkles, KeyRound } from 'lucide-react';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-stone-950/85 border-b border-amber-500/20 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Branding */}
          <div 
            onClick={() => onNavigate('hero')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-300">
              <Flame className="w-7 h-7 text-stone-950 fill-stone-950 animate-pulse" />
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 opacity-30 blur-sm group-hover:opacity-75 transition-opacity" />
            </div>
            
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-100 flex items-center gap-1.5 font-['Cabinet_Grotesk',sans-serif]">
                BURGER FEST <span className="text-amber-500">EL TOCUYO</span>
              </span>
              <span className="text-[11px] font-medium tracking-wider uppercase text-stone-400">
                Concurso Gastronómico 2025
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {[
              { id: 'hero', label: 'Inicio' },
              { id: 'hamburguesas', label: 'Hamburguesas' },
              { id: 'ranking', label: 'Ranking Anónimo' },
              { id: 'patrocinadores', label: 'Patrocinadores' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeSection === item.id
                    ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30 shadow-inner'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-900/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Customer Action CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('hamburguesas')}
              className="relative inline-flex items-center justify-center gap-0 sm:gap-2 p-3 sm:px-5 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-stone-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Flame className="w-5 h-5 sm:w-4 sm:h-4 text-stone-950 fill-stone-950" />
              <span className="hidden sm:inline">Ver Hamburguesas & Votar</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
