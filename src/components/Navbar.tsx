import React, { useState } from 'react';
import { Flame, Sparkles, LogOut, UserCheck } from 'lucide-react';
import logoBlanco from '../img/logo blanco.svg';
import { UsuarioAuth } from '../types';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  currentUser?: UsuarioAuth | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

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

          {/* Customer Action CTA & Auth Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Session Profile / Quick Login */}
            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-emerald-500/50 transition-all cursor-pointer"
                  title="Ver perfil de comensal"
                >
                  {currentUser.photoURL && !avatarError ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || ''} 
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full border border-emerald-500/50 object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#A40B03] text-[#FFF9ED] text-xs font-bold flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-semibold text-[#FFF9ED] max-w-[90px] truncate">
                    {currentUser.displayName?.split(' ')[0] || 'Cuenta'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0F0F0F] border border-stone-800 shadow-2xl p-3 z-50 space-y-2">
                    <div className="border-b border-stone-800/80 pb-2">
                      <p className="text-xs font-bold text-[#FFF9ED] truncate">{currentUser.displayName}</p>
                      <p className="text-[10px] text-stone-400 font-mono truncate">{currentUser.email}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                        <UserCheck className="w-3 h-3" />
                        <span>Comensal Verificado</span>
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full py-2 px-2.5 rounded-xl text-left text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                )}
              </div>
            ) : onLogin ? (
              <button
                type="button"
                onClick={onLogin}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-300 hover:text-[#FFF9ED] bg-stone-900/80 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 transition-all cursor-pointer"
                title="Iniciar sesión con Google"
              >
                {/* Google Icon */}
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Acceder</span>
              </button>
            ) : null}

            <button
              onClick={() => onNavigate('hamburguesas')}
              className="relative inline-flex items-center justify-center gap-0 sm:gap-2 p-3 sm:px-5 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-[#FFF9ED] bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] border border-[#A40B03]/50 shadow-md shadow-[#A40B03]/30 hover:shadow-lg hover:shadow-[#A40B03]/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
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
