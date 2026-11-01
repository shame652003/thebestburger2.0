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

  // Determine apex of the pyramid: TWO "Patrocinador Oficial Principal" sponsors
  const principalSponsors = patrocinadores.filter(
    p => p.esPrincipal || p.tipo === 'Patrocinador Oficial Principal' || p.tipo === 'Principal'
  );

  let apexSponsors: Patrocinador[] = [];
  if (principalSponsors.length >= 2) {
    apexSponsors = principalSponsors.slice(0, 2);
  } else if (principalSponsors.length === 1) {
    apexSponsors = [principalSponsors[0]];
    const others = patrocinadores.filter(p => p.id !== principalSponsors[0].id);
    if (others.length > 0) {
      apexSponsors.push(others[0]);
    }
  } else if (patrocinadores.length > 0) {
    apexSponsors = patrocinadores.slice(0, Math.min(2, patrocinadores.length));
  }

  const apexIds = new Set(apexSponsors.map(p => p.id));
  const secondarySponsors = patrocinadores.filter(p => !apexIds.has(p.id));

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
            
            {/* 1. CÚSPIDE DE LA PIRÁMIDE: DOS PATROCINADORES OFICIALES PRINCIPALES */}
            {apexSponsors.length > 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#A40B03] text-[#FFF9ED] border border-amber-400/40 text-xs sm:text-sm font-black uppercase tracking-widest shadow-[0_0_25px_rgba(164,11,3,0.7)] animate-pulse">
                    <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{apexSponsors.length === 1 ? 'Patrocinador Oficial Principal' : 'Patrocinadores Oficiales Principales'}</span>
                    <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                  </div>
                </div>

                <div className={`grid gap-6 ${apexSponsors.length === 1 ? 'max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto'}`}>
                  {apexSponsors.map((pat) => (
                    <div
                      key={pat.id}
                      data-sponsor-item
                      className="relative rounded-3xl bg-gradient-to-b from-[#1E0706] via-[#120F0E] to-[#0A0A0A] border-2 border-[#A40B03] p-6 sm:p-8 shadow-[0_0_45px_rgba(164,11,3,0.45)] flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_0_60px_rgba(164,11,3,0.6)] group will-change-transform overflow-hidden"
                    >
                      {/* Ambient corner glow */}
                      <div className="absolute top-0 right-0 w-36 h-36 bg-[#A40B03]/25 rounded-full blur-2xl pointer-events-none group-hover:bg-[#A40B03]/40 transition-colors" />

                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 relative z-10">
                        {/* Glowing Logo */}
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black border-2 border-[#FFF9ED]/30 p-2 shrink-0 flex items-center justify-center shadow-2xl relative group-hover:border-amber-400/60 transition-colors">
                          <img
                            src={pat.logoUrl}
                            alt={pat.nombre}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -top-2 -right-2 p-1.5 rounded-full bg-[#A40B03] text-[#FFF9ED] border border-amber-300 shadow-md">
                            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                          </div>
                        </div>

                        {/* Brand Info */}
                        <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#A40B03]/30 border border-amber-400/40 text-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Patrocinador Oficial Principal</span>
                          </div>

                          <h3 className="font-display text-2xl sm:text-3xl font-normal text-[#FFF9ED] tracking-wide break-words leading-tight [text-shadow:0_3px_18px_rgba(0,0,0,0.8)]">
                            {pat.nombre}
                          </h3>

                          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed break-words">
                            {pat.descripcion || 'Marca líder que encabeza el apoyo al arte culinario y al turismo de El Tocuyo.'}
                          </p>
                        </div>
                      </div>

                      {/* URL Button if exists */}
                      {pat.url && (
                        <div className="pt-4 mt-4 border-t border-stone-800/80 flex justify-center sm:justify-start relative z-10">
                          <a
                            href={pat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#FFF9ED] bg-[#A40B03] hover:bg-[#C4160E] px-4 py-2 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:shadow-[#A40B03]/40"
                          >
                            <span>Conocer Más de {pat.nombre}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
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

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            pat.tipo === 'Aliado Gourmet'
                              ? 'bg-[#FFF9ED]/10 text-[#FFF9ED] border border-[#FFF9ED]/30'
                              : 'bg-stone-800 text-stone-300'
                          }`}>
                            {pat.tipo || 'Aliado Oficial'}
                          </span>
                        </div>
                        <h4 className="font-display text-lg sm:text-xl font-normal tracking-wide text-[#FFF9ED] group-hover:text-[#F3D49A] transition-colors break-words leading-tight">
                          {pat.nombre}
                        </h4>
                        <p className="text-[11px] text-stone-400 leading-relaxed break-words line-clamp-3">
                          {pat.descripcion}
                        </p>
                        {pat.url && (
                          <a
                            href={pat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 hover:underline pt-0.5 font-bold"
                          >
                            <span>Visitar sitio web</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
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

