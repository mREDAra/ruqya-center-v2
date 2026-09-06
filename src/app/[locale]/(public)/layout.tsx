import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { getCmsContent } from "@/lib/cms";
import { getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/server";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tFooter = await getTranslations({ locale, namespace: "Footer" });

  const supabase = createPublicClient();
  const [globalContent, settingsRes] = await Promise.all([
    getCmsContent("global", "footer", locale, {
      siteNameShort: locale === "tr" ? "Ruqya Şifa Merkezi" : "مركز الرقية بكلام الرحمن",
      siteNameSubtitle: locale === "tr" ? "Kur'an ve Sünnet Işığında" : "لرد كيد الشيطان",
      basmala: locale === "tr" ? "Kur'an ve Sünnet Işığında Şifa" : "بسم الله أرقيك والله يشفيك",
      aboutDesc: tFooter("aboutDesc"),
    }),
    supabase.from("site_settings").select("key, value"),
  ]);

  const initialSettings: Record<string, string> = {};
  if (settingsRes.data) {
    settingsRes.data.forEach((s) => {
      initialSettings[s.key] = s.value;
    });
  }

  return (
    <ToastProvider>
      <Header globalContent={globalContent} />
      <main className="flex-1 min-h-[70vh] flex flex-col">{children}</main>
      <Footer globalContent={globalContent} initialSettings={initialSettings} />
    </ToastProvider>
  );
}
