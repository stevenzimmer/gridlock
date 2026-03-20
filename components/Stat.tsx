import {useEffect, useRef} from "react";

export function Stat({
    label,
    value,
    pulseNonce = 0,
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
                {transform: "scale(1)", filter: "brightness(1)"},
                {transform: "scale(1.06)", filter: "brightness(1.28)"},
                {transform: "scale(1)", filter: "brightness(1)"},
            ],
            {
                duration: 220,
                easing: "cubic-bezier(0.22,1,0.36,1)",
            },
        );
        return () => {
            animation.cancel();
        };
    }, [pulseNonce]);

    return (
        <div
            ref={ref}
            className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2"
        >
            <p className="text-xs uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="text-base font-semibold text-slate-100">{value}</p>
        </div>
    );
}
