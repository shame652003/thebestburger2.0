import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero3D } from './components/Hero3D';
import { BurgersGallery } from './components/BurgersGallery';
import { LeaderboardAnonimo } from './components/LeaderboardAnonimo';
import { SponsorsSection } from './components/SponsorsSection';
import { RestaurantDetailView } from './components/RestaurantDetailView';
import { AdminPortalView } from './components/AdminPortalView';
import { Footer } from './components/Footer';
import { Restaurante, Patrocinador, EstadisticasEvento } from './types';
import { VotingEngine } from './services/votingEngine';
import { PATROCINADORES_INICIALES } from './data/mockData';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export type AppView = 'home' | 'restaurant' | 'admin';

export default function App() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [patrocinadores] = useState<Patrocinador[]>(PATROCINADORES_INICIALES);
  const [stats, setStats] = useState<EstadisticasEvento>(VotingEngine.getStats());

  // Views & Routing state
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);

  // Active section tracker for public view
  const [activeSection, setActiveSection] = useState('hero');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = () => {
    setRestaurantes(VotingEngine.getRestaurantes());
    setStats(VotingEngine.getStats());
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
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Find currently selected restaurant if in restaurant view
  const currentRestaurant = restaurantes.find((r) => r.id === selectedRestaurantId);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-black">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-stone-900 border border-amber-500/50 shadow-2xl text-stone-100 text-xs sm:text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
