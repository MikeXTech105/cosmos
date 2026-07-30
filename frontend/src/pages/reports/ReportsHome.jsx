import { ArrowRight, FileSearch, Search } from "lucide-react";
import { createElement, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import { getIconComponent } from "../../config/iconMap";
import { canViewReport } from "../../utils/reportPermissions";
import {
  getReportGroup,
  reportGroups,
  reportRegistry,
} from "./reportRegistry";

const DynamicIcon = ({ className, name }) => {
  return createElement(getIconComponent(name), { className });
};

const ReportCard = ({ report }) => {
  return (
    <Link
      to={report.route}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-inset ring-brand/10">
          <DynamicIcon className="h-5 w-5" name={report.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{report.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {report.description}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
            View report
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

const ReportsHome = ({ forcedGroup }) => {
  const { group: routeGroup } = useParams();
  const group = routeGroup ?? forcedGroup;
  const pages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles);
  const user = useSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const activeGroup = group ? getReportGroup(group) : null;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const authorizedReports = useMemo(() => {
    return reportRegistry.filter((report) => {
      if (group && report.group !== group) {
        return false;
      }

      return canViewReport({ pages, report, roles, user });
    });
  }, [group, pages, roles, user]);
  const visibleReports = useMemo(() => {
    return authorizedReports.filter((report) => {

      if (!normalizedQuery) {
        return true;
      }

      return [report.title, report.description, report.group]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [authorizedReports, normalizedQuery]);
  const groupedReports = useMemo(() => {
    return reportGroups
      .filter((entry) => !group || entry.id === group)
      .map((entry) => ({
        ...entry,
        reports: visibleReports.filter((report) => report.group === entry.id),
      }))
      .filter((entry) => entry.reports.length > 0);
  }, [group, visibleReports]);

  if (group && !activeGroup) {
    return (
      <section className="min-w-0 space-y-5">
        <PageHeader
          title="Reports"
          description="The requested report group could not be found."
        />
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <FileSearch className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            Report group not found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose another reports section from the sidebar.
          </p>
        </div>
      </section>
    );
  }

  if (group && authorizedReports.length === 0) {
    return <Navigate to="/403" replace />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Reports"
        title={activeGroup ? `${activeGroup.label} Reports` : "All Reports"}
        description={
          activeGroup
            ? activeGroup.description
            : "Browse every available report by domain."
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reports..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
      </div>

      {groupedReports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <FileSearch className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No reports available
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            No report matches the current search or permission set.
          </p>
        </div>
      ) : (
        groupedReports.map((entry) => {
          return (
            <section key={entry.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <DynamicIcon className="h-5 w-5" name={entry.icon} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {entry.label}
                  </h2>
                  <p className="text-sm text-slate-500">{entry.description}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {entry.reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </section>
  );
};

export default ReportsHome;
