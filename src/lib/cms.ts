import { createPublicClient } from "@/lib/supabase/server";

export interface HomeHeroContent {
  badge?: string;
  title1?: string;
  title2?: string;
  title3?: string;
  description?: string;
  ctaBook?: string;
  ctaAbout?: string;
}

export interface AboutStoryContent {
  tag?: string;
  title?: string;
  p1?: string;
  p2?: string;
  p3?: string;
}

export interface AboutVisionMissionContent {
  visionTitle?: string;
  visionDesc?: string;
  missionTitle?: string;
  missionDesc?: string;
}

export interface CoursesProgramContent {
  badge?: string;
  heroTitle?: string;
  heroDesc?: string;
  aboutTitle?: string;
  programDesc?: string;
}

export interface CoursesGoldenContent {
  badge?: string;
  title?: string;
  description?: string;
  items?: string[];
}

export interface TreatmentJourneyContent {
  heroTitle?: string;
  heroDesc?: string;
  steps?: Array<{ step: string; title: string; desc: string }>;
}

export interface PageSeoData {
  title: string;
  description: string;
  keywords?: string;
  og_image_url?: string;
  canonical_url?: string;
}

/**
 * Normalizes page path keys (e.g. "/" or "/about" or "/courses")
 */
export function normalizePagePath(path: string): string {
  if (!path) return "/";
  const clean = path.trim().toLowerCase();
  return clean.startsWith("/") ? clean : `/${clean}`;
}

/**
 * Server-side helper to fetch dynamic section content with graceful fallback
 */
export async function getCmsContent<T extends object>(
  pageName: string,
  sectionKey: string,
  locale: string = "ar",
  fallback: T
): Promise<T> {
  try {
    const supabase = createPublicClient();
    const loc = locale === "tr" ? "tr" : "ar";

    // 1. Try fetching from dedicated site_content table
    const { data: dedicatedData, error: dedicatedError } = await supabase
      .from("site_content")
      .select("content_json")
      .eq("page_name", pageName)
      .eq("section_key", sectionKey)
      .eq("locale", loc)
      .maybeSingle();

    if (!dedicatedError && dedicatedData?.content_json) {
      return { ...fallback, ...(dedicatedData.content_json as T) };
    }

    // 2. Fallback to site_settings table (key-value)
    const settingsKey = `cms:${pageName}:${sectionKey}:${loc}`;
    const { data: settingRow, error: settingError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", settingsKey)
      .maybeSingle();

    if (!settingError && settingRow?.value) {
      try {
        const parsed = JSON.parse(settingRow.value);
        return { ...fallback, ...parsed };
      } catch {
        // value was not json
      }
    }
  } catch {
    // Network or server error -> use fallback
  }

  return fallback;
}

/**
 * Server-side helper to fetch dynamic SEO metadata for a page
 */
export async function getCmsPageSeo(
  pagePath: string,
  locale: string = "ar",
  fallback: PageSeoData
): Promise<PageSeoData> {
  const normPath = normalizePagePath(pagePath);
  const loc = locale === "tr" ? "tr" : "ar";

  try {
    const supabase = createPublicClient();

    // 1. Try pages_seo table
    const { data: seoData, error: seoError } = await supabase
      .from("pages_seo")
      .select("meta_title, meta_description, meta_keywords, og_image_url, canonical_url")
      .eq("page_path", normPath)
      .eq("locale", loc)
      .maybeSingle();

    if (!seoError && seoData) {
      return {
        title: seoData.meta_title || fallback.title,
        description: seoData.meta_description || fallback.description,
        keywords: seoData.meta_keywords || fallback.keywords,
        og_image_url: seoData.og_image_url || fallback.og_image_url,
        canonical_url: seoData.canonical_url || fallback.canonical_url,
      };
    }

    // 2. Fallback to site_settings
    const settingsKey = `seo:${normPath}:${loc}`;
    const { data: settingRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", settingsKey)
      .maybeSingle();

    if (settingRow?.value) {
      try {
        const parsed = JSON.parse(settingRow.value) as Partial<PageSeoData>;
        return {
          title: parsed.title || fallback.title,
          description: parsed.description || fallback.description,
          keywords: parsed.keywords || fallback.keywords,
          og_image_url: parsed.og_image_url || fallback.og_image_url,
          canonical_url: parsed.canonical_url || fallback.canonical_url,
        };
      } catch {
        // ignore parse error
      }
    }
  } catch {
    // fallback on error
  }

  return fallback;
}
