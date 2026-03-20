import {useState} from "react";
import {RulesPanel} from "./RulesPanel";
import {Drawer, DrawerTrigger} from "@/components/ui/drawer";
import {Info} from "lucide-react";

export function RulesChip() {
    const [rulesDrawerOpen, setRulesDrawerOpen] = useState(false);
    return (
        <div className="flex items-center justify-between gap-2">
            <Drawer open={rulesDrawerOpen} onOpenChange={setRulesDrawerOpen}>
                <DrawerTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/7 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/12 hover:text-cyan-50"
                    >
                        <span>Rules</span>
                        <Info className="h-4 w-4" aria-hidden="true" />
                    </button>
                </DrawerTrigger>
                <RulesPanel />
            </Drawer>
        </div>
    );
}
