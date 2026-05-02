import Link from 'next/link';

export default function Home() {
  return (
    <>
      <main className="flex-grow">
        <div className="relative bg-primary">
          <div className="absolute inset-0 z-0">
            <img src="/renovation_hero.png" alt="Intérieur rénové" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-48 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-xs font-semibold text-white tracking-wide uppercase">Nouveau : Devis instantané par IA</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight max-w-3xl mb-6">
              L'Excellence de la <span className="text-accent">Rénovation</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mb-10 leading-relaxed">
              Confiez votre intérieur à nos experts. Obtenez une estimation immédiate, fiable et personnalisée grâce à notre nouvel assistant virtuel intelligent.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/chat" className="inline-flex justify-center items-center gap-2 bg-accent text-white px-8 py-4 rounded-full font-bold text-base hover:bg-accentHover shadow-[0_0_20px_rgba(201,168,76,0.4)] transition-all transform hover:-translate-y-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Lancer le simulateur IA
              </Link>
              <Link href="#" className="inline-flex justify-center items-center gap-2 bg-white/10 text-white backdrop-blur-md border border-white/20 px-8 py-4 rounded-full font-bold text-base hover:bg-white/20 transition-all">
                Découvrir nos services
              </Link>
            </div>
          </div>
        </div>

        <div id="expertise" className="py-24 bg-white scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-primary mb-4">Notre Expertise</h2>
              <div className="w-16 h-1 bg-accent mx-auto rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-bgLight rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Plomberie</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Remplacement d'équipements, recherche de fuites et installation de sanitaires haut de gamme.</p>
              </div>

              <div className="bg-bgLight rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Électricité</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Mise aux normes, installation de tableaux, éclairage design et domotique sur-mesure.</p>
              </div>

              <div className="bg-bgLight rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Peinture</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Préparation des supports, enduits de lissage et finitions impeccables avec des peintures premium.</p>
              </div>

              <div className="bg-bgLight rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Revêtements</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Pose de carrelage, parquet massif et sols souples avec un niveau de finition exceptionnel.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-50">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            <span className="font-bold tracking-wider text-gray-300">LES ARTISTES RÉNOV</span>
          </div>
          <p className="text-sm">© 2026 Les Artistes Rénov. Tous droits réservés.</p>
        </div>
      </footer>
    </>
  );
}
