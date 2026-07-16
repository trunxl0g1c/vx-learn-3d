import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";

const ALERT_VARIANTS = {
  error: {
    icon: AlertTriangle,
    container: "border-warning-main bg-warning-main/5",
    iconColor: "text-warning-main",
    textColor: "text-warning-main",
  },

  warning: {
    icon: CircleAlert,
    container: "border-accent-contrast bg-accent-contrast/5",
    iconColor: "text-accent-contrast",
    textColor: "text-accent-contrast",
  },

  success: {
    icon: CheckCircle2,
    container: "border-emerald-500 bg-emerald-500/5",
    iconColor: "text-emerald-400",
    textColor: "text-emerald-300",
  },

  info: {
    icon: Info,
    container: "border-secondary-default bg-secondary-default/5",
    iconColor: "text-secondary-default",
    textColor: "text-secondary-default",
  },
};

export default function InlineAlert({
  message,
  type = "error",
  className = "",
  duration = 3000,
  autoHide = true,
  onClose,
}) {
  const [isVisible, setIsVisible] = useState(Boolean(message));

  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const messages = Array.isArray(message)
    ? message.filter(Boolean)
    : message
      ? [message]
      : [];

  const messageKey = JSON.stringify(messages);

  useEffect(() => {
    if (messages.length === 0) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    if (!autoHide || duration <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onCloseRef.current?.();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [messageKey, autoHide, duration]);

  if (!isVisible || messages.length === 0) {
    return null;
  }

  const variant = ALERT_VARIANTS[type] || ALERT_VARIANTS.error;

  const Icon = variant.icon;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={[
        "flex min-h-16 w-full items-center gap-4",
        "rounded-xl border px-4 py-4",
        "bg-dark-alpha",
        "animate-in fade-in slide-in-from-top-1",
        "duration-200",
        variant.container,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon
        className={["mt-0.5 size-6 shrink-0", variant.iconColor].join(" ")}
        strokeWidth={1.8}
      />

      <div
        className={[
          "min-w-0 flex-1",
          "text-sm italic leading-5",
          variant.textColor,
        ].join(" ")}
      >
        {messages.length === 1 ? (
          <p>{messages[0]}</p>
        ) : (
          <ul className="space-y-1">
            {messages.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
