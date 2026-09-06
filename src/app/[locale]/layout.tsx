import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import AuthRedirectHandler from '@/components/AuthRedirectHandler';

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
  preload: true,
});

import { getBaseUrl, getPageAlternates } from "@/lib/site-url";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const baseUrl = getBaseUrl();

  const titleDefault = isTr
    ? "Ruqya Center | Kur'an ile Şifa ve Danışmanlık Merkezi"
    : "مركز الرقية بكلام الرحمن لرد كيد الشيطان";

  const description = isTr
    ? "İstanbul'da Kur'an-ı Kerim ve Sünnet ışığında uzman ekibimizle Manevi Şifa, Ruqya ve Danışmanlık Hizmetleri sunuyoruz."
    : "مركز متخصص في الرقية الشرعية والعلاج بالقرآن الكريم في إسطنبول. نقدم استشارات أونلاين، تشخيص روحاني، وعلاج بإشراف خاص.";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: titleDefault,
      template: isTr ? "%s | Ruqya Center" : "%s | مركز الرقية بكلام الرحمن",
    },
    description,
    keywords: isTr
      ? ["ruqya", "manevi tedavi", "kuran ile sifa", "danismanlik", "istanbul"]
      : ["رقية شرعية", "علاج بالقرآن", "رقية", "علاج روحاني", "اسطنبول", "استشارة أونلاين"],
    alternates: getPageAlternates(locale, ''),
    openGraph: {
      type: "website",
      locale: isTr ? "tr_TR" : "ar_SA",
      url: isTr ? `${baseUrl}/tr` : `${baseUrl}`,
      siteName: isTr ? "Ruqya Center" : "مركز الرقية بكلام الرحمن",
      title: titleDefault,
      description,
      images: [
        {
          url: "/logo.png",
          width: 800,
          height: 600,
          alt: isTr ? "Ruqya Center Logo" : "شعار مركز الرقية الشرعية",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
      images: ["/logo.png"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

import JsonLd from "@/components/JsonLd";
import { getOrganizationSchema } from "@/lib/jsonld";

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const {locale} = await params;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const orgSchema = getOrganizationSchema(locale);

  return (
    <html lang={locale} dir={locale === 'tr' ? 'ltr' : 'rtl'} className={ibmPlexArabic.className}>
      <body className="min-h-screen flex flex-col overflow-x-hidden bg-bg">
        <JsonLd data={orgSchema} />
        <NextIntlClientProvider messages={messages}>
          <AuthRedirectHandler />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
