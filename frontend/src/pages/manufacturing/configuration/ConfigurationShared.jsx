import { useCommand } from "./configurationHooks";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import useProductionText from "../../../hooks/useProductionText";
import configurationMessages from "./configurationMessages";
import { validDateRange } from "./configurationHelpers";
import { generateUUID } from "../../../utils/uuid";
export const CommandRecovery = ({ command, onReload, onRecovered }) => {
  const t = useProductionText(configurationMessages);
  const [reading, setReading] = useState(false);
  if (!command.conflict && !command.uncertain && !command.refreshFailed) return null;
  const inspect = async () => {
    if (reading || command.busy) return;
    setReading(true);
    try { if (await onReload() === false) return; command.clearAfterRead(); onRecovered?.(); }
    catch (cause) { command.setError(cause.message); }
    finally { setReading(false); }
  };
  return <div className="space-y-2"><InlineMessage>{command.committed ? t("Saved change: reload its authoritative context before continuing.", { defaultValue: "Saved change: reload its authoritative context before continuing." }) : t("Reload and inspect saved configuration before another command.", { defaultValue: "Reload and inspect saved configuration before another command." })}</InlineMessage><AppButton variant="secondary" isLoading={reading} disabled={command.busy} onClick={inspect}>{t("Reload saved configuration", { defaultValue: "Reload saved configuration" })}</AppButton></div>;
};
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
export const InlineMessage = ({
  children,
  error = false
}) => {
  const t = useProductionText(configurationMessages);
  return children ? <div role={error ? "alert" : "status"} className={`whitespace-pre-line rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>{typeof children === "string" ? t(children, {
      defaultValue: children
    }) : children}</div> : null;
};
export const ActiveField = ({
  checked,
  onChange,
  disabled
}) => {
  const t = useProductionText(configurationMessages);
  return <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-brand" />{t("Active", {
      defaultValue: "Active"
    })}</label>;
};
export const Version = ({
  value
}) => {
  const t = useProductionText(configurationMessages);
  return <span className="break-all text-xs text-slate-500">{t("Version:", {
      defaultValue: "Version:"
    })} {value || "—"}</span>;
};
export const EmptyRows = ({
  children
}) => {
  const t = useProductionText(configurationMessages);
  return <p className="p-5 text-sm text-slate-500">{typeof children === "string" ? t(children, {
      defaultValue: children
    }) : children || t("No configuration records.", {
      defaultValue: "No configuration records."
    })}</p>;
};
export const DateFields = ({
  form,
  setField,
  disabled
}) => {
  const t = useProductionText(configurationMessages);
  return <div className="grid gap-4 sm:grid-cols-2"><AppInput required label={t("Effective from", {
      defaultValue: "Effective from"
    })} type="date" disabled={disabled} value={form.effectiveFrom} onChange={event => setField("effectiveFrom", event.target.value)} /><AppInput label={t("Effective to (inclusive)", {
      defaultValue: "Effective to (inclusive)"
    })} type="date" min={form.effectiveFrom || undefined} disabled={disabled} value={form.effectiveTo} onChange={event => setField("effectiveTo", event.target.value)} /></div>;
};
export const EffectiveDates = ({
  record
}) => {
  const t = useProductionText(configurationMessages);
  return <p className="text-xs text-slate-500">{record.effectiveFrom} → {record.effectiveTo || t("Open ended", {
      defaultValue: "Open ended"
    })} · {t(record.isActive ? "Active" : "Inactive", {
      defaultValue: record.isActive ? "Active" : "Inactive"
    })}</p>;
};
export const EffectivityDialog = ({
  target,
  onClose,
  onSaved
}) => {
  const t = useProductionText(configurationMessages);
  const [effectiveTo, setEffectiveTo] = useState("");
  const [reason, setReason] = useState("");
  const [key] = useState(() => generateUUID());
  const [attempt, setAttempt] = useState(null);
  const command = useCommand(async () => {
    const refreshed = await onSaved();
    if (refreshed === false) return false;
    onClose();
    return true;
  });
  const submit = () => {
    if (!validDateRange(target.record.effectiveFrom, effectiveTo) || !effectiveTo || !reason.trim()) {
      command.setError("Enter a valid closing date and reason.");
      return;
    }
    const payload = {
      version: target.record.version,
      idempotencyKey: key,
      effectiveTo,
      reason: reason.trim()
    };
    const fingerprint = JSON.stringify(payload);
    if (attempt && attempt !== fingerprint) {
      command.setError("Reload and inspect the previous command before changing a retry.");
      return;
    }
    setAttempt(fingerprint);
    void command.run(() => service.closeEffectivity(target.kind, target.record.id, payload), {
      retrySafe: true
    });
  };
  return <AppModal isOpen title={t("Close configuration effectivity", {
    defaultValue: "Close configuration effectivity"
  })} isBusy={command.busy} onClose={() => { if (!command.committed && !command.uncertain && !command.conflict) onClose(); }}><div className="space-y-4"><p className="text-sm text-slate-600">{t("Close the selected", {
          defaultValue: "Close the selected"
        })} {target.kind} {t("version. Existing transaction snapshots retain their historical configuration.", {
          defaultValue: "version. Existing transaction snapshots retain their historical configuration."
        })}</p><Version value={target.record.version} /><AppInput required type="date" label={t("Effective to (inclusive)", {
        defaultValue: "Effective to (inclusive)"
      })} min={target.record.effectiveFrom} value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} disabled={command.busy || command.committed || command.conflict || command.uncertain} /><AppInput required label={t("Reason", {
        defaultValue: "Reason"
      })} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={command.busy || command.committed || command.conflict || command.uncertain} /><InlineMessage error>{command.error}</InlineMessage><CommandRecovery command={command} onReload={onSaved} onRecovered={onClose} /><div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={command.busy || command.committed || command.conflict || command.uncertain} onClick={onClose}>{t("Cancel", {
            defaultValue: "Cancel"
          })}</AppButton><AppButton isLoading={command.busy} disabled={command.conflict || command.committed} onClick={submit}>{t("Close effectivity", {
            defaultValue: "Close effectivity"
          })}</AppButton></div></div></AppModal>;
};
export const RefreshButton = ({
  onClick,
  busy
}) => {
  const t = useProductionText(configurationMessages);
  return <AppButton variant="secondary" disabled={busy} onClick={onClick} aria-label={t("Reload configuration", {
    defaultValue: "Reload configuration"
  })}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />{t("Reload", {
      defaultValue: "Reload"
    })}</AppButton>;
};
