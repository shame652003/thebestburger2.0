import React from 'react';
import { Patrocinador } from '../types';
import { Award, ExternalLink, Sparkles } from 'lucide-react';

interface SponsorsSectionProps {
  patrocinadores: Patrocinador[];
}

export const SponsorsSection: React.FC<SponsorsSectionProps> = ({ patrocinadores }) => {
  return (
    <section id="patrocinadores" className="py-16 bg-stone-950 border-t border-stone-900 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>Alianzas Comerciales</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 font-['Cabinet_Grotesk',sans-serif] tracking-tight">
            Patrocinadores Oficiales
          </h2>
          <p className="text-stone-400 text-sm sm:text-base mt-2">
            Agradecemos a las empresas y marcas que impulsan el desarrollo gastronómico, turístico y cultural de El Tocuyo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {patrocinadores.map((pat) => (
            <div
              key={pat.id}
              className="p-6 rounded-2xl bg-stone-900/50 border border-stone-800/80 hover:border-amber-500/40 hover:bg-stone-900/80 transition-all duration-300 flex items-start gap-4 shadow-md group"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-950 shrink-0 border border-stone-800 group-hover:border-amber-500/30 transition-colors">
                <img
                  src={pat.logoUrl}
                  alt={pat.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    pat.tipo === 'Principal'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : pat.tipo === 'Aliado Gourmet'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-stone-800 text-stone-300'
                  }`}>
                    {pat.tipo}
                  </span>
                </div>
                <h4 className="text-base font-bold text-stone-100 font-['Cabinet_Grotesk',sans-serif] group-hover:text-amber-400 transition-colors">
                  {pat.nombre}
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  {pat.descripcion}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sponsor Callout */}
        <div className="mt-10 text-center">
          <p className="text-xs text-stone-500">
            ¿Deseas que tu marca sea patrocinante de la Gran Gala Final en El Tocuyo? Contáctanos a través de la comisión organizadora.
          </p>
        </div>

      </div>
    </section>
  );
};
