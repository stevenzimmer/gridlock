export function Stat({label, value}: {label: string; value: string}) {
    return (
        <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="text-base font-semibold text-slate-100">{value}</p>
        </div>
    );
}
