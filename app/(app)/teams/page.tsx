"use client";

import {
   InformationCircleIcon,
   SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import {
   Item,
   ItemContent,
   ItemDescription,
   ItemGroup,
   ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LAYOUTS, type LayoutId } from "@/lib/layouts";
import { fi } from "@/messages/fi";

const LAYOUT_ID_SET = new Set<string>(Object.keys(LAYOUTS));
function isLayoutId(value: string): value is LayoutId {
   return LAYOUT_ID_SET.has(value);
}

type TeamImageEntry = {
   _id: Id<"teamImages">;
   _creationTime: number;
   name: string;
   layoutId: string;
   textValues: Record<string, string>;
   athleteNames: (string | null)[];
};

function pickEventName(textValues: Record<string, string>): string {
   return textValues.eventName?.trim() ?? "";
}

function pickTeamLabel(textValues: Record<string, string>): string {
   return textValues.teamName?.trim() ?? textValues.teamLabel?.trim() ?? "";
}

function entryHaystack(entry: TeamImageEntry): string {
   const parts = [
      entry.name,
      pickEventName(entry.textValues),
      pickTeamLabel(entry.textValues),
      isLayoutId(entry.layoutId) ? fi.layouts[entry.layoutId] : entry.layoutId,
      ...entry.athleteNames.filter((n): n is string => Boolean(n)),
   ];
   return parts.join("\n").toLowerCase();
}

export default function TeamsPage() {
   const teamImages = useQuery(api.teamImages.list, {});
   const [search, setSearch] = useState("");
   const [range, setRange] = useState<DateRange | undefined>(undefined);

   const filtered = useMemo(() => {
      if (!teamImages) return teamImages;
      const trimmed = search.trim().toLowerCase();
      const fromTime = range?.from ? range.from.getTime() : null;
      // To-date is interpreted as inclusive — extend to end-of-day so a
      // saved-at timestamp on the same day still matches.
      const toTime = range?.to
         ? range.to.getTime() + 24 * 60 * 60 * 1000 - 1
         : null;
      return teamImages.filter((entry) => {
         if (fromTime !== null && entry._creationTime < fromTime) return false;
         if (toTime !== null && entry._creationTime > toTime) return false;
         if (trimmed.length > 0 && !entryHaystack(entry).includes(trimmed))
            return false;
         return true;
      });
   }, [teamImages, search, range]);

   const isFiltering = search.trim().length > 0 || range !== undefined;

   return (
      <div className="flex flex-col gap-6">
         <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h1 className="font-medium text-2xl">{fi.teams.title}</h1>
            <div className="flex items-center gap-2">
               <Link
                  href="/dashboard"
                  className={buttonVariants({ variant: "secondary" })}
               >
                  <HugeiconsIcon
                     icon={SparklesIcon}
                     strokeWidth={2}
                     aria-hidden
                  />
                  {fi.teams.createWithAi}
               </Link>
               <Link href="/teams/new" className={buttonVariants()}>
                  {fi.teams.new}
               </Link>
            </div>
         </header>

         {/* Filters render even while data is loading — typing/picking can
          happen against the live result the moment it arrives. */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Input
               type="search"
               value={search}
               onChange={(event) => setSearch(event.target.value)}
               placeholder={fi.teams.filters.searchPlaceholder}
               className="sm:max-w-xs"
            />
            <DateRangePicker
               value={range}
               onChange={setRange}
               placeholder={fi.teams.filters.dateRange}
               className="sm:w-72"
            />
         </div>

         <p className="-mt-3 flex items-start gap-2 text-muted-foreground text-sm">
            <HugeiconsIcon
               icon={InformationCircleIcon}
               className="mt-0.5 size-4 shrink-0"
               aria-hidden
            />
            <span>{fi.teams.listingNotice}</span>
         </p>

         {teamImages !== undefined && teamImages.length === 0 && (
            <p className="text-muted-foreground">{fi.teams.empty}</p>
         )}

         {filtered !== undefined &&
            teamImages !== undefined &&
            teamImages.length > 0 &&
            filtered.length === 0 && (
               <p className="text-muted-foreground">
                  {isFiltering ? fi.teams.emptyFiltered : fi.teams.empty}
               </p>
            )}

         {teamImages === undefined && (
            <ItemGroup>
               {Array.from({ length: 5 }).map((_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable placeholder key
                  <TeamImageRowSkeleton key={`skeleton-${index}`} />
               ))}
            </ItemGroup>
         )}

         {filtered !== undefined && filtered.length > 0 && (
            <ItemGroup>
               {filtered.map((teamImage) => (
                  <TeamImageRow key={teamImage._id} entry={teamImage} />
               ))}
            </ItemGroup>
         )}
      </div>
   );
}

function TeamImageRowSkeleton() {
   return (
      <Item variant="outline">
         <ItemContent>
            <Skeleton className="h-lh w-1/3 rounded-md text-sm leading-snug" />
            <Skeleton className="h-lh w-2/3 rounded-md text-xs" />
            <Skeleton className="h-lh w-3/4 rounded-md text-xs" />
         </ItemContent>
      </Item>
   );
}

function TeamImageRow({ entry }: { entry: TeamImageEntry }) {
   const date = new Date(entry._creationTime).toLocaleDateString("fi-FI");
   const eventName = pickEventName(entry.textValues);
   const teamLabel = pickTeamLabel(entry.textValues);
   const metaParts = [eventName, teamLabel, date].filter(
      (part) => part.length > 0,
   );
   const runners = entry.athleteNames
      .map((name, index) => `${index + 1}. ${name ?? "—"}`)
      .join("   ");
   return (
      <Item
         variant="outline"
         render={<Link href={`/teams/${entry._id}`} />}
         className="hover:bg-muted"
      >
         <ItemContent>
            <ItemTitle>{entry.name}</ItemTitle>
            <ItemDescription className="text-xs">
               {metaParts.join(" · ")}
            </ItemDescription>
            {runners.length > 0 && (
               <ItemDescription className="text-xs">{runners}</ItemDescription>
            )}
         </ItemContent>
      </Item>
   );
}
