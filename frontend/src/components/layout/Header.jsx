import {
  Bell,
  Command,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useState } from "react";

import { useSidebar } from "../../hooks/useSidebar";
import Breadcrumbs from "./Breadcrumbs";
import SearchCommand from "./SearchCommand";
import UserMenu from "./UserMenu";

const Header = () => {
  const [darkMode, setDarkMode] = useState(false);
  const { openCommand } = useSidebar();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 px-3 sm:gap-3 sm:px-4 md:grid-cols-[minmax(180px,1fr)_minmax(260px,560px)_minmax(180px,1fr)] md:px-5 xl:px-6">
          <div className="min-w-0 pl-12 md:pl-0">
            <Breadcrumbs />
          </div>

          <button
            type="button"
            onClick={openCommand}
            className="hidden h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-400 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 md:flex"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search pages, users, settings...</span>
            </span>

            <span className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              <Command className="h-3 w-3" /> K
            </span>
          </button>

          <div className="flex min-w-0 items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={openCommand}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden"
              aria-label="Open search"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
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
