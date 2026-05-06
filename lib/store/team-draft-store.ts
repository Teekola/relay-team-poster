import { create } from "zustand"
import type { TeamImageFormValues } from "@/lib/team-image-form"

// Lives in memory: survives client-side navigation but not page reloads,
// so a stale draft can't apply itself if the user refreshes /teams/new.
type TeamDraftState = {
  draft: TeamImageFormValues | null
  setDraft: (draft: TeamImageFormValues) => void
  clearDraft: () => void
}

export const useTeamDraftStore = create<TeamDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}))
