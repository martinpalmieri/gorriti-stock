import Link from "next/link";

const baseNavItemClasses =
  "rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700";

const activeNavItemClasses =
  "bg-stone-900 text-white hover:bg-stone-800 hover:text-white active:bg-stone-950 active:text-white";

const inactiveNavItemClasses =
  "text-stone-700 hover:bg-stone-100 hover:text-stone-950 active:bg-stone-200 active:text-stone-950";

type NavItemProps = {
  href: string;
  label: string;
  active: boolean;
};

export function NavItem({ href, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`${baseNavItemClasses} ${
        active ? activeNavItemClasses : inactiveNavItemClasses
      } ${active ? "ui-nav-item--active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

