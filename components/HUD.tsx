import {Punchouts} from "./Punchouts";
import {StatWrapper} from "./StatWrapper";
import {SubmissionsRemaining} from "./SubmissionsRemaining";
import {SelectedPanel} from "./SelectedPanel";
import {PlayerPanel} from "./PlayerPanel";
import {GameHeader} from "./GameHeader";

export function HUD() {
    return (
        <header className="grid gap-2">
            <GameHeader />
            <PlayerPanel />
            <StatWrapper />
            <Punchouts />
            <SubmissionsRemaining />
            <SelectedPanel />
        </header>
    );
}
