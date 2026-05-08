import { Brand } from "./brand";
import { SidebarNav } from "./nav";
import { LogoutButton } from "../auth/logout-button";
import { StatusCard } from "./status-card";

type SidebarProps = {
  pathname: string;
  userEmail?: string;
};

export function Sidebar({ pathname, userEmail }: SidebarProps) {
  return (
    <aside className="border-b border-stone-200 bg-white px-5 py-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <Brand />
        <SidebarNav pathname={pathname} />
        <StatusCard />
        <div className="rounded-3xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Sesión
          </p>
          {userEmail ? (
            <p className="mt-2 truncate text-sm font-medium text-stone-700">
              {userEmail}
            </p>
          ) : null}
          <div className="mt-4">
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}

