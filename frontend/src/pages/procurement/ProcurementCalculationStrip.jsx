import { Database } from "lucide-react";

import {
  PLANNING_ROUNDING_RULE_LABELS,
} from "../../constants/procurementEnums";
import {
  formatProcurementDecimal,
  formatProcurementQuantity,
} from "./procurementHelpers";
import { getCalculationSteps } from "./home/procurementHomeHelpers";
import { ProcurementPill } from "./ProcurementShared";

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const ProcurementCalculationStrip = ({ line }) => {
  const steps = getCalculationSteps(line).filter((step) => hasValue(step.value));
  const groups = Object.values(
    steps.reduce((result, step) => {
      const key = step.group ?? "calculation";
      result[key] = [...(result[key] ?? []), step];
      return result;
    }, {}),
  );
  const rounding =
    PLANNING_ROUNDING_RULE_LABELS[line?.roundingRule] ?? line?.roundingRule;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="space-y-2">
        {groups.map((group, groupIndex) => (
          <div key={group[0]?.group ?? groupIndex} className="flex flex-wrap items-center gap-2">
            {group.map((step, index) => (
              <div key={step.key} className="contents">
                {index > 0 && (
                  <span className="min-w-4 text-center text-sm font-semibold text-slate-400">
                    {step.operatorBefore ?? "→"}
                  </span>
                )}
                <div className="min-w-28 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {step.label}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                    {formatProcurementQuantity(step.value)}
                    {step.suffix ? ` ${step.suffix}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <Database className="h-3.5 w-3.5" />
        <span>Server calculation</span>
        {hasValue(line?.leadTimeSource) && (
          <ProcurementPill tone="brand">
            Effective lead time: {formatProcurementQuantity(line?.leadTimeDays)} days · {line.leadTimeSource}
          </ProcurementPill>
        )}
        {hasValue(line?.safetyFactor) && (
          <ProcurementPill tone="slate">
            Safety factor {formatProcurementDecimal(line.safetyFactor)}
          </ProcurementPill>
        )}
        {hasValue(line?.minimumOrderQuantity) && (
          <ProcurementPill tone="slate">
            Minimum order {formatProcurementDecimal(line.minimumOrderQuantity)}
          </ProcurementPill>
        )}
        {hasValue(line?.orderMultiple) && (
          <ProcurementPill tone="slate">
            Order multiple {formatProcurementDecimal(line.orderMultiple)}
          </ProcurementPill>
        )}
        {hasValue(rounding) && <ProcurementPill tone="slate">{rounding}</ProcurementPill>}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Values are displayed exactly from the planning preview. The browser does not
        recalculate procurement quantities. Lead-time precedence: override → history
        average → configured.
      </p>
    </div>
  );
};

export default ProcurementCalculationStrip;
