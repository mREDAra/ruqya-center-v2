import { Link } from "@/i18n/routing";
import {
  Phone,
  Shield,
  Heart,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Star,
  CheckCircle,
  Users,
  Clock,
  Globe,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import PaymentReturnDetector from "@/components/PaymentReturnDetector";
import { getCmsContent, getCmsPageSeo } from "@/lib/cms";
import { getPageAlternates } from "@/lib/site-url";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  
  const seo = await getCmsPageSeo("/", locale, {
    title: t("heroTitle1") + " " + t("heroTitle2") + " - " + t("heroTitle3"),
    description: t("heroDesc"),
  });

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()) : undefined,
    openGraph: seo.og_image_url ? { images: [seo.og_image_url] } : undefined,
    alternates: getPageAlternates(locale, "/"),
  };
}

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  const supabase = await createClient();

  // Fetch all CMS sections and FAQs concurrently
  const [hero, aboutPreview, servicesPreview, treatments, cta, faqsRes] = await Promise.all([
    // 1. Dynamic Hero & Stats
    getCmsContent("home", "hero", locale, {
      badge: t("badge"),
      title1: t("heroTitle1"),
      title2: t("heroTitle2"),
      title3: t("heroTitle3"),
      description: t("heroDesc"),
      ctaBook: t("ctaBook"),
      ctaAbout: t("ctaAbout"),
      stat1Val: "+1000",
      stat1Label: t("statCases"),
      stat2Val: "+25",
      stat2Label: t("statYears"),
      stat3Val: "+20",
      stat3Label: t("statCountries"),
    }),
    // 2. Dynamic About Preview with 3 customizable cards
    getCmsContent("home", "about_preview", locale, {
      title: t("aboutTitle"),
      description: t("aboutDesc"),
      feat1Title: t("feature1Title"),
      feat1Desc: t("feature1Desc"),
      feat2Title: t("feature2Title"),
      feat2Desc: t("feature2Desc"),
      feat3Title: t("feature3Title"),
      feat3Desc: t("feature3Desc"),
    }),
    // 3. Dynamic Services Preview with 4 customizable cards & individual button labels
    getCmsContent("home", "services_preview", locale, {
      title: t("servicesTitle"),
      description: t("servicesDesc"),
      svc1Title: t("svc1Title"),
      svc1Desc: t("svc1Desc"),
      svc1Btn: t("bookNow"),
      svc2Title: t("svc2Title"),
      svc2Desc: t("svc2Desc"),
      svc2Btn: t("bookNow"),
      svc3Title: t("svc3Title"),
      svc3Desc: t("svc3Desc"),
      svc3Btn: t("bookNow"),
      svc4Title: t("svc4Title"),
      svc4Desc: t("svc4Desc"),
      svc4Btn: t("bookNow"),
    }),
    // 4. Dynamic Treatments
    getCmsContent("home", "treatments", locale, {
      title: t("treatTitle"),
      description: t("treatDesc"),
      treat1Title: t("treat1Title"),
      treat1Item1: "",
      treat1Item2: "",
      treat1Item3: "",
      treat2Title: t("treat2Title"),
      treat2Item1: "",
      treat2Item2: "",
      treat2Item3: "",
      treat3Title: t("treat3Title"),
      treat3Item1: "",
      treat3Item2: "",
      treat3Item3: "",
      treat4Title: t("treat4Title"),
      treat4Item1: "",
      treat4Item2: "",
      treat4Item3: "",
    }),
    // 5. Dynamic CTA
    getCmsContent("home", "cta", locale, {
      title: t("ctaTitle"),
      description: t("ctaDesc"),
      buttonText: t("ctaBook"),
    }),
    // 6. FAQs
    supabase
      .from("faqs")
      .select("id, question, answer, display_order")
      .order("display_order", { ascending: true })
      .limit(6),
  ]);

  const dbFaqs = faqsRes.data;

  const aboutFeatures = [
    { icon: <Shield size={24} />, title: aboutPreview.feat1Title || t("feature1Title"), desc: aboutPreview.feat1Desc || t("feature1Desc") },
    { icon: <Globe size={24} />, title: aboutPreview.feat2Title || t("feature2Title"), desc: aboutPreview.feat2Desc || t("feature2Desc") },
    { icon: <Users size={24} />, title: aboutPreview.feat3Title || t("feature3Title"), desc: aboutPreview.feat3Desc || t("feature3Desc") },
  ];

  const services = [
    {
      icon: <Phone size={24} />,
      title: servicesPreview.svc1Title || t("svc1Title"),
      desc: servicesPreview.svc1Desc || t("svc1Desc"),
      btnText: servicesPreview.svc1Btn || t("bookNow"),
      color: "primary",
    },
    {
      icon: <BookOpen size={24} />,
      title: servicesPreview.svc2Title || t("svc2Title"),
      desc: servicesPreview.svc2Desc || t("svc2Desc"),
      btnText: servicesPreview.svc2Btn || t("bookNow"),
      color: "accent",
    },
    {
      icon: <Heart size={24} />,
      title: servicesPreview.svc3Title || t("svc3Title"),
      desc: servicesPreview.svc3Desc || t("svc3Desc"),
      btnText: servicesPreview.svc3Btn || t("bookNow"),
      color: "primary",
    },
    {
      icon: <Star size={24} />,
      title: servicesPreview.svc4Title || t("svc4Title"),
      desc: servicesPreview.svc4Desc || t("svc4Desc"),
      btnText: servicesPreview.svc4Btn || t("bookNow"),
      color: "accent",
    },
  ];

  const getTreatItems = (catIndex: number, defaultKey: string) => {
    const rawDefaults = t.raw(defaultKey) as string[];
    const i1 = (treatments as any)[`treat${catIndex}Item1`];
    const i2 = (treatments as any)[`treat${catIndex}Item2`];
    const i3 = (treatments as any)[`treat${catIndex}Item3`];
    if (i1 || i2 || i3) {
      return [i1, i2, i3].filter(Boolean);
    }
    return rawDefaults;
  };

  const treatCategories = [
    {
      icon: <Shield size={28} />,
      title: treatments.treat1Title || t("treat1Title"),
      items: getTreatItems(1, "treat1Items"),
      gradient: "from-primary to-primary-dark",
    },
    {
      icon: <Heart size={28} />,
      title: treatments.treat2Title || t("treat2Title"),
      items: getTreatItems(2, "treat2Items"),
      gradient: "from-accent to-accent-dark",
    },
    {
      icon: <Sparkles size={28} />,
      title: treatments.treat3Title || t("treat3Title"),
      items: getTreatItems(3, "treat3Items"),
      gradient: "from-teal-dark to-primary-dark",
    },
    {
      icon: <CheckCircle size={28} />,
      title: treatments.treat4Title || t("treat4Title"),
      items: getTreatItems(4, "treat4Items"),
      gradient: "from-primary-light to-primary",
    },
  ];

  const faqs = (dbFaqs && dbFaqs.length > 0)
    ? dbFaqs.map((f) => ({ question: f.question, answer: f.answer }))
    : [
        { question: t("faq1Q"), answer: t("faq1A") },
        { question: t("faq2Q"), answer: t("faq2A") },
        { question: t("faq3Q"), answer: t("faq3A") },
        { question: t("faq4Q"), answer: t("faq4A") },
      ];

  return (
    <>
      {/* Detects return from Mtjree payment and redirects to payment-result */}
      <PaymentReturnDetector />
      {/* ========== Hero Section ========== */}
      <section className="relative gradient-hero text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <div className="absolute top-20 start-20 w-72 h-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-10 end-10 w-96 h-96 rounded-full bg-primary-light blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm mb-8">
              <Sparkles size={14} className="text-accent-light" />
              <span>{hero.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6">
              {hero.title1}{" "}
              <span className="text-gradient">{hero.title2}</span>
              <br />
              {hero.title3}
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-gray-200 leading-relaxed mb-10 max-w-2xl mx-auto">
              {hero.description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent text-white font-semibold text-lg hover:bg-accent-light transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Phone size={20} />
                {hero.ctaBook || t("ctaBook")}
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl glass font-medium hover:bg-white/15 transition-all duration-300"
              >
                {hero.ctaAbout || t("ctaAbout")}
                <ArrowLeft size={18} className="rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 md:gap-6 mt-16 max-w-lg mx-auto">
              <div className="text-center">
                <p className="text-2xl lg:text-3xl font-bold text-accent-light">{hero.stat1Val || "+1000"}</p>
                <p className="text-xs text-gray-300 mt-1">{hero.stat1Label || t("statCases")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl lg:text-3xl font-bold text-accent-light">{hero.stat2Val || "+25"}</p>
                <p className="text-xs text-gray-300 mt-1">{hero.stat2Label || t("statYears")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl lg:text-3xl font-bold text-accent-light">{hero.stat3Val || "+20"}</p>
                <p className="text-xs text-gray-300 mt-1">{hero.stat3Label || t("statCountries")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute -bottom-[2px] end-0 start-0">
          <svg className="w-full block" viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 80L48 74.7C96 69 192 59 288 53.3C384 48 480 48 576 53.3C672 59 768 69 864 69.3C960 69 1056 59 1152 53.3C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z"
              fill="var(--color-bg)"
            />
          </svg>
        </div>
      </section>

      {/* ========== About Section (3 Cards) ========== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">{aboutPreview.title}</h2>
            <p className="text-text-secondary leading-relaxed">{aboutPreview.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {aboutFeatures.map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Services Section (4 Cards with Individual Button Labels) ========== */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">{servicesPreview.title}</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">{servicesPreview.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {services.map((service, i) => (
              <div key={i} className="relative p-6 rounded-xl border border-border hover:border-primary/20 bg-bg hover:shadow-lg transition-all duration-300 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                  service.color === "primary"
                    ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                    : "bg-accent/10 text-accent-dark group-hover:bg-accent group-hover:text-white"
                }`}>
                  {service.icon}
                </div>
                <h3 className="font-semibold text-lg text-text-primary mb-2">{service.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">{service.desc}</p>
                <Link href="/booking" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-light transition-colors">
                  {service.btnText}
                  <ArrowLeft size={14} className="rtl:rotate-0 ltr:rotate-180" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== What We Treat Section ========== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">{treatments.title}</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">{treatments.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {treatCategories.map((category, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl bg-white border border-border hover:shadow-lg transition-all duration-300 group">
                <div className={`h-2 bg-gradient-to-l ${category.gradient}`} />
                <div className="p-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-lg text-text-primary mb-3">{category.title}</h3>
                  <ul className="space-y-2">
                    {category.items.map((item: string, j: number) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle size={14} className="text-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ Preview Section ========== */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">{t("faqTitle")}</h2>
            <p className="text-text-secondary">{t("faqDesc")}</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-bg rounded-lg border border-border overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors list-none">
                  {faq.question}
                  <Clock size={16} className="text-text-secondary transition-transform duration-300 group-open:rotate-90 flex-shrink-0 ms-4" />
                </summary>
                <div className="px-6 pb-4 text-sm text-text-secondary leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/faq" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-light transition-colors">
              {t("viewAllFaq")}
              <ArrowLeft size={14} className="rtl:rotate-0 ltr:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========== Final CTA ========== */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="gradient-hero rounded-2xl p-8 lg:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 end-0 w-48 h-48 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute bottom-0 start-0 w-64 h-64 rounded-full bg-primary-light/10 blur-3xl" />

            <div className="relative">
              <h2 className="text-2xl lg:text-4xl font-bold mb-4">{cta.title}</h2>
              <p className="text-gray-200 text-lg mb-8 max-w-xl mx-auto">{cta.description}</p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-accent text-white font-semibold text-lg hover:bg-accent-light transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Phone size={20} />
                {cta.buttonText || t("ctaBook")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
