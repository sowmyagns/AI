import { useState } from "react";
import { X, Save } from "lucide-react";
import { useToast } from "../../context/ToastContext";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

export default function RecordPaymentModal({ isOpen, onClose, onSuccess, initialPartyType = "Customer" }) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    party_type: initialPartyType,
    party_name: "",
    payment_type: "Receipt",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_mode: "NEFT/RTGS",
    bank: "HDFC Bank",
    reference_no: "",
    utr_number: "",
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const stored = localStorage.getItem("smrt_payments");
      const list = stored ? JSON.parse(stored) : [];
      const newPayment = {
        id: Date.now(),
        payment_number: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        ...form,
        amount: Number(form.amount) || 0,
        status: "Completed",
        created_by: "Accountant",
      };
      localStorage.setItem("smrt_payments", JSON.stringify([newPayment, ...list]));
      if (addToast) addToast("Payment voucher recorded successfully", "success");
      if (onSuccess) onSuccess(newPayment);
      onClose();
    } catch {
      if (addToast) addToast("Failed to save payment voucher", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Record Payment Voucher</h3>
            <p className="text-xs text-slate-500 mt-0.5">Record customer collection receipts or vendor disbursements.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Party Type *</label>
              <select
                value={form.party_type}
                onChange={(e) => setForm((f) => ({ ...f, party_type: e.target.value }))}
                className={inputClass}
              >
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Party Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Industries Ltd"
                value={form.party_name}
                onChange={(e) => setForm((f) => ({ ...f, party_name: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={`${inputClass} text-right`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Date *</label>
              <input
                type="date"
                required
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Mode</label>
              <select
                value={form.payment_mode}
                onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value }))}
                className={inputClass}
              >
                <option value="NEFT/RTGS">NEFT / RTGS</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Account</label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank - A/C 4099"
                value={form.bank}
                onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice / Bill Ref #</label>
              <input
                type="text"
                placeholder="e.g. INV-2026-09"
                value={form.reference_no}
                onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">UTR / Trans ID</label>
              <input
                type="text"
                placeholder="e.g. UTR-982183921"
                value={form.utr_number}
                onChange={(e) => setForm((f) => ({ ...f, utr_number: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
