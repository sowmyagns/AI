import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from "lucide-react";

import { getUsers } from "../../api/adminApi";
import { getCompanySettings, updateCompanySettings } from "../../api/settingsApi";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../context/SettingsContext";
import { useToast } from "../../context/ToastContext";
import AuditLogsPanel from "../../components/settings/AuditLogsPanel";
import LoginHistoryPanel from "../../components/settings/LoginHistoryPanel";
import AccountOverviewCard from "../../components/settings/AccountOverviewCard";
import SettingsDeliveryLocation from "./SettingsDeliveryLocation";
import SettingsDocumentNumberFormat from "./SettingsDocumentNumberFormat";
import SettingsMyPermissions from "./SettingsMyPermissions";
import SettingsMySubscription from "./SettingsMySubscription";
import SettingsTeams from "./SettingsTeams";
import SettingsUsers from "./SettingsUsers";
import {
  Field,
  PanelShell,
  SectionCard,
  ToggleRow,
  inputClass,
} from "./settingsUi";

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            active === t.id
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CompanySection() {
  const { addToast } = useToast();
  const { updateCurrency, updateLanguage, currency, language } = useSettings();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getCompanySettings();
        if (!active) return;
        let regional = {};
        try {
          regional = JSON.parse(localStorage.getItem("gns-company-regional") || "{}");
        } catch {
          regional = {};
        }
        const data = {
          company_name: "",
          legal_name: "",
          gstin: "",
          pan: "",
          email: "",
          phone: "",
          website: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state: "",
          pincode: "",
          ...(res.data || {}),
        };
        data.country = data.country || regional.country || "India";
        data.timezone = data.timezone || regional.timezone || "Asia/Kolkata";
        data.currency = data.currency || regional.currency || currency || "INR";
        data.language = data.language || regional.language || language || "English";
        setForm(data);
        setBaseline(data);
      } catch {
        if (active) addToast("Failed to load company profile", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [addToast, currency, language]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        company_name: form.company_name || null,
        legal_name: form.legal_name || null,
        gstin: form.gstin || null,
        pan: form.pan || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
      };
      await updateCompanySettings(payload);
      if (form.currency) updateCurrency(form.currency);
      if (form.language) updateLanguage(form.language);
      try {
        localStorage.setItem(
          "gns-company-regional",
          JSON.stringify({
            country: form.country,
            timezone: form.timezone,
            currency: form.currency,
            language: form.language,
          })
        );
      } catch {
        /* ignore */
      }
      setBaseline(form);
      addToast("Company profile saved successfully.", "success");
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to save company profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <PanelShell
      title="Company Profile"
      description="Legal identity, tax IDs, contact details, and regional defaults."
      actions={
        <>
          <button
            type="button"
            onClick={() => setForm(baseline)}
            className="ui-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="ui-btn-primary disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </>
      }
    >
      <SectionCard title="Brand">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-2xl font-bold text-teal-700 dark:border-slate-600 dark:bg-slate-900">
            {(form.company_name || "G").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Company Logo</p>
            <p className="text-xs text-slate-500">Shown on invoices and the app header. Upload coming soon.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company Name *">
            <input className={inputClass} value={form.company_name || ""} onChange={set("company_name")} />
          </Field>
          <Field label="Legal Name">
            <input className={inputClass} value={form.legal_name || ""} onChange={set("legal_name")} />
          </Field>
          <Field label="GST Number">
            <input className={inputClass} value={form.gstin || ""} onChange={set("gstin")} placeholder="22AAAAA0000A1Z5" />
          </Field>
          <Field label="PAN Number">
            <input className={inputClass} value={form.pan || ""} onChange={set("pan")} placeholder="AAAAA0000A" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputClass} value={form.email || ""} onChange={set("email")} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone || ""} onChange={set("phone")} />
          </Field>
          <Field label="Website" className="sm:col-span-2">
            <input className={inputClass} value={form.website || ""} onChange={set("website")} placeholder="https://" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address" className="sm:col-span-2">
            <input className={inputClass} value={form.address_line1 || ""} onChange={set("address_line1")} />
          </Field>
          <Field label="Address Line 2" className="sm:col-span-2">
            <input className={inputClass} value={form.address_line2 || ""} onChange={set("address_line2")} />
          </Field>
          <Field label="City">
            <input className={inputClass} value={form.city || ""} onChange={set("city")} />
          </Field>
          <Field label="State">
            <input className={inputClass} value={form.state || ""} onChange={set("state")} />
          </Field>
          <Field label="Country">
            <input className={inputClass} value={form.country || ""} onChange={set("country")} />
          </Field>
          <Field label="PIN Code">
            <input className={inputClass} value={form.pincode || ""} onChange={set("pincode")} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Regional">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Timezone">
            <select className={inputClass} value={form.timezone || "Asia/Kolkata"} onChange={set("timezone")}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </Field>
          <Field label="Currency">
            <select className={inputClass} value={form.currency || "INR"} onChange={set("currency")}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </Field>
          <Field label="Language">
            <select className={inputClass} value={form.language || "English"} onChange={set("language")}>
              <option value="English">English</option>
              <option value="Telugu">తెలుగు</option>
              <option value="Hindi">हिन्दी</option>
              <option value="Tamil">தமிழ்</option>
            </select>
          </Field>
        </div>
      </SectionCard>
    </PanelShell>
  );
}

