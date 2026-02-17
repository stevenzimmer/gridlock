import {
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {MIN_WORD_LENGTH} from "@/lib/config";
export function RulesPanel() {
    return (
        <DrawerContent side="left" className="w-[94vw] max-w-3xl">
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <DrawerHeader className="space-y-1">
                        <DrawerTitle>How Gridlock Works</DrawerTitle>
                        <DrawerDescription>
                            Build words, clear tiles, and survive the board for
                            the daily run.
                        </DrawerDescription>
                    </DrawerHeader>
                    <DrawerClose asChild>
                        <button
                            type="button"
                            className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-100"
                        >
                            Close
                        </button>
                    </DrawerClose>
                </div>

                <section className="space-y-2 py-3 text-sm text-slate-200 ">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                        Core Rules
                    </h3>
                    <p>
                        Select letters horizontally in a single row to form a
                        word of at least {MIN_WORD_LENGTH} letters.
                    </p>
                    <p>
                        Submit with Enter (or the Submit button). Accepted words
                        clear those tiles and gravity drops letters down.
                    </p>
                    <p>
                        You cannot select stones. If the path crosses a stone,
                        that selection is blocked.
                    </p>
                </section>

                <section className="space-y-2 py-3 text-sm text-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                        Punchouts
                    </h3>
                    <p>
                        Double-click a letter to punch it out instantly. This is
                        useful when a blocker tile is ruining future word paths.
                    </p>
                    <p>
                        Each punchout consumes 1 charge. You get a limited
                        number per run, shown in the HUD.
                    </p>
                    <p>
                        No charges left means no more punchouts, so spend them
                        to protect strong future lanes.
                    </p>
                </section>

                <section className="space-y-2 py-3 text-sm text-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                        Invalid Submissions
                    </h3>
                    <p>
                        Submitting a non-dictionary word or otherwise invalid
                        selection increases your invalid submissions count.
                    </p>
                    <p>
                        Invalid words are dangerous: hit the run limit and the
                        game ends immediately, even if moves still exist.
                    </p>
                    <p>
                        When in doubt, shorten risky words and lock in reliable
                        points.
                    </p>
                </section>

                <section className="space-y-2 py-3 text-sm text-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                        Points System
                    </h3>
                    <div className="overflow-hidden rounded-md border border-slate-700">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-800/90 text-slate-100">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">
                                        Action
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Points Impact
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-slate-900/70 text-slate-200">
                                <tr className="border-t border-slate-700">
                                    <td className="px-3 py-2">Accepted word</td>
                                    <td className="px-3 py-2">
                                        Earn points based on word length
                                    </td>
                                </tr>
                                <tr className="border-t border-slate-700">
                                    <td className="px-3 py-2">Longer words</td>
                                    <td className="px-3 py-2">
                                        Higher reward and faster level progress
                                    </td>
                                </tr>
                                <tr className="border-t border-slate-700">
                                    <td className="px-3 py-2">Invalid word</td>
                                    <td className="px-3 py-2">
                                        No points plus 1 invalid strike
                                    </td>
                                </tr>
                                <tr className="border-t border-slate-700">
                                    <td className="px-3 py-2">Punchout</td>
                                    <td className="px-3 py-2">
                                        Board control utility, limited uses
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-2 text-sm text-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                        Daily Run
                    </h3>
                    <p>
                        One persistent run per day for each player. Everyone
                        gets the same board for that date.
                    </p>
                    <p>
                        Your progress is saved, so you can return and continue
                        until the run ends.
                    </p>
                </section>
            </div>
        </DrawerContent>
    );
}
