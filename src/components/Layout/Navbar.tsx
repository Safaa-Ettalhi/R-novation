import Link from 'next/link';
import { Home, MessageSquare } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white/95 backdrop-blur-md fixed w-full z-50 border-b border-gray-100 shadow-sm top-0 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg group-hover:bg-primaryLight transition">
              <span className="text-accent font-serif font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight group-hover:opacity-80 transition">LES ARTISTES</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold -mt-1">Rénovation</p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-primary transition">Accueil</Link>
            <span className="text-sm font-semibold text-gray-600 hover:text-primary transition cursor-pointer">Nos Services</span>
            <span className="text-sm font-semibold text-gray-600 hover:text-primary transition cursor-pointer">Réalisations</span>
            
            {/* CTA Button */}
            <Link href="/chat" className="flex items-center space-x-2 bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primaryLight shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <MessageSquare className="w-4 h-4 text-accent" />
              <span>Estimer avec l'IA</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