function UsersSection() {
  const [tab, setTab] = useState("users");
  const { user } = useAuth();
  const [stats, setStats] = useState({ active: 0, inactive: 0 });

  useEffect(() => {
    const tenantId = user?.tenant_id ?? 1;
    getUsers(tenantId)
      .then((r) => {
        const rows = r.data || [];
        setStats({
          active: rows.filter((u) => u.is_active !== false && u.status !== "inactive").length,
          inactive: rows.filter((u) => u.is_active === false || u.status === "inactive").length,
        });
      })
      .catch(() => {});
  }, [user?.tenant_id]);

  return (
    <PanelShell
      title="User Management"
      description="Manage active users, teams, roles, and access permissions."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <SectionCard>
          <p className="text-xs font-medium uppercase text-slate-500">Active Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs font-medium uppercase text-slate-500">Inactive Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.inactive}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs font-medium uppercase text-slate-500">Quick actions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to="/admin/users" className="ui-btn-primary text-xs">
              <Plus className="h-3.5 w-3.5" /> Create / Invite
            </Link>
            <Link to="/admin/roles" className="ui-btn-secondary text-xs">
              Roles
            </Link>
          </div>
        </SectionCard>
      </div>

      <Tabs
        tabs={[
          { id: "users", label: "Users" },
          { id: "teams", label: "Teams & Departments" },
          { id: "permissions", label: "Permissions" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:p-5">
        {tab === "users" && <SettingsUsers />}
        {tab === "teams" && <SettingsTeams />}
        {tab === "permissions" && <SettingsMyPermissions />}
      </div>
    </PanelShell>
  );
}

function SecuritySection() {
  const { addToast } = useToast();
  const [tab, setTab] = useState("audit");
  const [policy, setPolicy] = useState({
    minLength: 8,
    upper: true,
    lower: true,
    number: true,
    special: true,
    twoFactor: false,
    lockAttempts: 5,
    lockMinutes: 30,
    otpEnabled: true,
  });

  return (
    <PanelShell
      title="Security"
      description="Enterprise audit trail, login history, password policy, and sessions."
      actions={
        tab === "policy" ? (
          <button
            type="button"
            className="ui-btn-primary"
            onClick={() => addToast("Security preferences saved on this device.", "success")}
          >
            <Save className="h-4 w-4" /> Save
          </button>
        ) : null
      }
    >
      <Tabs
        tabs={[
          { id: "audit", label: "Audit Logs" },
          { id: "history", label: "Login History" },
          { id: "policy", label: "Password & 2FA" },
          { id: "sessions", label: "Sessions" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "audit" && (
        <SectionCard>
          <AuditLogsPanel />
        </SectionCard>
      )}

      {tab === "history" && (
        <SectionCard>
          <LoginHistoryPanel />
        </SectionCard>
      )}

      {tab === "policy" && (
        <SectionCard title="Password & access">
          <div className="space-y-2">
            <ToggleRow
              label="Require uppercase, lowercase, number & special character"
              checked={policy.upper && policy.special}
              onChange={(v) => setPolicy((p) => ({ ...p, upper: v, lower: v, number: v, special: v }))}
            />
            <ToggleRow
              label="Two-factor authentication (2FA)"
              description="Require OTP after password for admin accounts."
              checked={policy.twoFactor}
              onChange={(v) => setPolicy((p) => ({ ...p, twoFactor: v }))}
            />
            <ToggleRow
              label="OTP for Super Admin login"
              checked={policy.otpEnabled}
              onChange={(v) => setPolicy((p) => ({ ...p, otpEnabled: v }))}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Minimum password length">
              <input
                type="number"
                min={8}
                className={inputClass}
                value={policy.minLength}
                onChange={(e) => setPolicy((p) => ({ ...p, minLength: Number(e.target.value) || 8 }))}
              />
            </Field>
            <Field label="Lock after failed attempts">
              <input
                type="number"
                min={3}
                className={inputClass}
                value={policy.lockAttempts}
                onChange={(e) => setPolicy((p) => ({ ...p, lockAttempts: Number(e.target.value) || 5 }))}
              />
            </Field>
            <Field label="Lock duration (minutes)">
              <input
                type="number"
                min={5}
                className={inputClass}
                value={policy.lockMinutes}
                onChange={(e) => setPolicy((p) => ({ ...p, lockMinutes: Number(e.target.value) || 30 }))}
              />
            </Field>
          </div>
        </SectionCard>
      )}

      {tab === "sessions" && (
        <SectionCard title="Sessions & devices">
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">This browser</p>
                  <p className="text-xs text-slate-500">Current session · Active now</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Trusted
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Change password from your profile or use Forgot Password on the login page.
            </p>
            <Link to="/forgot-password" className="inline-flex text-sm font-semibold text-teal-600 hover:underline">
              Reset password →
            </Link>
          </div>
        </SectionCard>
      )}
    </PanelShell>
  );
}

function AppearanceSection() {
  const {
    theme,
    language,
    updateTheme,
    updateLanguage,
  } = useSettings();
  const { addToast } = useToast();
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("gns-font-size") || "medium");
  const [compact, setCompact] = useState(() => localStorage.getItem("gns-compact") === "true");
  const [accent, setAccent] = useState(() => localStorage.getItem("gns-accent") || "teal");

  const saveLocal = () => {
    localStorage.setItem("gns-font-size", fontSize);
    localStorage.setItem("gns-compact", compact ? "true" : "false");
    localStorage.setItem("gns-accent", accent);
    document.documentElement.dataset.fontSize = fontSize;
    document.documentElement.dataset.compact = compact ? "true" : "false";
    addToast("Appearance preferences saved.", "success");
  };

  return (
    <PanelShell
      title="Appearance"
      description="Theme, language, and display density for your workspace."
      actions={
        <button type="button" className="ui-btn-primary" onClick={saveLocal}>
          <Save className="h-4 w-4" /> Save
        </button>
      }
    >
      <SectionCard title="Theme">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "system", label: "System" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (opt.id === "system") {
                  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  updateTheme(prefersDark ? "dark" : "light");
                } else {
                  updateTheme(opt.id);
                }
              }}
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                (opt.id === "system" ? false : theme === opt.id) ||
                (opt.id !== "system" && theme === opt.id)
                  ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
                  : "border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Language & display">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Language">
            <select
              className={inputClass}
              value={language}
              onChange={(e) => updateLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Telugu">తెలుగు</option>
              <option value="Hindi">हिन्दी</option>
              <option value="Tamil">தமிழ்</option>
            </select>
          </Field>
          <Field label="Font size">
            <select className={inputClass} value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </Field>
          <Field label="Accent color">
            <select className={inputClass} value={accent} onChange={(e) => setAccent(e.target.value)}>
              <option value="teal">Teal</option>
              <option value="blue">Blue</option>
              <option value="violet">Violet</option>
              <option value="emerald">Emerald</option>
            </select>
          </Field>
          <div className="flex items-end">
            <ToggleRow
              label="Compact mode"
              description="Reduce spacing for dense dashboards."
              checked={compact}
              onChange={setCompact}
            />
          </div>
        </div>
      </SectionCard>
    </PanelShell>
  );
}

function NotificationsSection() {
  const { notifyEmail, notifyPush, updateNotifyEmail, updateNotifyPush } = useSettings();
  const { addToast } = useToast();
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gns-notify-prefs") || "{}");
    } catch {
      return {};
    }
  });

  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));

  const save = () => {
    localStorage.setItem("gns-notify-prefs", JSON.stringify(prefs));
    addToast("Notification preferences saved.", "success");
  };

  return (
    <PanelShell
      title="Notifications"
      description="Choose how GNS Insights alerts you about operations and system events."
      actions={
        <button type="button" className="ui-btn-primary" onClick={save}>
          <Save className="h-4 w-4" /> Save
        </button>
      }
    >
      <SectionCard title="Channels">
        <div className="space-y-2">
          <ToggleRow label="Email notifications" checked={notifyEmail} onChange={updateNotifyEmail} />
          <ToggleRow label="Push notifications" checked={notifyPush} onChange={updateNotifyPush} />
          <ToggleRow label="SMS notifications" checked={!!prefs.sms} onChange={(v) => setPref("sms", v)} />
          <ToggleRow
            label="Desktop notifications"
            checked={!!prefs.desktop}
            onChange={(v) => setPref("desktop", v)}
          />
        </div>
      </SectionCard>
      <SectionCard title="Operational alerts">
        <div className="space-y-2">
          <ToggleRow label="Low stock alerts" checked={prefs.lowStock !== false} onChange={(v) => setPref("lowStock", v)} />
          <ToggleRow label="Production alerts" checked={prefs.production !== false} onChange={(v) => setPref("production", v)} />
          <ToggleRow label="Machine alerts" checked={prefs.machine !== false} onChange={(v) => setPref("machine", v)} />
        </div>
      </SectionCard>
    </PanelShell>
  );
}

