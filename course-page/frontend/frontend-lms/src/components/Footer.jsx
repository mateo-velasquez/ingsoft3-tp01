const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto border-t border-gray-700">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🔥</span>
              <h3 className="text-xl font-bold text-gradient">Solaire</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              La plataforma más completa para convertirte en chef.
            </p>
            <div className="flex gap-4 mt-4">
              <span className="text-2xl cursor-pointer hover:text-primary transition-all">📧</span>
              <span className="text-2xl cursor-pointer hover:text-primary transition-all">💬</span>
              <span className="text-2xl cursor-pointer hover:text-primary transition-all">🐦</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Enlaces Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-gray-400 hover:text-white transition-all flex items-center gap-2">
                  🏠 Inicio
                </a>
              </li>
              <li>
                <a href="/my-courses" className="text-gray-400 hover:text-white transition-all flex items-center gap-2">
                  📚 Mis Cursos
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-400 hover:text-white transition-all flex items-center gap-2">
                  ℹ️ Acerca de
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Contacto</h4>
            <div className="space-y-3 text-gray-400">
              <p className="flex items-center gap-2">
                📧 <span>hola@solaire.dev</span>
              </p>
              <p className="flex items-center gap-2">
                📱 <span>+54 11 1234-5678</span>
              </p>
              <p className="flex items-center gap-2">
                🌍 <span>Buenos Aires, Argentina</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p className="text-gray-400">
            © 2025 <span className="text-gradient font-semibold">Solaire</span>. Formando cocineros. 👨🏿‍🍳
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
