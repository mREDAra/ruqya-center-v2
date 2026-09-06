"use client";

import { useState, useEffect, useRef } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { Menu, X, Phone, Globe } from "lucide-react";
import { PUBLIC_NAV_LINKS } from "@/lib/constants";
import { useTranslations, useLocale } from "next-intl";

export default function Header({
  globalContent,
}: {
  globalContent?: Record<string, any>;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Navigation");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleLanguage = () => {
    const nextLocale = locale === "ar" ? "tr" : "ar";
    router.replace(pathname, { locale: nextLocale });
  };

  // Map href to translation keys
  const getNavKey = (href: string) => {
    switch(href) {
      case "/": return "home";
      case "/about": return "about";
      case "/services": return "services";
      case "/courses": return "courses";
      case "/treatment-journey": return "journey";
      case "/blog": return "blog";
      case "/faq": return "faq";
      case "/contact": return "contact";
      default: return "home";
    }
  };

  const titleText = globalContent?.siteNameShort || (locale === "tr" ? "Ruqya Şifa" : "مركز الرقية بكلام الرحمن");
  const subtitleText = globalContent?.siteNameSubtitle || (locale === "tr" ? "Manevi Şifa Merkezi" : "لرد كيد الشيطان");

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/logo.png"
              alt={titleText}
              width={84}
              height={84}
              className="w-[72px] h-[72px] md:w-[84px] md:h-[84px] rounded-full shadow-md object-cover"
              priority
            />
            <div className="hidden sm:block">
              <span className="text-sm lg:text-base font-bold text-primary-dark leading-tight block">
                {titleText}
              </span>
              <p className="text-xs text-text-secondary">
                {subtitleText}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1 xl:gap-2">
            {PUBLIC_NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href as any}
                  className={`
                    whitespace-nowrap px-3 xl:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "text-primary bg-primary/5"
                        : "text-text-secondary hover:text-primary hover:bg-primary/5"
                    }
                  `}
                >
                  {t(getNavKey(link.href))}
                </Link>
              );
            })}
          </nav>

          {/* CTA + Language Switcher + Mobile Menu Button */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Language Switcher Pill */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-gray-50/80 hover:bg-gray-100 text-xs font-bold text-text-primary transition-all shadow-xs hover:border-primary/30"
              title={locale === "ar" ? "Türkçe diline geç" : "التحويل للغة العربية"}
              aria-label={locale === "ar" ? "Türkçe diline geç" : "العربية - التبديل إلى العربية"}
            >
              <Globe size={14} className="text-primary" />
              <span>{locale === "ar" ? "Türkçe" : "العربية"}</span>
            </button>

            <Link
              href="/booking"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-light transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Phone size={16} />
              <span>{t("booking")}</span>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="xl:hidden border-t border-border bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {PUBLIC_NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href as any}
                  onClick={() => setIsMenuOpen(false)}
                  className={`
                    block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "text-primary bg-primary/5"
                        : "text-text-secondary hover:text-primary hover:bg-gray-50"
                    }
                  `}
                >
                  {t(getNavKey(link.href))}
                </Link>
              );
            })}

            <div className="pt-3 pb-1 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  toggleLanguage();
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-border bg-gray-50 text-xs font-bold text-text-primary hover:bg-gray-100 transition-colors"
              >
                <Globe size={15} className="text-primary" />
                <span>{locale === "ar" ? "Türkçe" : "العربية"}</span>
              </button>

              <div className="sm:hidden">
                <Link
                  href="/booking"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-light transition-colors"
                >
                  <Phone size={16} />
                  <span>{t("booking")}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
