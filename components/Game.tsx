"use client";

import {useState} from "react";
import {GridView} from "@/components/GridView";
import {HUD} from "@/components/HUD";
import {GameProvider, useGameContext} from "@/components/GameContext";
import {StatWrapper} from "./StatWrapper";
import {Punchouts} from "./Punchouts";
import {SubmissionsRemaining} from "./SubmissionsRemaining";

function GameContent() {
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const {dateKey} = useGameContext();

    return (
        <section className="relative mx-auto w-full max-w-6xl">
            <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
                <div className="">
                    <h1 className="text-2xl font-black tracking-tight text-cyan-100">
                        Gridlock
                    </h1>
                    <p className="text-xs text-slate-300">
                        Daily board: {dateKey || "-"}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-100"
                    aria-label="Open game panel"
                >
                    <span className="inline-flex flex-col gap-1">
                        <span className="h-0.5 w-4 bg-slate-100" />
                        <span className="h-0.5 w-4 bg-slate-100" />
                        <span className="h-0.5 w-4 bg-slate-100" />
                    </span>
                </button>
            </div>

            {mobileDrawerOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/65"
                        onClick={() => setMobileDrawerOpen(false)}
                        aria-label="Close game panel"
                    />
                    <div className="absolute right-0 top-0 h-full w-[92vw] max-w-sm overflow-y-auto border-l border-slate-700 bg-slate-900 p-4 shadow-2xl">
                        <div className="mb-3 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setMobileDrawerOpen(false)}
                                className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-100"
                            >
                                Close
                            </button>
                        </div>
                        <HUD />
                    </div>
                </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
                <aside className="hidden lg:col-span-1 lg:block">
                    <HUD />
                </aside>

                <div className="lg:hidden">
                    <StatWrapper />
                </div>

                <div className="space-y-3 lg:col-span-2">
                    <GridView />
                </div>
                <div className="lg:hidden grid grid-cols-2 gap-2">
                    <Punchouts />
                    <SubmissionsRemaining />
                </div>
            </div>
        </section>
    );
}

export function Game() {
    return (
        <GameProvider>
            <GameContent />
        </GameProvider>
    );
}
