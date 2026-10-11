import React from 'react';
import { motion } from 'motion/react';
import { Restaurante } from '../types';
import { Star, MapPin, QrCode, ArrowUpRight, Flame, Instagram, Sparkles } from 'lucide-react';

interface BurgersGalleryProps {
  restaurantes: Restaurante[];
  onSelectRestaurant: (restauranteId: string) => void;
}

export const BurgersGallery: React.FC<BurgersGalleryProps> = ({
  restaurantes,
  onSelectRestaurant,
}) => {
  return (
    <section id="hamburguesas" className="py-16 bg-black/60 backdrop-blur-[2px] border-t border-stone-900/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A40B03]/15 border border-[#A40B03]/40 text-[#FFF9ED] text-xs font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 text-[#A40B03]" />
              <span>Galería Oficial • Food Fest 2026</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif] tracking-tight">
              Creaciones Participantes
            </h2>
            <p className="text-stone-400 text-sm sm:text-base mt-2 max-w-2xl">
              Cada propuesta fue elaborada especialmente para el festival. Conoce los ingredientes, 
              ubica el restaurante en El Tocuyo y vota con tu código intransferible.
            </p>
          </div>

          <div className="text-xs text-stone-300 bg-[#121212] px-4 py-2.5 rounded-xl border border-[#A40B03]/30 self-start md:self-auto">
            <span className="font-semibold text-[#FFF9ED]">Tip de Votación:</span> Pide tu código único en caja o mesa para registrar tu voto.
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {restaurantes.map((rest, index) => (
            <motion.div
              key={rest.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group rounded-3xl bg-[#0F0F0F] border border-stone-800/80 hover:border-[#A40B03]/60 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xl shadow-black hover:shadow-2xl hover:shadow-[#A40B03]/20"
            >
              
              {/* Image & Badges */}
              <div className="relative aspect-[16/10] overflow-hidden bg-black">
                <img
                  src={rest.fotoUrl}
                  alt={rest.nombreHamburguesa}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-black/30 to-transparent" />

                {/* Price Tag */}
                <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-xl bg-[#A40B03] text-[#FFF9ED] font-black text-sm shadow-lg shadow-black/60 border border-[#FFF9ED]/20">
                  {rest.precio}
                </div>

                {/* Restaurant Signature Banner on Bottom of Photo */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800">
                    <img
                      src={rest.logoUrl}
                      alt={rest.nombre}
                      className="w-5 h-5 rounded-full object-cover border border-[#A40B03]/60"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-bold text-[#FFF9ED]">{rest.nombre}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/90 backdrop-blur-md text-[#FFF9ED] px-3 py-1.5 rounded-xl text-xs font-bold border border-[#A40B03]/40">
                    <Sparkles className="w-3.5 h-3.5 text-[#A40B03]" />
                    <span>En Competencia</span>
                  </div>
                </div>
              </div>

              {/* Content Details */}
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <h3 className="text-2xl font-black text-[#FFF9ED] font-['Cabinet_Grotesk',sans-serif] group-hover:text-[#A40B03] transition-colors">
                    {rest.nombreHamburguesa}
                  </h3>
                  <p className="text-[#A40B03] text-xs font-bold mt-1 tracking-wide">
                    "{rest.slogan}"
                  </p>
                  <p className="text-stone-300 text-xs sm:text-sm mt-3 leading-relaxed">
                    {rest.descripcion}
                  </p>

                  {/* Ingredients Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {rest.ingredientes.map((ing, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-black border border-stone-800 text-stone-300"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>

                  {/* Address & Social */}
                  <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-400 gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#A40B03] shrink-0" />
                      <span className="truncate">{rest.direccion}</span>
                    </div>
                    <div className="flex items-center gap-1 text-stone-400 hover:text-[#A40B03] transition-colors shrink-0">
                      <Instagram className="w-3.5 h-3.5 text-[#A40B03]" />
                      <span>{rest.instagram}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button: Single Full-Width Votar por Esta */}
                <div className="pt-2">
                  <button
                    onClick={() => onSelectRestaurant(rest.id)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold text-[#FFF9ED] bg-gradient-to-r from-[#A40B03] via-[#BF0E05] to-[#7A0802] border border-[#A40B03]/50 shadow-md shadow-[#A40B03]/25 hover:shadow-lg hover:shadow-[#A40B03]/40 hover:scale-[1.01] active:scale-[0.98] transition-all"
                  >
                    <span>Votar por Esta</span>
                    <ArrowUpRight className="w-4 h-4 text-[#FFF9ED]" />
                  </button>
                </div>

              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
