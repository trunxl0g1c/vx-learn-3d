export default function AuthCard({ children, className = "" }) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(circle at center, #182324 0%, #051919 100%)",
      }}
    >
      <div
        className={`w-full max-w-[441px] rounded-3xl border border-grayout-extra-dark bg-dark-alpha/90 p-8 shadow-2xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
