import { Brand } from "./brand";
import { SidebarNav } from "./nav";
import { LogoutButton } from "../auth/logout-button";
import { StatusCard } from "./status-card";
import { Panel } from "../ui/panel";

type SidebarProps = {
  pathname: string;
  userEmail?: string;
};

export function Sidebar({ pathname, userEmail }: SidebarProps) {
  return (
    <aside className="border-b border-stone-200 bg-white px-4 py-4 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-4 lg:py-5 print:hidden">
      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <Brand />
        <SidebarNav pathname={pathname} />
        <StatusCard />
        <Panel className="bg-stone-50">
          <p className="text-xs font-medium text-stone-600">Sesión</p>
          {userEmail ? (
            <p className="mt-1 truncate text-sm font-medium text-stone-800">
              {userEmail}
            </p>
          ) : null}
          <div className="mt-3">
            <LogoutButton />
          </div>
        </Panel>
      </div>
    </aside>
  );
}

