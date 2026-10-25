import { Link } from "@tanstack/react-router";
import { Mic } from "lucide-react";

import mitra from "@/assets/mitra.png";

/** The Gemini-style "Ask" pill on the farmer home screen. */
export function MitraChatBox() {
  return (
    <div className="rounded-full bg-gradient-ai p-[1.5px] shadow-soft">
      <div className="flex items-center gap-2 rounded-full bg-background py-1.5 pr-1.5 pl-2">
        <Link
          to="/farmer/assistant"
          className="flex min-w-0 flex-1 items-center gap-2.5 py-1"
          aria-label="Ask KAD Mitra"
        >
          <img src={mitra} alt="" width={32} height={32} className="size-8 shrink-0" />
          <span className="truncate text-[15px] text-muted-foreground">
            Ask KAD Mitra · ప్రశ్న అడగండి
          </span>
        </Link>
        <Link
          to="/farmer/assistant"
          search={{ voice: true }}
          aria-label="Talk to KAD Mitra"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground transition-transform active:scale-95"
        >
          <Mic className="size-[18px]" />
        </Link>
      </div>
    </div>
  );
}
