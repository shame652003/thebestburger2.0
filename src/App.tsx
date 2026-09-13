import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Hero3D } from './components/Hero3D';
import { BurgersGallery } from './components/BurgersGallery';
import { LeaderboardAnonimo } from './components/LeaderboardAnonimo';
import { SponsorsSection } from './components/SponsorsSection';
import { RestaurantDetailView } from './components/RestaurantDetailView';
import { AdminPortalView } from './components/AdminPortalView';
import { Footer } from './components/Footer';
import { Restaurante, Patrocinador, EstadisticasEvento } from './types';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getRestaurantesFirebase, getStatsFirebase, getPatrocinadoresFirebase } from './services/firebaseService';

export type AppView = 'home' | 'restaurant' | 'admin';

export default function App() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [patrocinadores, setPatrocinadores] = useState<Patrocinador[]>([]);
  const [stats, setStats] = useState<EstadisticasEvento>({
    totalVotos: 0, totalCodigosGenerados: 0, totalCodigosUsados: 0, promedioGlobal: 0, intentosFraudeBloqueados: 0
  });

  // Views & Routing state
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);

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

  // Sync state from URL query parameters (e.g. ?restaurante=id or ?view=admin)
  const syncFromUrl = () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const restParam = params.get('restaurante');
    const viewParam = params.get('view');

    if (restParam) {
      setSelectedRestaurantId(restParam);
      setCurrentView('restaurant');
    } else if (viewParam === 'admin') {
      setCurrentView('admin');
      setSelectedRestaurantId(null);
    } else {
      setCurrentView('home');
      setSelectedRestaurantId(null);
    }
  };

  useEffect(() => {
    refreshData();
    syncFromUrl();

    // Handle browser Back / Forward buttons
    const handlePopState = () => {
      syncFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToHome = (targetSectionId?: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
    setCurrentView('home');
    setSelectedRestaurantId(null);

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
    <div className="min-h-screen w-full overflow-x-hidden bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-black">
      
      {/* SweetAlert-style Center Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl bg-stone-900 border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)] p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Glowing Background Effect */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/20 rounded-full blur-[40px]" />
              
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-4 relative z-10 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-black text-stone-100 font-['Cabinet_Grotesk',sans-serif] mb-2 relative z-10">
                ¡Éxito!
              </h3>
              
              <p className="text-stone-300 text-sm font-semibold relative z-10">
                {toastMessage}
              </p>

              <button 
                onClick={() => setToastMessage(null)}
                className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500 text-stone-950 font-bold text-sm w-full hover:bg-emerald-400 transition-colors relative z-10 shadow-lg shadow-emerald-500/20"
              >
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Public Navbar (shown on home and restaurant views, completely free of admin clutter) */}
      {currentView !== 'admin' && (
        <Navbar
          activeSection={activeSection}
          onNavigate={handleNavigateSection}
        />
      )}

      {/* VIEW 1: DEDICATED RESTAURANT DETAIL & DIRECT VOTING VIEW */}
      {currentView === 'restaurant' && currentRestaurant && (
        <RestaurantDetailView
          restaurante={currentRestaurant}
          onBack={() => navigateToHome('hamburguesas')}
          onVoteCompleted={handleVoteSuccess}
        />
      )}

      {/* Fallback if restaurant ID was invalid */}
      {currentView === 'restaurant' && !currentRestaurant && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <h2 className="text-xl font-bold text-stone-100">Restaurante no encontrado</h2>
          <p className="text-xs text-stone-400 max-w-md">
            El enlace escaneado no corresponde a una hamburguesa inscrita en la edición actual.
          </p>
          <button
            onClick={() => navigateToHome('hamburguesas')}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400"
          >
            Ver Todas las Hamburguesas
          </button>
        </div>
      )}

      {/* VIEW 2: DEDICATED PROTECTED ADMIN PORTAL (Requires Credentials) */}
      {currentView === 'admin' && (
        <AdminPortalView
          restaurantes={restaurantes}
          onRestaurantesUpdated={refreshData}
          onExitToPublic={() => navigateToHome('hero')}
        />
      )}

      {/* VIEW 3: MAIN PUBLIC FESTIVAL LANDING (Clients Only: Hero, Burgers, Leaderboard, Sponsors) */}
      {currentView === 'home' && (
        <main className="flex-1">
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
        <Footer onOpenAdmin={navigateToAdmin} />
      )}

    </div>
  );
}
