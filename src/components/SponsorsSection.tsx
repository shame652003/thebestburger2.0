import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Patrocinador } from '../types';
import { Award, ExternalLink, Sparkles, Crown, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface SponsorsSectionProps {
  patrocinadores: Patrocinador[];
}

export const SponsorsSection: React.FC<SponsorsSectionProps> = ({ patrocinadores }) => {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.from('[data-sponsors-header]', {
        opacity: 0,
        y: 24,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 82%', once: true },
      });
      gsap.utils.toArray<HTMLElement>('[data-sponsor-item]').forEach((item, index) => {
        gsap.from(item, {
          opacity: 0,
          y: 34,
          scale: 0.98,
          duration: 0.75,
          delay: Math.min(index, 3) * 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 90%', once: true },
        });
      });
    }, sectionRef);
    return () => context.revert();
  }, [patrocinadores]);

  // Determine apex of the pyramid: explicit principal or first registered sponsor
  const mainSponsor = patrocinadores.find(p => p.esPrincipal || p.tipo === 'Principal') || patrocinadores[0];
  const secondarySponsors = mainSponsor 
    ? patrocinadores.filter(p => p.id !== mainSponsor.id)
    : [];

  return (
    <section ref={sectionRef} id="patrocinadores" className="py-12 sm:py-20 bg-black/60 backdrop-blur-[2px] border-t border-stone-900/80 scroll-mt-20 relative overflow-hidden">
      {/* Ambient glowing spotlight for the apex */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-80 sm:w-[500px] h-80 bg-[#A40B03]/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div data-sponsors-header className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A40B03]/15 border border-[#A40B03]/40 text-[#FFF9ED] text-xs font-bold uppercase tracking-wider mb-3 shadow-md">
            <Award className="w-3.5 h-3.5 text-[#A40B03]" />
            <span>Alianzas Comerciales • Food Fest 2026</span>
          </div>
          <h2 className="font-display text-4xl sm:text-6xl font-normal text-[#FFF9ED] tracking-wide leading-[1.02] [text-shadow:0_4px_24px_rgba(0,0,0,0.85)]">
            Patrocinadores Oficiales
          </h2>
          <p className="text-stone-400 text-sm sm:text-base mt-2">
            Agradecemos a las marcas que hacen posible la fiesta gastronómica más importante de El Tocuyo.
          </p>
        </div>

        {/* SI NO HAY PATROCINADORES REGISTRADOS */}
        {patrocinadores.length === 0 ? (
          <div className="text-center py-12 p-8 rounded-3xl bg-[#0F0F0F] border border-stone-800 max-w-md mx-auto">
            <Crown className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <h4 className="font-display text-2xl font-normal tracking-wide text-[#FFF9ED]">Sé el Patrocinador Oficial de la Gran Gala</h4>
            <p className="text-xs text-stone-400 mt-1">
              Las marcas aliadas serán anunciadas aquí con su logotipo y presencia destacada.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* 1. CÚSPIDE DE LA PIRÁMIDE: PATROCINADOR OFICIAL PRINCIPAL */}
            {mainSponsor && (
              <div data-sponsor-item className="max-w-3xl mx-auto will-change-transform">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#A40B03] text-[#FFF9ED] border border-[#FFF9ED]/30 text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(164,11,3,0.6)] animate-pulse">
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span>Patrocinador Oficial Principal • Presentador Exclusivo</span>
                  </div>
                </div>

                <div className="relative rounded-3xl bg-gradient-to-b from-[#1E0706] via-[#120F0E] to-[#0A0A0A] border-2 border-[#A40B03] p-8 sm:p-10 shadow-[0_0_50px_rgba(164,11,3,0.45)] flex flex-col sm:flex-row items-center gap-6 sm:gap-8 transition-all hover:scale-[1.01]">
                  
                  {/* Glowing Logo */}
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-black border-2 border-[#FFF9ED]/30 p-2 shrink-0 flex items-center justify-center shadow-2xl relative group">
                    <img
                      src={mainSponsor.logoUrl}
                      alt={mainSponsor.nombre}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -top-2 -right-2 p-1.5 rounded-full bg-[#A40B03] text-[#FFF9ED] border border-amber-300 shadow-md">
                      <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="inline-block px-3 py-1 rounded-lg bg-[#A40B03]/25 border border-[#A40B03]/50 text-[#FFF9ED] text-[11px] font-black uppercase tracking-wider">
                      Cúspide de la Alianza Oficial
                    </div>

                    <h3 className="font-display text-3xl sm:text-4xl font-normal text-[#FFF9ED] tracking-wide [text-shadow:0_3px_18px_rgba(0,0,0,0.8)]">
                      {mainSponsor.nombre}
                    </h3>

                    <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                      {mainSponsor.descripcion || 'Marca líder que encabeza el apoyo al arte culinario y al turismo de El Tocuyo.'}
                    </p>

                    {mainSponsor.url && (
                      <div className="pt-2">
                        <a
                          href={mainSponsor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#FFF9ED] bg-[#A40B03] hover:bg-[#C4160E] px-4 py-2 rounded-xl font-bold transition-all shadow-md"
                        >
                          <span>Conocer Más de {mainSponsor.nombre}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* 2. BASE DE LA PIRÁMIDE: ALIADOS GOURMET & SECUNDARIOS */}
            {secondarySponsors.length > 0 && (
              <div className="space-y-6 pt-4">
                <div className="text-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                    Marcas Aliadas & Patrocinadores Oficiales
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                  {secondarySponsors.map((pat) => (
                    <div
                      key={pat.id}
                      data-sponsor-item
                      className="p-5 rounded-2xl bg-gradient-to-b from-[#181210] to-[#0C0C0C] border border-[#D6A44B]/20 hover:border-[#D6A44B]/45 transition-[border-color,box-shadow] duration-300 flex items-start gap-4 shadow-[0_14px_32px_rgba(0,0,0,0.45)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.65)] group will-change-transform"
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black shrink-0 border border-stone-800 group-hover:border-[#A40B03] transition-colors p-1 flex items-center justify-center">
                        <img
                          src={pat.logoUrl}
                          alt={pat.nombre}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            pat.tipo === 'Aliado Gourmet'
                              ? 'bg-[#FFF9ED]/10 text-[#FFF9ED] border border-[#FFF9ED]/30'
                              : 'bg-stone-800 text-stone-300'
                          }`}>
                            {pat.tipo || 'Aliado Oficial'}
                          </span>
                        </div>
                        <h4 className="font-display text-xl font-normal tracking-wide text-[#FFF9ED] group-hover:text-[#F3D49A] transition-colors truncate">
                          {pat.nombre}
                        </h4>
                        <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2">
                          {pat.descripcion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Sponsor Callout */}
        <div className="mt-14 text-center">
          <p className="text-xs text-stone-500">
            ¿Deseas que tu marca sea patrocinante de la Gran Gala Final del Food Fest 2026? Contáctanos a través de la comisión organizadora.
          </p>
        </div>

      </div>
    </section>
  );
};

