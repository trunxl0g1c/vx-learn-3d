import { Link } from "react-router-dom";

export default function PlayerSidebar({
  logo = "/images/logo.svg",
  logoAlt = "VXplore Studio",
  items = [],
  className = "",
}) {
  return (
    <aside
      className={`absolute left-7 top-7 z-40 flex h-fit w-[48px] justify-center rounded-full border border-grayout-extra-dark bg-dark-alpha ${className}`}
    >
      <div className="flex flex-col items-center gap-1 pt-2">
        <img src={logo} alt={logoAlt} className="size-8 rounded-full mb-1" />

        <div className="mt-1 h-[1px] w-[32px] bg-grayout-extra-dark" />

        <div className="flex flex-col items-center gap-1 py-2">
          {items.map((item, index) => {
            if (item.type === "separator") {
              return (
                <div
                  key={`separator-${index}`}
                  className="h-[1px] w-[32px] bg-grayout-extra-dark mt-1"
                />
              );
            }
            const Icon = item.icon;

            const buttonClassName = [
              "flex size-10 items-center justify-center rounded-full transition",
              item.active
                ? "bg-accent-main text-white"
                : "text-secondary-default hover:bg-white/10 hover:text-white",
              item.disabled
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer",
              item.className || "",
            ].join(" ");

            const content = Icon ? <Icon className="size-6" /> : item.label;

            if (item.href && !item.disabled) {
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  title={item.label}
                  className={buttonClassName}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                disabled={item.disabled}
                onClick={item.onClick}
                className={buttonClassName}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
