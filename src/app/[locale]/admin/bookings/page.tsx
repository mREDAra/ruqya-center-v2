/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/helpers";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { Search, Filter, Eye, Trash2, Check, UserPlus } from "lucide-react";
import { notifyHealerAssignedAndPatientConfirmed } from "@/app/actions/adminEmails";

const MARITAL_LABELS: Record<string, string> = {
  single: "أعزب/عزباء",
  married: "متزوج/ة",
  divorced: "منفصل/ة",
  widowed: "أرمل/ة",
};

const NEED_LABELS: Record<string, string> = {
  initial_assessment: "توجيه أولي وتقييم",
  special_followup: "متابعة خاصة",
  need_specialist_opinion: "رأي المختص",
};

interface Booking {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  patient_age: number;
  patient_gender: string;
  patient_nationality: string;
  patient_country: string;
  patient_marital_status: string;
  patient_previous_ruqya: string;
  patient_can_travel: boolean;
  patient_need_type: string;
  patient_notes: string;
  admin_notes: string;
  status: string;
  payment_status: string;
  healer_id: string;
  created_at: string;
  services: { name: string } | null;
  healers: { display_name: string } | null;
}

interface Healer {
  id: string;
  display_name: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [healers, setHealers] = useState<Healer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const supabase = createClient();

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from("bookings")
      .select("*, services(name), healers(display_name)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const [bookingsRes, healersRes] = await Promise.all([
      query,
      supabase.from("healers").select("id, display_name"),
    ]);

    setBookings((bookingsRes.data as unknown as Booking[]) || []);
    setHealers((healersRes.data as unknown as Healer[]) || []);
    setIsLoading(false);
  }, [statusFilter, supabase]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    if (status === "confirmed") {
        notifyHealerAssignedAndPatientConfirmed(id).catch(console.error);
    }
    loadBookings();
    if (selectedBooking?.id === id) setSelectedBooking({ ...selectedBooking, status });
  };

  const updatePayment = async (id: string, payment_status: string) => {
    await supabase.from("bookings").update({ payment_status }).eq("id", id);
    loadBookings();
    if (selectedBooking?.id === id) setSelectedBooking({ ...selectedBooking, payment_status });
  };

  const assignHealer = async (bookingId: string, healerId: string) => {
    if (!healerId) {
      await supabase.from("bookings").update({ healer_id: null }).eq("id", bookingId);
      loadBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({
          ...selectedBooking,
          healer_id: "",
          healers: null,
        });
      }
      return;
    }

    // Assigning a healer confirms the booking automatically
    await supabase.from("bookings").update({ healer_id: healerId, status: "confirmed" }).eq("id", bookingId);
    
    notifyHealerAssignedAndPatientConfirmed(bookingId).catch(console.error);
    
    loadBookings();
    const healer = healers.find((h) => h.id === healerId);
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking({
        ...selectedBooking,
        healer_id: healerId,
        status: "confirmed",
        healers: healer ? { display_name: healer.display_name } : null,
      });
    }
  };

  const updateAdminNotes = async (id: string, admin_notes: string) => {
    await supabase.from("bookings").update({ admin_notes }).eq("id", id);
    if (selectedBooking?.id === id) setSelectedBooking({ ...selectedBooking, admin_notes });
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;
    await supabase.from("bookings").delete().eq("id", id);
    loadBookings();
    setSelectedBooking(null);
  };

  const filtered = bookings.filter((b) =>
    !searchTerm || b.patient_name?.includes(searchTerm) || b.patient_phone?.includes(searchTerm)
  );

  const statusBadgeVariant: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
    pending: "warning", confirmed: "info", completed: "success", cancelled: "error", no_show: "error",
  };

  const paymentBadgeVariant: Record<string, "success" | "warning" | "error"> = {
    pending: "warning", paid: "success", refunded: "error",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">إدارة الحجوزات</h1>
          <p className="text-text-secondary text-sm mt-1">{bookings.length} حجز</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full ps-10 pe-4 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">جميع الحالات</option>
            {Object.entries(BOOKING_STATUSES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="text-start px-4 py-3 text-xs font-semibold text-text-secondary">المريض</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-text-secondary hidden md:table-cell">الخدمة</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-text-secondary hidden lg:table-cell">المعالج</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-text-secondary">الحالة</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-text-secondary hidden sm:table-cell">الدفع</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-text-secondary hidden lg:table-cell">التاريخ</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-text-secondary">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-text-secondary">جاري التحميل...</span>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12">
                <EmptyState title="لا توجد حجوزات" description="لم يتم العثور على حجوزات مطابقة" />
              </td></tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{b.patient_name}</p>
                    <p className="text-xs text-text-muted" dir="ltr">{b.patient_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell">{b.services?.name || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {b.healers?.display_name ? (
                      <span className="text-sm text-text-primary">{b.healers.display_name}</span>
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">غير معيّن</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant[b.status] || "default"}>
                      {BOOKING_STATUSES[b.status as keyof typeof BOOKING_STATUSES]?.label || b.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={paymentBadgeVariant[b.payment_status] || "default"}>
                      {PAYMENT_STATUSES[b.payment_status as keyof typeof PAYMENT_STATUSES]?.label || b.payment_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell">{formatDate(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedBooking(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary hover:text-primary transition-colors" title="عرض">
                        <Eye size={16} />
                      </button>
                      {b.status === "pending" && (
                        <button onClick={() => updateStatus(b.id, "confirmed")} className="p-1.5 rounded-lg hover:bg-green-50 text-text-secondary hover:text-green-600 transition-colors" title="تأكيد">
                          <Check size={16} />
                        </button>
                      )}
                      <button onClick={() => deleteBooking(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors" title="حذف">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} title="تفاصيل الحجز" size="lg">
        {selectedBooking && (
          <div className="space-y-6">
            {/* Patient Details */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">بيانات المريض</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-text-muted mb-0.5">الاسم</p><p className="text-sm font-medium">{selectedBooking.patient_name}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">الهاتف / الواتساب</p><p className="text-sm font-medium" dir="ltr">{selectedBooking.patient_phone}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">البريد</p><p className="text-sm font-medium" dir="ltr">{selectedBooking.patient_email || "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">العمر</p><p className="text-sm font-medium">{selectedBooking.patient_age || "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">الجنس</p><p className="text-sm font-medium">{selectedBooking.patient_gender === "male" ? "ذكر" : selectedBooking.patient_gender === "female" ? "أنثى" : "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">الجنسية</p><p className="text-sm font-medium">{selectedBooking.patient_nationality || "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">الإقامة الحالية</p><p className="text-sm font-medium">{selectedBooking.patient_country || "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">الحالة الاجتماعية</p><p className="text-sm font-medium">{MARITAL_LABELS[selectedBooking.patient_marital_status] || "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">إمكانية السفر</p><p className="text-sm font-medium">{selectedBooking.patient_can_travel === true ? "نعم" : selectedBooking.patient_can_travel === false ? "لا" : "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">وصف الحاجة</p><p className="text-sm font-medium">{NEED_LABELS[selectedBooking.patient_need_type] || "—"}</p></div>
              </div>
            </div>

            {/* Notes & Previous Ruqya */}
            {selectedBooking.patient_notes && selectedBooking.patient_notes.replace(selectedBooking.patient_previous_ruqya || "", "").trim() && (
              <div className="bg-bg rounded-lg p-4">
                <p className="text-xs text-text-muted mb-1">تفاصيل الاستشارة / ملاحظات</p>
                <p className="text-sm whitespace-pre-wrap">{selectedBooking.patient_notes.replace(selectedBooking.patient_previous_ruqya || "", "").trim()}</p>
              </div>
            )}

            {selectedBooking.patient_previous_ruqya && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-xs text-blue-800 font-semibold mb-2">إجابة سؤال: هل ذهبت من قبل إلى رقاة؟ وما هي المشاكل التي تعاني منها؟</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{selectedBooking.patient_previous_ruqya}</p>
              </div>
            )}

            {/* Service & Booking info */}
            <div className="bg-bg rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-text-muted mb-0.5">الخدمة</p><p className="text-sm font-medium">{selectedBooking.services?.name || "—"}</p></div>
                <div><p className="text-xs text-text-muted mb-0.5">تاريخ التسجيل</p><p className="text-sm font-medium">{formatDate(selectedBooking.created_at)}</p></div>
              </div>
            </div>

            {/* Assign Healer */}
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <label className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <UserPlus size={16} />
                تعيين لمعالج
              </label>
              <select
                value={selectedBooking.healer_id || ""}
                onChange={(e) => assignHealer(selectedBooking.id, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-2"
              >
                <option value="">— غير محدد —</option>
                {healers.map((h) => (
                  <option key={h.id} value={h.id}>{h.display_name}</option>
                ))}
              </select>
            </div>

            {/* Status & Payment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">حالة الحجز</label>
                <select
                  value={selectedBooking.status}
                  onChange={(e) => updateStatus(selectedBooking.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(BOOKING_STATUSES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">حالة الدفع</label>
                <select
                  value={selectedBooking.payment_status}
                  onChange={(e) => updatePayment(selectedBooking.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(PAYMENT_STATUSES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">ملاحظات داخلية (للأدمن فقط)</label>
              <textarea
                rows={2}
                value={selectedBooking.admin_notes || ""}
                onChange={(e) => {
                  setSelectedBooking({ ...selectedBooking, admin_notes: e.target.value });
                }}
                onBlur={(e) => updateAdminNotes(selectedBooking.id, e.target.value)}
                placeholder="أضف ملاحظات داخلية..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
