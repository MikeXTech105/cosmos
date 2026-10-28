import { Outlet } from "react-router-dom";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import ReportReturnLink from "../components/layout/ReportReturnLink";
import CompanyDraftScopeProvider from "../components/auth/CompanyDraftScopeProvider";
import useDocumentTitle from "../hooks/useDocumentTitle";

const MainLayout = () => {
  useDocumentTitle();

  return (
    <CompanyDraftScopeProvider>
    <div className="flex h-dvh flex-col bg-[#f5f7fb] text-slate-950 lg:flex-row">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main className="relative min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.045),transparent_26rem),linear-gradient(180deg,#f8fafc_0%,#f5f7fb_100%)]">
          <div className="mx-auto w-full max-w-[1680px] px-3 py-5 sm:px-5 md:px-6 md:py-7 xl:px-8">
            <ReportReturnLink />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </CompanyDraftScopeProvider>
  );
};

export default MainLayout;
