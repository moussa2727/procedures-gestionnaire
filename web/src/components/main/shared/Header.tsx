'use client';

import {
  Home as HomeIcon,
  Mail as MailIcon,
  Menu,
  Phone as PhoneIcon,
  Settings as ToolsIcon,
  X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Logo from '@/public/images/paname-consulting.jpg';

function Header(): React.JSX.Element {
  const [showTopBar, setShowTopBar] = useState(true);
  const [nav, setNav] = useState(false);
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        nav &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setNav(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (nav) setNav(false);
      }
    };

    document?.addEventListener('mousedown', handleClickOutside);
    document?.addEventListener('keydown', handleEscapeKey);

    return () => {
      document?.removeEventListener('mousedown', handleClickOutside);
      document?.removeEventListener('keydown', handleEscapeKey);
    };
  }, [nav]);

  useEffect(() => {
    const handleScroll = (): void => {
      const currentScrollY = window.scrollY;

      if (currentScrollY === 0) {
        setShowTopBar(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowTopBar(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowTopBar(true);
      }

      setIsScrolled(currentScrollY > 50);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navItems = [
    { name: 'Accueil', path: '/', icon: <HomeIcon className="w-5 h-5" /> },
    {
      name: 'Services',
      path: '/services',
      icon: <ToolsIcon className="w-5 h-5" />,
    },
    {
      name: 'Contact',
      path: '/contact',
      icon: <MailIcon className="w-5 h-5" />,
    },
  ];

 
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-sans ${
        pathname === '/'
          ? isScrolled
            ? 'bg-white shadow-md'
            : 'bg-gray-100/50 backdrop-blur-xl'
          : 'bg-white shadow-md'
      }`}
    >
      {/* Top Bar - Desktop seulement */}
      <div
        className={`bg-sky-500 text-white text-sm transition-all duration-300 ${
          showTopBar ? 'h-10' : 'h-0 overflow-hidden'
        } hidden md:block`}
        aria-hidden={!showTopBar}
      >
        <div className="mx-auto px-4 h-full flex flex-row items-center justify-between">
          <div className="flex items-center space-x-6">
            <a
              href="tel:+22391830941"
              className="flex items-center font-medium hover:text-sky-100 transition-colors"
              aria-label="Numéro de téléphone Paname Consulting"
            >
              <PhoneIcon className="w-4 h-4 mr-2" />
              <span>+223 91 83 09 41</span>
            </a>
            <a
              href="mailto:panameconsulting906@gmail.com"
              className="flex items-center font-medium hover:text-sky-100 transition-colors"
              aria-label="Adresse e-mail Paname Consulting"
            >
              <MailIcon className="w-4 h-4 mr-2" />
              <span>panameconsulting906@gmail.com</span>
            </a>
          </div>
          <div className="flex items-center">
            <span
              className="font-semibold bg-white/20 px-3 py-1 rounded-full"
              aria-label="Slogan de Paname Consulting: Le cap vers l excellence"
            >
              LE CAP VERS L'EXCELLENCE
            </span>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="bg-white shadow-md sm:py-1" role="navigation" aria-label="Menu principal">
        <div className="px-4">
          <div className="flex items-center justify-between py-4 lg:py-1 md:py-0">
            {/* Logo - Retour à l'accueil */}
            <Link
              href="/"
              className="flex items-center cursor-pointer"
              aria-label="Retour à l'accueil"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full hover:scale-105 transition-transform hover:shadow-xl">
                <Image
                  src={Logo}
                  alt="Logo Paname Consulting"
                  className="w-16 h-16 rounded-full object-cover"
                  width={64}
                  height={64}
                  loading="lazy"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <ul className="flex space-x-2" role="menubar" aria-label="Navigation principale">
                {navItems.map((item) => (
                  <li key={item.path} role="none">
                    <Link
                      href={item.path}
                      role="menuitem"
                      aria-current={pathname === item.path ? 'page' : undefined}
                      className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm md:text-base hover:bg-gray-50 ${
                        pathname === item.path
                          ? 'text-sky-600 border-b-2 border-sky-500'
                          : 'text-gray-600 hover:text-sky-500'
                      }`}
                    >
                      {item.icon}
                      <span className="ml-2">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>

            </div>

            {/* Bouton hamburger mobile */}
            <button
              ref={hamburgerRef}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              onClick={() => setNav(!nav)}
              aria-label={nav ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={nav}
              aria-controls="mobile-menu"
            >
              {nav ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* MOBILE MENU */}
          {nav && (
            <div
              id="mobile-menu"
              className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg z-40 border-t"
              ref={mobileMenuRef}
            >
              <div className="p-4">
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setNav(false)}
                      className={`flex items-center px-3 py-3 rounded-lg transition-all duration-150 font-medium ${
                        pathname === item.path
                          ? 'bg-sky-50 text-sky-600 border-l-4 border-sky-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-sky-500'
                      }`}
                    >
                      <span
                        className={`shrink-0 ${
                          pathname === item.path ? 'text-sky-500' : 'text-gray-400'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="ml-3 flex-1 font-medium">{item.name}</span>
                      {pathname === item.path && (
                        <span className="text-xs font-semibold text-sky-500 bg-sky-100 px-2 py-0.5 rounded">
                          Actif
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;