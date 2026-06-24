import { create } from "zustand";

import type { FarmPosition } from "@/types/farm";

type FarmModal = "none" | "unlock" | "deposit" | "boost";

type FarmStore = {
  selectedPosition: FarmPosition | null;
  activeModal: FarmModal;
  pendingTxHash: string | null;
  openUnlock: (position: FarmPosition) => void;
  openDeposit: (position: FarmPosition) => void;
  openBoost: (position: FarmPosition) => void;
  setPendingTx: (hash: string | null) => void;
  close: () => void;
};

export const useFarmStore = create<FarmStore>((set) => ({
  selectedPosition: null,
  activeModal: "none",
  pendingTxHash: null,
  openUnlock: (position) =>
    set({
      selectedPosition: position,
      activeModal: "unlock",
      pendingTxHash: null,
    }),
  openDeposit: (position) =>
    set({
      selectedPosition: position,
      activeModal: "deposit",
      pendingTxHash: null,
    }),
  openBoost: (position) =>
    set({
      selectedPosition: position,
      activeModal: "boost",
      pendingTxHash: null,
    }),
  setPendingTx: (hash) => set({ pendingTxHash: hash }),
  close: () =>
    set({
      selectedPosition: null,
      activeModal: "none",
      pendingTxHash: null,
    }),
}));