function AiSection() {
  const { addToast } = useToast();
  const [cfg, setCfg] = useState(() => {
    try {
      return {
        enabled: true,
        copilot: true,
        provider: "openai",
        model: "gpt-4.1",
        apiKey: "",
        ...JSON.parse(localStorage.getItem("gns-ai-settings") || "{}"),
      };
    } catch {
      return { enabled: true, copilot: true, provider: "openai", model: "gpt-4.1", apiKey: "" };
    }
  });

  const save = () => {
    localStorage.setItem("gns-ai-settings", JSON.stringify(cfg));
    addToast("AI settings saved on this device. Server keys use backend/.env.", "success");
  };

  return (
    <PanelShell
      title="AI & LLM"
      description="Configure assistant providers, models, and usage preferences."
      actions={
        <button type="button" className="ui-btn-primary" onClick={save}>
          <Save className="h-4 w-4" /> Save
        </button>
      }
    >
      <SectionCard title="Features">
        <div className="space-y-2">
          <ToggleRow
            label="Enable AI Assistant"
            checked={cfg.enabled}
            onChange={(v) => setCfg((c) => ({ ...c, enabled: v }))}
          />
          <ToggleRow
            label="Enable Operator Copilot"
            checked={cfg.copilot}
            onChange={(v) => setCfg((c) => ({ ...c, copilot: v }))}
          />
        </div>
      </SectionCard>
      <SectionCard title="Provider">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="LLM Provider">
            <select
              className={inputClass}
              value={cfg.provider}
              onChange={(e) => setCfg((c) => ({ ...c, provider: e.target.value }))}
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="azure">Azure OpenAI</option>
              <option value="ollama">Ollama</option>
              <option value="deepseek">DeepSeek</option>
            </select>
          </Field>
          <Field label="Model">
            <input
              className={inputClass}
              value={cfg.model}
              onChange={(e) => setCfg((c) => ({ ...c, model: e.target.value }))}
              placeholder="gpt-4.1"
            />
          </Field>
          <Field label="API Key (stored locally)" className="sm:col-span-2">
            <input
              type="password"
              className={inputClass}
              value={cfg.apiKey}
              onChange={(e) => setCfg((c) => ({ ...c, apiKey: e.target.value }))}
              placeholder="sk-… (optional local override)"
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Production keys should be set as <code className="rounded bg-slate-100 px-1">LLM_API_KEY</code> in{" "}
          <code className="rounded bg-slate-100 px-1">backend/.env</code>.
        </p>
      </SectionCard>
      <SectionCard title="Usage">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Requests (30d)", value: "—" },
            { label: "Tokens (30d)", value: "—" },
            { label: "Prompt templates", value: "Ready" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
              <p className="text-xs uppercase text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </PanelShell>
  );
}

function InventorySection() {
  const [tab, setTab] = useState("warehouses");
  return (
    <PanelShell title="Inventory Settings" description="Warehouses, tracking rules, and stock defaults.">
      <Tabs
        tabs={[
          { id: "warehouses", label: "Warehouses" },
          { id: "rules", label: "Tracking rules" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "warehouses" ? (
        <SettingsDeliveryLocation />
      ) : (
        <SectionCard title="Defaults">
          <div className="space-y-2">
            <ToggleRow label="Barcode scanning" checked onChange={() => {}} />
            <ToggleRow label="Batch tracking" checked onChange={() => {}} />
            <ToggleRow label="Expiry tracking" checked={false} onChange={() => {}} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Advanced unit masters and low-stock limits are managed under Inventory modules.
          </p>
          <Link to="/inventory/warehouses" className="mt-3 inline-flex text-sm font-semibold text-teal-600 hover:underline">
            Open Inventory →
          </Link>
        </SectionCard>
      )}
    </PanelShell>
  );
}

function ProductionSection() {
  return (
    <PanelShell title="Production Settings" description="Shifts, work orders, machines, and scheduling defaults.">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Shift timings", desc: "Define plant shifts and working hours.", to: "/hr/shifts" },
          { title: "Work orders", desc: "Manage WO lifecycle and shop-floor flow.", to: "/production/work-orders" },
          { title: "Machine allocation", desc: "Assign machines and monitor status.", to: "/production/machines" },
          { title: "Production calendar", desc: "Plan capacity and schedules.", to: "/production/schedule" },
        ].map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-600">
              Configure <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
      <SectionCard title="Automation">
        <ToggleRow label="Auto scheduling" description="Suggest WO allocation from demand." checked={false} onChange={() => {}} />
      </SectionCard>
    </PanelShell>
  );
}

function FinanceSection() {
  const [tab, setTab] = useState("tax");
  return (
    <PanelShell title="Finance Settings" description="GST, tax rules, invoice numbering, and FY defaults.">
      <Tabs
        tabs={[
          { id: "tax", label: "GST & Tax" },
          { id: "docs", label: "Invoice prefix" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "tax" ? (
        <SectionCard>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Tax options and GST defaults are stored with company settings.
          </p>
          <Link to="/settings/company" className="ui-btn-primary text-sm">
            Edit company tax fields
          </Link>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/accounts" className="rounded-xl border border-slate-200 p-4 text-sm hover:border-teal-300 dark:border-slate-700">
              Open Accounts module →
            </Link>
            <Link to="/finance/general-ledger" className="rounded-xl border border-slate-200 p-4 text-sm hover:border-teal-300 dark:border-slate-700">
              General Ledger →
            </Link>
          </div>
        </SectionCard>
      ) : (
        <SettingsDocumentNumberFormat />
      )}
    </PanelShell>
  );
}

function DocumentsSection() {
  const [tab, setTab] = useState("numbers");
  return (
    <PanelShell title="Documents" description="Templates, letterheads, and document number formats.">
      <Tabs
        tabs={[
          { id: "numbers", label: "Number format" },
          { id: "templates", label: "Templates" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "numbers" ? (
        <SettingsDocumentNumberFormat />
      ) : (
        <SectionCard title="Company documents">
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>• Invoice templates & letterheads</li>
            <li>• Company logo on documents</li>
            <li>• Terms & conditions blocks</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Upload workflows can be extended from the Documents module.
          </p>
        </SectionCard>
      )}
    </PanelShell>
  );
}

function IntegrationsSection() {
  const items = [
    { name: "Email (SMTP)", status: "Configured via .env" },
    { name: "SMS OTP", status: "Optional" },
    { name: "WhatsApp", status: "Coming soon" },
    { name: "Google", status: "Coming soon" },
    { name: "Microsoft", status: "Coming soon" },
    { name: "Payment Gateway", status: "Coming soon" },
  ];
  return (
    <PanelShell title="Integrations" description="Connect email, messaging, identity, and payment services.">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
              <p className="text-xs text-slate-500">{item.status}</p>
            </div>
            <PuzzleBadge />
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function PuzzleBadge() {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      Manage
    </span>
  );
}

function ApiSection() {
  const { addToast } = useToast();
  const [keys, setKeys] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gns-api-keys") || "[]");
    } catch {
      return [];
    }
  });

  const generate = () => {
    const key = `gns_${crypto.randomUUID().replace(/-/g, "")}`;
    const next = [{ id: key.slice(0, 12), key, createdAt: new Date().toISOString() }, ...keys];
    setKeys(next);
    localStorage.setItem("gns-api-keys", JSON.stringify(next));
    addToast("API key generated (stored locally for demo).", "success");
  };

  const revoke = (id) => {
    const next = keys.filter((k) => k.id !== id);
    setKeys(next);
    localStorage.setItem("gns-api-keys", JSON.stringify(next));
    addToast("API key revoked.", "success");
  };

  return (
    <PanelShell
      title="API & Webhooks"
      description="Developer access keys and webhook endpoints."
      actions={
        <button type="button" className="ui-btn-primary" onClick={generate}>
          <KeyRound className="h-4 w-4" /> Generate API Key
        </button>
      }
    >
      <SectionCard title="API keys">
        {keys.length === 0 ? (
          <p className="text-sm text-slate-500">No API keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-700"
              >
                <code className="text-xs text-slate-700 dark:text-slate-200">{k.key.slice(0, 18)}…</code>
                <button type="button" onClick={() => revoke(k.id)} className="text-xs font-semibold text-red-600">
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="Webhooks">
        <Field label="Webhook URL">
          <input className={inputClass} placeholder="https://example.com/hooks/gns" />
        </Field>
        <p className="mt-2 text-xs text-slate-500">Webhook delivery pipeline can be enabled per environment.</p>
      </SectionCard>
    </PanelShell>
  );
}

function BackupSection() {
  const { addToast } = useToast();
  return (
    <PanelShell title="Backup & Restore" description="Protect your SQLite database with scheduled backups.">
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Actions">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="ui-btn-primary"
              onClick={() => addToast("Backup started. Download from server backups folder when ready.", "success")}
            >
              <Download className="h-4 w-4" /> Backup Database
            </button>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => addToast("Restore requires admin confirmation on the server.", "error")}
            >
              <RefreshCw className="h-4 w-4" /> Restore Database
            </button>
          </div>
        </SectionCard>
        <SectionCard title="Schedule">
          <ToggleRow label="Automatic daily backup" checked onChange={() => {}} />
          <Field label="Backup time">
            <input type="time" className={inputClass} defaultValue="02:00" />
          </Field>
        </SectionCard>
      </div>
    </PanelShell>
  );
}

function AuditSection() {
  return (
    <PanelShell title="Audit Logs" description="Track logins, role changes, and sensitive system activity.">
      <SectionCard>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Full audit trails are available in Admin Access Logs.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/audit-logs" className="ui-btn-primary">
            Open Audit Logs
          </Link>
          <Link to="/admin/access-logs" className="ui-btn-secondary">
            Login / Access History
          </Link>
        </div>
      </SectionCard>
    </PanelShell>
  );
}

function HelpSection() {
  return (
    <PanelShell title="Help & Support" description="Documentation, tickets, and contact options.">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Documentation", desc: "Product guides and ERP workflows." },
          { title: "Raise Ticket", desc: "Report an issue to GNS Softwares support." },
          { title: "FAQ", desc: "Common questions about login, roles, and modules." },
          { title: "Contact Support", desc: "info@gnssoftwares.com" },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function MyAccountSection() {
  return (
    <PanelShell title="My Account" description="Your live profile, company, and subscription overview.">
      <AccountOverviewCard />
    </PanelShell>
  );
}

function AboutSection() {
  const { user } = useAuth();
  return (
    <PanelShell title="About System" description="Application and environment information.">
      <SectionCard>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Application", "GNS Insights ERP"],
            ["Version", "1.0.0"],
            ["Build", "2026.07"],
            ["License", user?.license_status || "Active"],
            ["Plan", user?.subscription_plan || "Trial"],
            ["Database", "SQLite"],
            ["Company", user?.company_name || user?.tenant_name || "—"],
            ["Last update", "July 2026"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-700">
              <dt className="text-xs uppercase text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" /> System healthy
        </p>
      </SectionCard>
    </PanelShell>
  );
}

function SubscriptionSection() {
  return (
    <PanelShell title="Subscription" description="Plan, licenses, trial status, and billing.">
      <SettingsMySubscription />
    </PanelShell>
  );
}

export default function SettingsSectionContent({ sectionId }) {
  const map = useMemo(
    () => ({
      "my-account": MyAccountSection,
      company: CompanySection,
      users: UsersSection,
      security: SecuritySection,
      subscription: SubscriptionSection,
      ai: AiSection,
      notifications: NotificationsSection,
      appearance: AppearanceSection,
      inventory: InventorySection,
      production: ProductionSection,
      finance: FinanceSection,
      documents: DocumentsSection,
      integrations: IntegrationsSection,
      api: ApiSection,
      backup: BackupSection,
      audit: AuditSection,
      help: HelpSection,
      about: AboutSection,
    }),
    []
  );

  const Comp = map[sectionId];
  if (!Comp) return null;
  return <Comp />;
}
