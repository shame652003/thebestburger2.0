import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Hero3D } from './components/Hero3D';
import { BurgersGallery } from './components/BurgersGallery';
import { LeaderboardAnonimo } from './components/LeaderboardAnonimo';
import { SponsorsSection } from './components/SponsorsSection';
import { RestaurantDetailView } from './components/RestaurantDetailView';
import { AdminPortalView } from './components/AdminPortalView';
import { SponsorCheckinView } from './components/SponsorCheckinView';
import { Footer } from './components/Footer';
import { LavaLampBackground } from './components/LavaLampBackground';
import { Restaurante, Patrocinador, EstadisticasEvento, UsuarioAuth } from './types';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  getRestaurantesFirebase, 
  getStatsFirebase, 
  getPatrocinadoresFirebase,
  loginWithGoogle,
  logoutFirebase,
  onAuthChange 
} from './services/firebaseService';

export type AppView = 'home' | 'restaurant' | 'admin' | 'sponsor_checkin';

export default function App() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [patrocinadores, setPatrocinadores] = useState<Patrocinador[]>([]);
  const [stats, setStats] = useState<EstadisticasEvento>({
    totalVotos: 0, totalCodigosGenerados: 0, totalCodigosUsados: 0, promedioGlobal: 0, intentosFraudeBloqueados: 0
  });

  // Current logged in Google user
  const [currentUser, setCurrentUser] = useState<UsuarioAuth | null>(null);

  // Views & Routing state
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | null>(null);

  // Active section tracker for public view
  const [activeSection, setActiveSection] = useState('hero');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = async () => {
    // 1. Obtener de Firebase
    const dataRestaurantes = await getRestaurantesFirebase();
    const dataStats = await getStatsFirebase();
    const dataPatrocinadores = await getPatrocinadoresFirebase();
    
    setRestaurantes(dataRestaurantes);
    setStats(dataStats);
    setPatrocinadores(dataPatrocinadores);
  };

  // Sync state from URL query parameters (e.g. ?restaurante=id, ?patrocinador=id o ?view=admin)
  const syncFromUrl = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const restParam = params.get('restaurante');
      const viewParam = params.get('view');
      const sponsorParam = params.get('patrocinador') || (viewParam === 'patrocinador' ? params.get('id') : null);

      if (sponsorParam) {
        setSelectedSponsorId(sponsorParam);
        setCurrentView('sponsor_checkin');
        setSelectedRestaurantId(null);
      } else if (restParam) {
        setSelectedRestaurantId(restParam);
        setCurrentView('restaurant');
        setSelectedSponsorId(null);
      } else if (viewParam === 'admin') {
        setCurrentView('admin');
        setSelectedRestaurantId(null);
        setSelectedSponsorId(null);
      } else {
        setCurrentView('home');
        setSelectedRestaurantId(null);
        setSelectedSponsorId(null);
      }
    }
  };

  useEffect(() => {
    refreshData();
    syncFromUrl();

    // Listen to Google Authentication status
    const unsubscribeAuth = onAuthChange((user) => {
      setCurrentUser(user);
    });

    // Handle browser Back / Forward buttons
    const handlePopState = () => {
      syncFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      unsubscribeAuth();
    };
  }, []);

  const navigateToHome = (targetSectionId?: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
    setCurrentView('home');
    setSelectedRestaurantId(null);
    setSelectedSponsorId(null);

    if (targetSectionId) {
      setTimeout(() => {
        setActiveSection(targetSectionId);
        if (targetSectionId === 'hero') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(targetSectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToRestaurant = (restaurantId: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `${window.location.pathname}?restaurante=${restaurantId}`);
    }
    setSelectedRestaurantId(restaurantId);
    setCurrentView('restaurant');
  };

  const navigateToAdmin = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `${window.location.pathname}?view=admin`);
    }
    setSelectedRestaurantId(null);
    setCurrentView('admin');
  };

  const handleNavigateSection = (sectionId: string) => {
    if (currentView !== 'home') {
      navigateToHome(sectionId);
      return;
    }

    setActiveSection(sectionId);
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleVoteSuccess = () => {
    refreshData();
    showToast('¡Voto verificado con éxito! Actualizado en el ranking atómico.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const currentRestaurant = restaurantes.find((r) => r.id === selectedRestaurantId);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-black text-[#FFF9ED] flex flex-col selection:bg-[#A40B03] selection:text-white relative">
      
      {/* Ambient 60fps Lava Lamp Background (Negro, Rojo & toques de Ámbar) */}
      <LavaLampBackground />
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl bg-[#0F0F0F] border border-[#A40B03]/50 shadow-[0_0_50px_rgba(164,11,3,0.3)] p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Glowing Background Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#A40B03]/20 rounded-full blur-[40px]" />
              
              <div className="w-16 h-16 rounded-full bg-[#A40B03]/20 text-[#FFF9ED] border border-[#A40B03]/40 flex items-center justify-center mb-4 relative z-10 shadow-[0_0_20px_rgba(164,11,3,0.4)] animate-pulse">
                <CheckCircle2 className="w-8 h-8 text-[#A40B03]" />
              </div>
              
              <h3 className="text-xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif] mb-2 relative z-10">
                ¡Éxito!
              </h3>
              
              <p className="text-stone-300 text-sm font-semibold relative z-10">
                {toastMessage}
              </p>

              <button 
                onClick={() => setToastMessage(null)}
                className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#A40B03] to-[#7A0802] text-[#FFF9ED] font-bold text-sm w-full hover:shadow-lg hover:shadow-[#A40B03]/30 transition-all relative z-10 border border-[#A40B03]/50"
              >
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Public Navbar (shown on all public views, completely free of admin clutter) */}
      {currentView !== 'admin' && (
        <Navbar
          activeSection={activeSection}
          onNavigate={handleNavigateSection}
          currentUser={currentUser}
          onLogin={async () => {
            const res = await loginWithGoogle();
            if (res.success && res.user) {
              showToast(`¡Bienvenido, ${res.user.displayName}! Has iniciado sesión.`);
            } else if (res.error) {
              showToast(res.error);
            }
          }}
          onLogout={async () => {
            await logoutFirebase();
            showToast('Has cerrado sesión correctamente.');
          }}
        />
      )}

      {/* VIEW 1: DEDICATED RESTAURANT DETAIL & DIRECT VOTING VIEW */}
      {currentView === 'restaurant' && currentRestaurant && (
        <div className="relative z-10">
          <RestaurantDetailView
            restaurante={currentRestaurant}
            onBack={() => navigateToHome('hamburguesas')}
            onVoteCompleted={handleVoteSuccess}
            currentUser={currentUser}
            onLogin={loginWithGoogle}
            onLogout={logoutFirebase}
          />
        </div>
      )}

      {/* Fallback if restaurant ID was invalid */}
      {currentView === 'restaurant' && !currentRestaurant && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4 relative z-10">
          <AlertCircle className="w-12 h-12 text-[#A40B03]" />
          <h2 className="text-xl font-bold text-[#FFF9ED]">Participante no encontrado</h2>
          <p className="text-xs text-stone-400 max-w-md">
            El enlace escaneado no corresponde a un restaurante inscrito en el Food Fest 2026.
          </p>
          <button
            onClick={() => navigateToHome('hamburguesas')}
            className="px-6 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] text-xs font-bold hover:bg-[#BF0E05] transition-all border border-[#A40B03]/40 shadow-md"
          >
            Ver Todos los Participantes
          </button>
        </div>
      )}

      {/* VIEW 2: DEDICATED PROTECTED ADMIN PORTAL (Requires Credentials) */}
      {currentView === 'admin' && (
        <div className="relative z-10">
          <AdminPortalView
            restaurantes={restaurantes}
            patrocinadores={patrocinadores}
            onRestaurantesUpdated={refreshData}
            onExitToPublic={() => navigateToHome('hero')}
          />
        </div>
      )}

      {/* VIEW 3: SPONSOR STORE CHECK-IN & INVOICE AUDIT (Store QR Scan) */}
      {currentView === 'sponsor_checkin' && (
        <div className="relative z-10 flex-1">
          {selectedSponsorId ? (
            <SponsorCheckinView
              patrocinadorId={selectedSponsorId}
              patrocinadores={patrocinadores}
              restaurantes={restaurantes}
              onBackToHome={() => navigateToHome('hero')}
            />
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-[#A40B03]" />
              <h2 className="text-xl font-bold text-[#FFF9ED]">Código QR de Tienda Requerido</h2>
              <p className="text-xs text-stone-400 max-w-md">
                Debes escanear el código QR ubicado en la tienda del patrocinador oficial para registrar tus compras.
              </p>
              <button
                onClick={() => navigateToHome('patrocinadores')}
                className="px-6 py-2.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] text-xs font-bold hover:bg-[#BF0E05] transition-all border border-[#A40B03]/40 shadow-md cursor-pointer"
              >
                Ver Patrocinadores Oficiales
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: MAIN PUBLIC FESTIVAL LANDING (Clients Only: Hero, Burgers, Leaderboard, Sponsors) */}
      {currentView === 'home' && (
        <main className="flex-1 relative z-10">
          {/* 1. Hero Presentation Section */}
          <div id="hero">
            <Hero3D
              onExploreBurgers={() => handleNavigateSection('hamburguesas')}
              totalVotos={stats.totalVotos}
            />
          </div>

          {/* 2. Participating Burgers Gallery */}
          <BurgersGallery
            restaurantes={restaurantes}
            onSelectRestaurant={navigateToRestaurant}
          />

          {/* 3. Anonymous Real-Time Leaderboard (Clients Only: strictly anonymous) */}
          <LeaderboardAnonimo
            restaurantes={restaurantes}
          />

          {/* 4. Official Sponsors */}
          <SponsorsSection patrocinadores={patrocinadores} />
        </main>
      )}

      {/* Global Consistent Footer (only on public customer views) */}
      {currentView !== 'admin' && (
        <div className="relative z-10">
          <Footer onOpenAdmin={navigateToAdmin} />
        </div>
      )}

    </div>
  );
}
