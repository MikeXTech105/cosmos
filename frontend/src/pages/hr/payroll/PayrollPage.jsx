import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  CheckCircle2,
  Download,
  IndianRupee,
  Play,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { hrEmployeeService } from "../../../services/hr/employeeService";
import {
  approveHrPayroll,
  fetchHrPayrollHistory,
  fetchHrPayrollRunById,
  fetchHrPayslip,
  processHrPayroll,
} from "../../../store/slices/hr/payrollSlice";
import {
  hrPayrollApproveSchema,
  hrPayrollProcessSchema,
} from "../../../utils/validationSchemas";
import {
  formatHrCurrency,
  formatHrDate,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
  getHrSuccessMessage,
  getLookupLabel,
} from "../hrHelpers";
import {
  HrEmptyState,
  HrNumberInput,
  HrStatCard,
} from "../HrShared";
import {
  normalizeHrNumberBlurValue,
  normalizeHrNumberInput,
} from "../hrNumberUtils";

const currentMonth = () => new Date().getMonth() + 1;
const currentYear = () => new Date().getFullYear();

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({ label, value: index + 1 }));

const extractList = (response) => {
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const toEmployeeOption = (employee) => {
  const value = getHrRecordId(employee, "employee");
  const label = getEmployeeName(employee);

  return value && label ? { label, value } : null;
};

const getRunRows = (run) => {
  if (!run) {
    return [];
  }

  const candidates = [
    run.items,
    run.employees,
    run.payrollItems,
    run.payrollDetails,
    run.details,
    run.salaryDetails,
  ];

  return candidates.find(Array.isArray) ?? [];
};

const RunPayrollModal = ({ isOpen, onClose, onSubmit }) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(hrPayrollProcessSchema),
    defaultValues: {
      payrollMonth: currentMonth(),
      payrollYear: currentYear(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        payrollMonth: currentMonth(),
        payrollYear: currentYear(),
      });
    }
  }, [isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      payrollMonth: Number(values.payrollMonth),
      payrollYear: Number(values.payrollYear),
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">Run Payroll</h2>
      <p className="mt-1 text-sm text-slate-500">
        Process payroll for the selected month and year.
      </p>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
        <Controller
          name="payrollMonth"
          control={control}
          render={({ field }) => (
            <AppSelect
              label="Payroll Month"
              value={field.value}
              onChange={field.onChange}
              options={monthOptions}
              error={errors.payrollMonth?.message}
            />
          )}
        />
        <HrNumberInput
          control={control}
          id="payrollYear"
          name="payrollYear"
          label="Payroll Year"
          allowDecimal={false}
          required
          error={errors.payrollYear?.message}
        />
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting}>
            Process Payroll
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const ApprovePayrollModal = ({ isOpen, onClose, onSubmit, run }) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(hrPayrollApproveSchema),
    defaultValues: {
      payrollRunId: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        payrollRunId: run?.payrollRunId ?? run?.id ?? "",
      });
    }
  }, [isOpen, reset, run]);

  const submitForm = async (values) => {
    await onSubmit({ payrollRunId: Number(values.payrollRunId) });
  };

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">Approve Payroll</h2>
      <p className="mt-1 text-sm text-slate-500">
        Approve a processed payroll run.
      </p>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
        <HrNumberInput
          control={control}
          id="payrollRunId"
          name="payrollRunId"
          label="Payroll Run ID"
          allowDecimal={false}
          required
          error={errors.payrollRunId?.message}
        />
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting}>
            Approve Payroll
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const PayrollPage = () => {
  const dispatch = useDispatch();
  const payrollState = useSelector((state) => state.hrPayroll);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [runId, setRunId] = useState("");
  const [modal, setModal] = useState(null);
  const [employeeQuery, setEmployeeQuery] = useState({
    employeeId: "",
    month: currentMonth(),
    year: currentYear(),
  });

  const loadEmployees = useCallback(async () => {
    try {
      const response = await hrEmployeeService.getEmployeeDropdown();
      setEmployeeOptions(extractList(response).map(toEmployeeOption).filter(Boolean));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load employee options."));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadEmployees);
  }, [loadEmployees]);

  const runRows = useMemo(
    () => getRunRows(payrollState.selectedRun),
    [payrollState.selectedRun],
  );

  const stats = useMemo(() => {
    const sum = (keys) =>
      runRows.reduce((total, row) => {
        const value = keys
          .map((key) => row?.[key])
          .find((candidate) => candidate !== undefined && candidate !== null);

        return total + (Number(value) || 0);
      }, 0);

    return {
      deductions: sum(["deductions", "totalDeductions", "deductionAmount"]),
      employees: runRows.length,
      gross: sum(["grossPay", "grossSalary", "grossAmount"]),
      net: sum(["netPay", "netSalary", "netAmount"]),
    };
  }, [runRows]);

  const processRun = useCallback(
    async (payload) => {
      try {
        const response = await dispatch(processHrPayroll(payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Payroll processed"));
        setModal(null);
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to process payroll."));
        throw error;
      }
    },
    [dispatch],
  );

  const approveRun = useCallback(
    async (payload) => {
      try {
        const response = await dispatch(approveHrPayroll(payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Payroll approved"));
        setModal(null);
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to approve payroll."));
        throw error;
      }
    },
    [dispatch],
  );

  const loadRun = useCallback(async () => {
    if (!runId) {
      toast.error("Enter a payroll run id.");
      return;
    }

    try {
      const response = await dispatch(fetchHrPayrollRunById(runId)).unwrap();
      toast.success(getHrSuccessMessage(response, "Payroll run loaded"));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load payroll run."));
    }
  }, [dispatch, runId]);

  const loadHistory = useCallback(async () => {
    if (!employeeQuery.employeeId) {
      toast.error("Select an employee.");
      return;
    }

    try {
      const response = await dispatch(
        fetchHrPayrollHistory(employeeQuery.employeeId),
      ).unwrap();
      toast.success(getHrSuccessMessage(response, "Payroll history loaded"));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load payroll history."));
    }
  }, [dispatch, employeeQuery.employeeId]);

  const loadPayslip = useCallback(
    async (employeeId = employeeQuery.employeeId) => {
      if (!employeeId) {
        toast.error("Select an employee.");
        return;
      }

      try {
        const response = await dispatch(
          fetchHrPayslip({
            employeeId,
            params: {
              payrollMonth: Number(employeeQuery.month),
              payrollYear: Number(employeeQuery.year),
            },
          }),
        ).unwrap();
        toast.success(getHrSuccessMessage(response, "Payslip loaded"));
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to load payslip."));
      }
    },
    [dispatch, employeeQuery.employeeId, employeeQuery.month, employeeQuery.year],
  );

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Banknote className="h-3.5 w-3.5" />
            HR / Payroll
          </>
        }
        title="Payroll"
        description="Process payroll runs, approvals, employee history, and payslips."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={payrollState.loading}
              onClick={loadRun}
            >
              <RefreshCw
                className={`h-4 w-4 ${payrollState.loading ? "animate-spin" : ""}`}
              />
              Load Run
            </AppButton>
            <AppButton className="h-10" onClick={() => setModal("run")}>
              <Play className="h-4 w-4" />
              Run Payroll
            </AppButton>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <HrStatCard
          icon={IndianRupee}
          label="Gross"
          value={formatHrCurrency(stats.gross)}
        />
        <HrStatCard
          icon={IndianRupee}
          label="Deductions"
          value={formatHrCurrency(stats.deductions)}
          colorClass="bg-red-50 text-red-600"
        />
        <HrStatCard
          icon={IndianRupee}
          label="Net Payable"
          value={formatHrCurrency(stats.net)}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <HrStatCard
          icon={UsersRound}
          label="Employees"
          value={stats.employees}
          colorClass="bg-brand-light text-brand"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Payroll Run
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Process a run or load an existing payroll run by id.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[160px_auto_auto]">
              <AppInput
                id="runId"
                value={runId}
                onChange={(event) => setRunId(event.target.value)}
                placeholder="Run ID"
              />
              <AppButton variant="secondary" className="h-10" onClick={loadRun}>
                <Search className="h-4 w-4" />
                Load
              </AppButton>
              <AppButton
                variant="secondary"
                className="h-10"
                onClick={() => setModal("approve")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </AppButton>
            </div>
          </div>

          {payrollState.error ? (
            <HrEmptyState
              icon={Banknote}
              error={payrollState.error}
              title="Unable to load payroll"
              description="Try loading the payroll run again."
              onRetry={loadRun}
            />
          ) : runRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
                <Banknote className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No payroll run loaded
              </h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                Run payroll for a month or load an existing run id to inspect
                employee-level net pay.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {["Employee", "Gross", "Deductions", "Net Pay", "Payslip"].map((heading) => (
                      <th
                        key={heading}
                        className={[
                          "border-b border-slate-200 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500",
                          heading === "Payslip" ? "text-right" : "",
                        ].join(" ")}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runRows.map((row) => {
                    const employeeId = row.employeeId ?? row.id;

                    return (
                      <tr key={employeeId ?? row.employeeCode} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-medium text-slate-900">
                          {row.employeeName ?? getLookupLabel(employeeOptions, employeeId)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-600">
                          {formatHrCurrency(row.grossPay ?? row.grossSalary ?? row.grossAmount)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-600">
                          {formatHrCurrency(row.deductions ?? row.totalDeductions ?? row.deductionAmount)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-semibold text-slate-900">
                          {formatHrCurrency(row.netPay ?? row.netSalary ?? row.netAmount)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-right">
                          <AppButton
                            variant="secondary"
                            className="h-8 rounded-lg px-2 text-xs"
                            onClick={() => loadPayslip(employeeId)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Payslip
                          </AppButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Employee History & Payslip
            </h3>
            <div className="mt-4 space-y-3">
              <AppSelect
                value={employeeQuery.employeeId}
                onChange={(value) =>
                  setEmployeeQuery((current) => ({
                    ...current,
                    employeeId: value,
                  }))
                }
                options={[{ value: "", label: "Select employee" }, ...employeeOptions]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <AppSelect
                  value={employeeQuery.month}
                  onChange={(value) =>
                    setEmployeeQuery((current) => ({ ...current, month: value }))
                  }
                  options={monthOptions}
                />
                <AppInput
                  id="employeePayrollYear"
                  type="text"
                  inputMode="numeric"
                  value={employeeQuery.year}
                  onBlur={(event) =>
                    setEmployeeQuery((current) => ({
                      ...current,
                      year: normalizeHrNumberBlurValue(event.target.value, false),
                    }))
                  }
                  onKeyDown={(event) => {
                    if (["e", "E", "+", "-"].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(event) =>
                    setEmployeeQuery((current) => ({
                      ...current,
                      year: normalizeHrNumberInput(event.target.value, false),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <AppButton variant="secondary" className="h-10" onClick={loadHistory}>
                  Load History
                </AppButton>
                <AppButton className="h-10" onClick={() => loadPayslip()}>
                  Load Payslip
                </AppButton>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">History</h3>
            <div className="mt-3 space-y-2">
              {payrollState.history.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  No history loaded.
                </p>
              ) : (
                payrollState.history.map((item) => (
                  <div
                    key={item.id ?? item.payrollRunId ?? `${item.payrollMonth}-${item.payrollYear}`}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {item.payrollMonth ?? item.month}/{item.payrollYear ?? item.year}
                    </p>
                    <p className="text-xs text-slate-500">
                      Net {formatHrCurrency(item.netPay ?? item.netAmount)} -{" "}
                      {formatHrDate(item.processedAt ?? item.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Payslip</h3>
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {payrollState.payslip
                ? JSON.stringify(payrollState.payslip, null, 2)
                : "No payslip loaded"}
            </pre>
          </div>
        </div>
      </div>

      <RunPayrollModal
        isOpen={modal === "run"}
        onClose={() => setModal(null)}
        onSubmit={processRun}
      />
      <ApprovePayrollModal
        isOpen={modal === "approve"}
        onClose={() => setModal(null)}
        onSubmit={approveRun}
        run={payrollState.selectedRun}
      />
    </section>
  );
};

export default PayrollPage;
