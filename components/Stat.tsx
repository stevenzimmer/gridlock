import { useEffect, useRef } from "react";

export function Stat({
  label,
  value,
  pulseNonce = 0
}: {
  label: string;
  value: string;
  pulseNonce?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pulseNonce || !ref.current) {
      return;
    }
    const animation = ref.current.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(1.05)", filter: "brightness(1.25)" },
        { transform: "scale(1)", filter: "brightness(1)" }
      ],
      {
        duration: 220,
        easing: "cubic-bezier(0.22,1,0.36,1)"
      }
    );
    return () => {
      animation.cancel();
    };
  }, [pulseNonce]);

  return (
    <div
      ref={ref}
      className="rounded-[1.25rem] border border-white/10 bg-slate-950/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-black tracking-tight text-white sm:text-xl">{value}</p>
    </div>
  );
}
