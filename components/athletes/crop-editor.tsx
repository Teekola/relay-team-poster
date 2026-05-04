"use client";

import dynamic from "next/dynamic";

export const CropEditor = dynamic(
   () => import("./crop-editor.client").then((m) => m.CropEditor),
   {
      ssr: false,
      loading: () => (
         <div className="flex aspect-4/5 w-full items-center justify-center rounded-lg border bg-muted text-sm">
            Ladataan editoria…
         </div>
      ),
   },
);
