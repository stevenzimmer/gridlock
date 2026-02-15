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
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-900/80 px-2 py-1 text-xs font-semibold text-cyan-100 hover:border-cyan-500/80 hover:text-cyan-50"
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
