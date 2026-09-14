"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Stepper, MiniCalendar, TimeSlotPicker, Modal } from "@/components/ui";
import type { TimeSlot } from "@/components/ui/TimeSlotPicker";
import { formatDate, formatTime } from "@/lib/helpers";
import { CheckCircle, Phone, ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { sendBookingEmailAction } from "@/app/actions/bookingEmail";
import { createBookingAction } from "@/app/actions/createBooking";

// Country codes for WhatsApp
const COUNTRY_CODES = [
  { code: "+90", flag: "🇹🇷" },
  { code: "+966", flag: "🇸🇦" },
  { code: "+971", flag: "🇦🇪" },
  { code: "+965", flag: "🇰🇼" },
  { code: "+974", flag: "🇶🇦" },
  { code: "+973", flag: "🇧🇭" },
  { code: "+968", flag: "🇴🇲" },
  { code: "+962", flag: "🇯🇴" },
  { code: "+970", flag: "🇵🇸" },
  { code: "+961", flag: "🇱🇧" },
  { code: "+964", flag: "🇮🇶" },
  { code: "+20", flag: "🇪🇬" },
  { code: "+212", flag: "🇲🇦" },
  { code: "+213", flag: "🇩🇿" },
  { code: "+216", flag: "🇹🇳" },
  { code: "+218", flag: "🇱🇾" },
  { code: "+249", flag: "🇸🇩" },
  { code: "+967", flag: "🇾🇪" },
  { code: "+963", flag: "🇸🇾" },
  { code: "+1", flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+49", flag: "🇩🇪" },
  { code: "+33", flag: "🇫🇷" },
  { code: "+31", flag: "🇳🇱" },
  { code: "+46", flag: "🇸🇪" },
  { code: "+60", flag: "🇲🇾" },
  { code: "+62", flag: "🇮🇩" },
  { code: "+92", flag: "🇵🇰" },
  { code: "+91", flag: "🇮🇳" },
];

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  min_days_delay?: number | null;
  max_days_limit?: number | null;
  is_active?: boolean;
  display_order?: number;
}

interface SlotRow {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  healer_id: string;
  max_capacity: number;
  current_bookings: number;
  healers: { display_name: string } | null;
}

export default function BookingPage() {
  const t = useTranslations("Booking");
  const tCountries = useTranslations("countries");
  const locale = useLocale();
  
  const MARITAL_OPTIONS = [
    { value: "single", label: t("infoStep.single") },
    { value: "married", label: t("infoStep.married") },
    { value: "divorced", label: t("infoStep.divorced") },
    { value: "widowed", label: t("infoStep.widowed") },
  ];

  const NEED_OPTIONS = [
    { value: "initial_assessment", label: t("infoStep.needOptions.initial") },
    { value: "special_followup", label: t("infoStep.needOptions.special") },
    { value: "need_specialist_opinion", label: t("infoStep.needOptions.unsure") },
  ];

  const STEPS = [t("steps.service"), t("infoStep.title"), t("dateStep.title"), t("confirmStep.title")];

  const PRIVACY_POLICY_TEXT = `
في مركز الرقية الشرعية، نضع خصوصية المرضى والمستفيدين في أعلى درجات الأهمية. نحن ندرك تماماً حساسية المعلومات التي يتم مشاركتها معنا، ونلتزم التزاماً كاملاً بحمايتها وفقاً لأعلى معايير السرية والأمان.
جميع المعلومات الشخصية والتفاصيل الخاصة بالحالات والأعراض تُعتبر سرية للغاية، ولا يتم مشاركة، أو بيع، أو تأجير أي بيانات شخصية لأي طرف ثالث تحت أي ظرف.
الوصول إلى سجلات المستفيدين مقتصر فقط على الرقاة والمعالجين المختصين والمصرح لهم بمتابعة الحالة.
جميع عمليات الدفع الإلكتروني تتم عبر بوابات دفع آمنة ومعتمدة. نحن لا نقوم بتخزين تفاصيل بطاقات الائتمان أو أي بيانات بنكية دقيقة على خوادمنا.
`;

  const TERMS_OF_SERVICE_TEXT = `
مرحباً بك في مركز الرقية الشرعية. الجلسات المقدمة (سواء أكانت حضورية أو عن بُعد) تعتمد على الرقية الشرعية من الكتاب والسنة. نحن لا نضمن الشفاء، فالشفاء بيد الله وحده، ولكننا نبذل الأسباب المشروعة.
نقدم حالياً خدمة "الاستشارة الصوتية" كخطوة أولى لتقييم الحالة، وبناءً عليها يتم تحديد ما إذا كانت هناك حاجة لجلسات علاجية أو متابعة.
يرجى الالتزام بالمواعيد المحددة. في حال التأخير أو الرغبة في الإلغاء، يجب إبلاغنا قبل الموعد بـ 24 ساعة على الأقل.
تكون الرسوم المحددة للجلسات والاستشارات مستحقة الدفع وفقاً لسياسة التسعير المعتمدة.
يُتوقع من جميع المستفيدين التعامل بصدق واحترام مع المعالجين وتقديم معلومات دقيقة عن الحالة لضمان أفضل توجيه ممكن.
`;

  const [currentStep, setCurrentStep] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Slot state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlotData, setSelectedSlotData] = useState<{
    date: string;
    start_time: string;
    end_time: string;
    healer_name: string;
  } | null>(null);

  const [form, setForm] = useState({
    service_id: "",
    // Patient fields
    patient_name: "",
    patient_email: "",
    patient_gender: "" as "" | "male" | "female",
    patient_nationality: "",
    patient_age: "",
    patient_residence: "",
    patient_marital_status: "",
    patient_previous_ruqya: "",
    patient_can_travel: "" as "" | "yes" | "no",
    patient_need_type: "",
    patient_phone_code: "+90",
    patient_phone_number: "",
    agreed_to_terms: false,
  });

  const supabase = createClient();

  // Auto-scroll to top smoothly whenever the step or submission state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, submitted]);

  // Load services with I18n support
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      let activeServices = (data as Service[]) || [];

      if (locale === "tr") {
        const { data: trSetting } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "i18n:services:tr")
          .maybeSingle();

        let trMap: Record<string, { name_tr?: string; description_tr?: string }> = {};
        if (trSetting?.value) {
          try {
            trMap = JSON.parse(trSetting.value);
          } catch {
            // ignore
          }
        }

        activeServices = activeServices.map((s) => {
          const tr = trMap[s.id];
          const name = tr?.name_tr || (s.name.includes("مستعجل") ? "Acil Sesli Danışmanlık" : s.name.includes("عادي") ? "Normal Sesli Danışmanlık" : s.name);
          const description = tr?.description_tr || (s.name.includes("مستعجل") ? "24 saat içinde randevu alma imkânı sağlar" : s.name.includes("عادي") ? "7 gün ve sonrası için randevu tarihleri" : s.description);
          return {
            ...s,
            name,
            description,
          };
        });
      }

      setServices(activeServices);
      
      if (activeServices.length > 0) {
        setForm((prev) => ({
          ...prev,
          service_id: prev.service_id || activeServices[0].id,
        }));
      }
      
      setIsLoading(false);
    }
    load();
  }, [supabase, locale]);

  // Load available dates based on selected service's min_days_delay and max_days_limit
  const loadAvailableDates = useCallback(async () => {
    if (!form.service_id) return;
    
    const selectedService = services.find((s: Service) => s.id === form.service_id);
    const minDays = selectedService?.min_days_delay ?? 0;
    const maxDays = selectedService?.max_days_limit;
    
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + minDays);
    const minDateStr = minDate.toISOString().split("T")[0];

    let query = supabase
      .from("available_slots")
      .select("slot_date, max_capacity, current_bookings")
      .eq("is_booked", false)
      .gte("slot_date", minDateStr);

    if (maxDays && maxDays >= minDays) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + maxDays);
      const maxDateStr = maxDate.toISOString().split("T")[0];
      query = query.lte("slot_date", maxDateStr);
    }

    query = query.order("slot_date");

    const { data } = await query;

    // Only include dates that have at least one slot with remaining capacity
    const availableSlots = (data as unknown as SlotRow[])?.filter((s) => s.current_bookings < s.max_capacity) || [];
    const uniqueDates = [...new Set(availableSlots.map((s) => s.slot_date))] as string[];
    setAvailableDates(uniqueDates);
  }, [form.service_id, services, supabase]);

  useEffect(() => {
    if (currentStep === 2 && form.service_id) {
      loadAvailableDates();
      setSelectedDate(null);
      setSelectedSlotId(null);
      setSelectedSlotData(null);
      setDaySlots([]);
    }
  }, [currentStep, form.service_id, loadAvailableDates]);

  // Load time slots for selected date (only with remaining capacity)
  const loadDaySlots = useCallback(
    async (date: string) => {
      setSlotsLoading(true);
      const { data } = await supabase
        .from("available_slots")
        .select("id, slot_date, start_time, end_time, healer_id, max_capacity, current_bookings, healers(display_name)")
        .eq("slot_date", date)
        .eq("is_booked", false)
        .order("start_time");

      // Filter to only show slots that have remaining capacity
      const available = (data as unknown as SlotRow[])?.filter(
        (s) => s.current_bookings < s.max_capacity
      ) || [];

      const uniqueSlots: TimeSlot[] = [];
      const seenTimes = new Set();
      
      for (const s of available) {
        if (!seenTimes.has(s.start_time)) {
          seenTimes.add(s.start_time);
          uniqueSlots.push({
            id: s.id,
            start_time: s.start_time,
            end_time: s.end_time,
            healer_name: "", // Don't show healer name to customer
          });
        }
      }

      setDaySlots(uniqueSlots);
      setSlotsLoading(false);
    },
    [supabase]
  );

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlotId(null);
    setSelectedSlotData(null);
    loadDaySlots(date);
  };

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlotId(slotId);
    const slot = daySlots.find((s) => s.id === slotId);
    if (slot && selectedDate) {
      setSelectedSlotData({
        date: selectedDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        healer_name: slot.healer_name,
      });
    }
  };

  const fullPhone = `${form.patient_phone_code} ${form.patient_phone_number}`;

  const handleSubmit = async () => {
    if (!selectedSlotId) return;
    setIsSubmitting(true);

    try {
      // Fetch slot details (healer + capacity)
      const { data: slotData } = await supabase
        .from("available_slots")
        .select("healer_id, max_capacity, current_bookings")
        .eq("id", selectedSlotId)
        .single();

      if (!slotData || slotData.current_bookings >= slotData.max_capacity) {
        alert(t("errors.unavailable"));
        return;
      }

      const selectedService = services.find((s) => s.id === form.service_id);
      const res = await createBookingAction({
        slot_id: selectedSlotId,
        service_id: form.service_id,
        healer_id: null,
        patient_name: form.patient_name,
        patient_email: form.patient_email || null,
        patient_phone: fullPhone,
        patient_gender: form.patient_gender,
        patient_nationality: form.patient_nationality || null,
        patient_age: form.patient_age ? parseInt(form.patient_age) : null,
        patient_country: form.patient_residence || null,
        patient_marital_status: form.patient_marital_status || null,
        patient_previous_ruqya: form.patient_previous_ruqya || null,
        patient_can_travel: form.patient_can_travel === "yes" ? true : form.patient_can_travel === "no" ? false : null,
        patient_need_type: form.patient_need_type || null,
        patient_notes: selectedService?.name
          ? `نوع الاستشارة: ${selectedService.name}\n\n${form.patient_previous_ruqya || ''}`
          : form.patient_previous_ruqya || null,
        status: "pending",
        payment_status: "pending",
      }, slotData, selectedSlotId);

      if (!res.success) {
        console.error(res.error);
        alert(t("errors.errorSubmitting"));
        return;
      }

      // Call Mtjree payment gateway
      const paymentRes = await fetch('/api/payment/mtjree-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: res.bookingId,
          amount: selectedService?.price || 0,
          description: selectedService?.name || "استشارة صوتية",
          user_name: form.patient_name,
          user_email: form.patient_email,
          user_phone: fullPhone,
          locale: locale
        })
      });

      const paymentData = await paymentRes.json();
      if (paymentRes.ok && paymentData.redirect_url) {
        // Save booking info to localStorage so we can detect return from payment
        // Mtjree redirects to shop_url (homepage) after success - we'll catch it there
        localStorage.setItem("mtjree_pending_booking", JSON.stringify({
          booking_id: res.bookingId,
          locale: locale,
          timestamp: Date.now()
        }));
        window.location.href = paymentData.redirect_url;
      } else {
        alert(paymentData.error || "فشل في إنشاء رابط الدفع - تأكد من إعدادات البوابة");
        setIsSubmitting(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERS ---

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-text-secondary mt-4">{t("loading")}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-2xl border border-border p-8 lg:p-12">
          <div className="w-20 h-20 rounded-full bg-green-50 mx-auto flex items-center justify-center mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            {t("success.title")}
          </h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            {t("success.message")}
          </p>

          {selectedSlotData && (
            <div className="bg-primary/5 rounded-xl p-6 mb-8 max-w-sm mx-auto text-sm border border-primary/10">
              <p className="font-semibold text-primary mb-3 text-base">{t("success.details")}</p>
              <div className="flex flex-col gap-2 items-center text-text-secondary">
                <p>{formatDate(selectedSlotData.date)}</p>
                <p>{formatTime(selectedSlotData.start_time)} — {formatTime(selectedSlotData.end_time)}</p>
                {/* Healer name removed so customer does not see it */}
              </div>
            </div>
          )}

          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-all shadow-sm hover:shadow-md"
            >
              {t("success.backToHome")}
            </Link>
          </div>
          <p className="text-xs text-text-muted mt-6">{t("success.prayer")}</p>
        </div>
      </div>
    );
  }

  const selectedService = services.find((s) => s.id === form.service_id);

  const canProceed = () => {
    switch (currentStep) {
      case 0: 
        return !!form.service_id;
      case 1: 
        return !!form.patient_name && !!form.patient_phone_number && !!form.patient_email && !!form.patient_gender;
      case 2: 
        return !!selectedSlotId;
      default: 
        return true;
    }
  };


  const maritalLabel = MARITAL_OPTIONS.find((o) => o.value === form.patient_marital_status)?.label;
  const needLabel = NEED_OPTIONS.find((o) => o.value === form.patient_need_type)?.label;

  return (
    <>
      {/* Hero */}
      <section className="gradient-hero text-white py-12 lg:py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 start-20 w-72 h-72 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t("title")}</h1>
          <p className="text-gray-200 max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Stepper steps={STEPS} currentStep={currentStep} className="mb-10" />

          <div className="bg-white rounded-2xl border border-border p-6 lg:p-8">
            {/* ========== Step 0: Service ========== */}
            {currentStep === 0 && (
              <div>
                <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3 text-blue-800 text-sm">
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">{t("serviceStep.importantNote")}</p>
                    <p>
                      {t("serviceStep.importantText")}
                    </p>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-text-primary mb-4">{t("serviceStep.selectType")}</h2>
                
                {services.length > 0 ? (
                  <div className="space-y-3">
                    {services.map((service) => {
                      const isSelected = form.service_id === service.id;
                      return (
                        <label
                          key={service.id}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/30 bg-white"
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="service_id" 
                            value={service.id} 
                            checked={isSelected} 
                            onChange={() => setForm({ ...form, service_id: service.id })} 
                            className="mt-1 accent-primary" 
                          />
                          <div className="flex-1 w-full flex justify-between items-start gap-4">
                            <div>
                              <p className="font-semibold text-text-primary">{service.name}</p>
                              {service.description && (
                                <p className="text-sm text-text-secondary mt-1">{service.description}</p>
                              )}
                            </div>
                            {service.price !== null && (
                              <p className="font-bold text-primary text-base shrink-0" dir="ltr">
                                ${service.price}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary text-center py-6">{t("serviceStep.loadingService")}</p>
                )}
              </div>
            )}

            {/* ========== Step 1: Patient Info ========== */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-5">{t("infoStep.title")}</h2>
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {t("infoStep.email")} <span className="text-error">*</span>
                    </label>
                    <input type="email" required value={form.patient_email} onChange={(e) => setForm({ ...form, patient_email: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="example@email.com" dir="ltr" />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {t("infoStep.fullName")} <span className="text-error">*</span>
                    </label>
                    <input required value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder={t("infoStep.namePlaceholder")} />
                  </div>

                  {/* Gender + Age */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        {t("infoStep.gender")} <span className="text-error">*</span>
                      </label>
                      <select value={form.patient_gender} onChange={(e) => setForm({ ...form, patient_gender: e.target.value as "" | "male" | "female" })} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                        <option value="" disabled>{t("infoStep.selectGender")}</option>
                        <option value="male">{t("infoStep.male")}</option>
                        <option value="female">{t("infoStep.female")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">{t("infoStep.age")}</label>
                      <input type="number" value={form.patient_age} onChange={(e) => setForm({ ...form, patient_age: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>

                  {/* Nationality + Residence */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">{t("infoStep.nationality")}</label>
                      <input value={form.patient_nationality} onChange={(e) => setForm({ ...form, patient_nationality: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">{t("infoStep.residence")}</label>
                      <input value={form.patient_residence} onChange={(e) => setForm({ ...form, patient_residence: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">{t("infoStep.maritalStatus")}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {MARITAL_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${
                            form.patient_marital_status === opt.value ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-text-secondary hover:border-primary/30"
                          }`}
                        >
                          <input type="radio" name="marital" value={opt.value} checked={form.patient_marital_status === opt.value} onChange={(e) => setForm({ ...form, patient_marital_status: e.target.value })} className="sr-only" />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Previous Ruqya + Problems */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {t("infoStep.previousRuqyaInfo")}
                    </label>
                    <textarea rows={3} value={form.patient_previous_ruqya} onChange={(e) => setForm({ ...form, patient_previous_ruqya: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder={t("infoStep.previousRuqyaPlaceholder")} />
                  </div>

                  {/* Can Travel */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">{t("infoStep.canTravel")}</label>
                    <div className="flex gap-3">
                      {[
                        { value: "yes", label: t("infoStep.yes") },
                        { value: "no", label: t("infoStep.no") },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${
                            form.patient_can_travel === opt.value ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-text-secondary hover:border-primary/30"
                          }`}
                        >
                          <input type="radio" name="travel" value={opt.value} checked={form.patient_can_travel === opt.value} onChange={(e) => setForm({ ...form, patient_can_travel: e.target.value as "yes" | "no" })} className="sr-only" />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Need Type */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">{t("infoStep.needType")}</label>
                    <div className="space-y-2">
                      {NEED_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer text-sm transition-all ${
                            form.patient_need_type === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          }`}
                        >
                          <input type="radio" name="need" value={opt.value} checked={form.patient_need_type === opt.value} onChange={(e) => setForm({ ...form, patient_need_type: e.target.value })} className="accent-primary flex-shrink-0" />
                          <span className={form.patient_need_type === opt.value ? "text-primary font-medium" : "text-text-secondary"}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* WhatsApp Number with Country Code */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {t("infoStep.whatsapp")} <span className="text-error">*</span>
                    </label>
                    <div className="flex gap-2" dir="ltr">
                      <select
                        value={form.patient_phone_code}
                        onChange={(e) => setForm({ ...form, patient_phone_code: e.target.value })}
                        className="w-[110px] sm:w-[140px] px-2 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white flex-shrink-0"
                      >
                        {COUNTRY_CODES.map((cc) => (
                          <option key={cc.code} value={cc.code}>
                            {cc.code} {tCountries(`c_${cc.code.replace('+', '')}` as any)} {cc.flag}
                          </option>
                        ))}
                      </select>
                      <input
                        required
                        type="tel"
                        value={form.patient_phone_number}
                        onChange={(e) => setForm({ ...form, patient_phone_number: e.target.value })}
                        className="flex-1 min-w-0 w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rtl:text-start text-end"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========== Step 2: Date & Slot ========== */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  {t("dateStep.title")}
                </h2>
                {availableDates.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar size={40} className="text-text-muted mx-auto mb-3" />
                    <p className="text-sm text-text-secondary mb-1">{t("dateStep.noDates")}</p>
                    <p className="text-xs text-text-muted">{t("dateStep.contactSupport")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <MiniCalendar availableDates={availableDates} selectedDate={selectedDate} onSelectDate={handleDateSelect} />
                    {selectedDate && (
                      <div>
                        <p className="text-xs text-text-muted mb-2">
                          {t("dateStep.availableOn")} <span className="font-medium text-text-secondary">{formatDate(selectedDate)}</span>
                        </p>
                        <TimeSlotPicker slots={daySlots} selectedSlotId={selectedSlotId} onSelectSlot={handleSlotSelect} isLoading={slotsLoading} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========== Step 3: Confirmation ========== */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-4">{t("confirmStep.title")}</h2>
                <div className="space-y-3 bg-bg rounded-xl p-5">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-text-secondary">{t("confirmStep.details.service")}</span>
                    <span className="text-sm font-medium text-text-primary">
                      {selectedService?.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-text-secondary">المبلغ المستحق</span>
                    <span className="text-sm font-bold text-primary" dir="ltr">
                      ${selectedService?.price ?? 0}
                    </span>
                  </div>

                  {selectedSlotData && (
                    <>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-sm text-text-secondary">{t("confirmStep.details.date")}</span>
                        <span className="text-sm font-medium text-text-primary">{formatDate(selectedSlotData.date)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-sm text-text-secondary">{t("confirmStep.details.time")}</span>
                        <span className="text-sm font-medium text-text-primary" dir="ltr">{formatTime(selectedSlotData.start_time)} — {formatTime(selectedSlotData.end_time)}</span>
                      </div>
                      {/* Healer name removed so customer does not see it */}
                    </>
                  )}

                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-text-secondary">{t("confirmStep.details.name")}</span>
                    <span className="text-sm font-medium text-text-primary">{form.patient_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-text-secondary">{t("confirmStep.details.email")}</span>
                    <span className="text-sm font-medium text-text-primary" dir="ltr">{form.patient_email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-text-secondary">{t("confirmStep.details.whatsapp")}</span>
                    <span className="text-sm font-medium text-text-primary" dir="ltr">{fullPhone}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-text-secondary">{t("confirmStep.details.gender")}</span>
                    <span className="text-sm font-medium text-text-primary">{form.patient_gender === "male" ? t("infoStep.male") : form.patient_gender === "female" ? t("infoStep.female") : "—"}</span>
                  </div>
                  {form.patient_nationality && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-text-secondary">{t("confirmStep.details.nationality")}</span>
                      <span className="text-sm font-medium text-text-primary">{form.patient_nationality}</span>
                    </div>
                  )}
                  {form.patient_residence && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-text-secondary">{t("confirmStep.details.residence")}</span>
                      <span className="text-sm font-medium text-text-primary">{form.patient_residence}</span>
                    </div>
                  )}
                  {maritalLabel && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-text-secondary">{t("confirmStep.details.marital")}</span>
                      <span className="text-sm font-medium text-text-primary">{maritalLabel}</span>
                    </div>
                  )}
                  {form.patient_can_travel && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-text-secondary">{t("confirmStep.details.canTravel")}</span>
                      <span className="text-sm font-medium text-text-primary">{form.patient_can_travel === "yes" ? t("infoStep.yes") : t("infoStep.no")}</span>
                    </div>
                  )}
                  {needLabel && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-text-secondary">{t("confirmStep.details.needDesc")}</span>
                      <span className="text-sm font-medium text-text-primary text-end max-w-[200px]">{needLabel}</span>
                    </div>
                  )}
                  {form.patient_previous_ruqya && (
                    <div className="pt-2">
                      <span className="text-sm text-text-secondary block mb-1">{t("confirmStep.details.previousExp")}</span>
                      <p className="text-sm text-text-primary">{form.patient_previous_ruqya}</p>
                    </div>
                  )}
                </div>


                <div className="mt-6 p-4 rounded-xl border border-border bg-gray-50/50">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      required
                      checked={form.agreed_to_terms}
                      onChange={(e) => setForm({ ...form, agreed_to_terms: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                    />
                    <span className="text-sm text-text-secondary leading-relaxed">
                      {t("confirmStep.agreeToTerms")} <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary hover:underline font-medium focus:outline-none">{t("confirmStep.termsLink")}</button> {t("confirmStep.andViewed")} <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-primary hover:underline font-medium focus:outline-none">{t("confirmStep.privacyLink")}</button> {t("confirmStep.centerText")}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              {currentStep > 0 ? (
                <button onClick={() => setCurrentStep(currentStep - 1)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors">
                  <ArrowRight size={16} className="rtl:rotate-0 ltr:rotate-180" />
                  {t("buttons.previous")}
                </button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length - 1 ? (
                <button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {t("buttons.next")}
                  <ArrowLeft size={16} className="rtl:rotate-0 ltr:rotate-180" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={isSubmitting || !form.agreed_to_terms} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-light disabled:opacity-50 transition-all">
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Phone size={16} />
                      {t("buttons.confirm")}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="شروط الخدمة">
        <div className="text-sm md:text-base text-text-secondary leading-relaxed space-y-4" dir="rtl">
          {TERMS_OF_SERVICE_TEXT.trim().split('\n').map((p, i) => <p key={i}>{p}</p>)}
          <div className="pt-4 border-t border-border mt-6">
            <Link href="/terms-of-service" target="_blank" className="text-primary hover:underline font-medium inline-flex items-center gap-1.5 focus:outline-none">
              قراءة كافة الشروط والسياسات
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="سياسة الخصوصية">
        <div className="text-sm md:text-base text-text-secondary leading-relaxed space-y-4" dir="rtl">
          {PRIVACY_POLICY_TEXT.trim().split('\n').map((p, i) => <p key={i}>{p}</p>)}
          <div className="pt-4 border-t border-border mt-6">
            <Link href="/privacy-policy" target="_blank" className="text-primary hover:underline font-medium inline-flex items-center gap-1.5 focus:outline-none">
              قراءة سياسة الخصوصية كاملة
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
