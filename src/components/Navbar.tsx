import React from 'react';
import { Flame, Sparkles } from 'lucide-react';
import logoBlanco from '../img/logo blanco.svg';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/90 border-b border-[#A40B03]/30 shadow-lg shadow-black/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Branding */}
          <div 
            onClick={() => onNavigate('hero')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center h-12 w-auto px-2 py-1 rounded-xl bg-gradient-to-br from-black via-stone-950 to-[#A40B03]/20 border border-[#A40B03]/40 shadow-md shadow-[#A40B03]/20 group-hover:border-[#A40B03] transition-all duration-300">
              <img 
                src={logoBlanco} 
                alt="Logo Food Fest 2026" 
                className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105 duration-300" 
              />
            </div>
            
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#FFF9ED] flex items-center gap-1.5 font-['Cabinet_Grotesk',sans-serif]">
                FOOD FEST <span className="text-[#A40B03] font-black">2026</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-stone-400">
                El Tocuyo • Edición Oficial
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {[
              { id: 'hero', label: 'Inicio' },
              { id: 'hamburguesas', label: 'Participantes' },
              { id: 'ranking', label: 'Ranking Anónimo' },
              { id: 'patrocinadores', label: 'Patrocinadores' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeSection === item.id
                    ? 'text-[#FFF9ED] bg-[#A40B03] border border-[#A40B03]/80 shadow-[0_0_15px_rgba(164,11,3,0.35)]'
                    : 'text-stone-300 hover:text-[#FFF9ED] hover:bg-stone-900/90'
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
              className="relative inline-flex items-center justify-center gap-0 sm:gap-2 p-3 sm:px-5 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-[#FFF9ED] bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] border border-[#A40B03]/50 shadow-md shadow-[#A40B03]/30 hover:shadow-lg hover:shadow-[#A40B03]/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Flame className="w-5 h-5 sm:w-4 sm:h-4 text-[#FFF9ED] fill-[#FFF9ED]" />
              <span className="hidden sm:inline">Explorar & Votar</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
