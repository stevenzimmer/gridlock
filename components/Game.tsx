"use client";

import { GridView } from "@/components/GridView";
import { HUD } from "@/components/HUD";
import { GameProvider } from "@/components/GameContext";
import { GameHeader } from "./GameHeader";
import { PlayerPanel } from "./PlayerPanel";
import { Punchouts } from "./Punchouts";
import { SelectedPanel } from "./SelectedPanel";
import { StatWrapper } from "./StatWrapper";
import { SubmissionsRemaining } from "./SubmissionsRemaining";

function GameContent() {
  return (
    <section className="relative mx-auto w-full max-w-7xl space-y-4 lg:space-y-6">
      <GameHeader />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.7fr)] xl:items-start">
        <div className="space-y-4">
          <div className="game-stage-panel rounded-[1.75rem] p-3 sm:p-4 lg:p-5">
            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.32em] text-cyan-200/80">
                      Daily Run
                    </p>
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                      Clear words, rotate lanes, and stay alive.
                    </h2>
                  </div>
                </div>
                <StatWrapper />
              </div>

              <div className="grid grid-cols-2 gap-2 md:w-[17rem]">
                <Punchouts />
                <SubmissionsRemaining />
              </div>
            </div>

            <GridView />
          </div>

          <div className="sticky bottom-3 z-20 lg:static">
            <SelectedPanel />
          </div>
        </div>

        <aside className="space-y-4">
          <PlayerPanel />
          <HUD />
        </aside>
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
