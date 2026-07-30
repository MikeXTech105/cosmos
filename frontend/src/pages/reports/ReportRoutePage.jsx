import { FileSearch } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import PermissionGuard from "../../routes/PermissionGuard";
import { findReportByRouteParams } from "./reportRegistry";
import ReportView from "./ReportView";

const ReportNotFound = () => {
  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        title="Report not found"
        description="The requested report is not registered in the reports module."
      />
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <FileSearch aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          Nothing lives at this report URL
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Return to the reports directory and choose an available report.
        </p>
        <Link
          to="/reports"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-dark"
        >
          All Reports
        </Link>
      </div>
    </section>
  );
};

const ReportRoutePage = ({ forcedGroup }) => {
  const { group: routeGroup, reportId } = useParams();
  const group = routeGroup ?? forcedGroup;
  const report = findReportByRouteParams(group, reportId);

  if (!report) {
    return <ReportNotFound />;
  }

  return (
    <PermissionGuard
      route={report.permissionRoute ?? report.route}
      pageName={report.permission}
    >
      <ReportView report={report} />
    </PermissionGuard>
  );
};

export default ReportRoutePage;
