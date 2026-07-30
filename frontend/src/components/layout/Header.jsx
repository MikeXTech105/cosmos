import { Command, Menu, Search } from "lucide-react";

import { useSidebar } from "../../hooks/useSidebar";
import Breadcrumbs from "./Breadcrumbs";
import SearchCommand from "./SearchCommand";
import UserMenu from "./UserMenu";

const Header = () => {
  const { openCommand, openMobileSidebar } = useSidebar();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 px-3 sm:gap-3 sm:px-4 md:grid-cols-[minmax(180px,1fr)_minmax(260px,560px)_minmax(180px,1fr)] md:px-5 xl:px-6">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={openMobileSidebar}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 lg:hidden"
                aria-label="Open navigation menu"
                aria-controls="mobile-sidebar"
                data-mobile-sidebar-trigger
              >
                <Menu aria-hidden="true" className="h-5 w-5" />
              </button>
              <Breadcrumbs />
            </div>
          </div>

          <button
            type="button"
            onClick={openCommand}
            className="hidden h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 md:flex"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">Search pages and records...</span>
            </span>

            <span className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              <Command aria-hidden="true" className="h-3 w-3" /> K
            </span>
          </button>

          <div className="flex min-w-0 items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={openCommand}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden"
              aria-label="Open search"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
            </button>

            <UserMenu />
          </div>
        </div>
      </header>

      <SearchCommand />
    </>
  );
};

export default Header;
