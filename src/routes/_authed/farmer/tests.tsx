import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Leaf } from "lucide-react";

import { EmptyState, Screen, SectionTitle } from "@/components/screen";
import { LccCard, SoilTestCard } from "@/components/test-results";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { lccReadingsQuery, soilTestsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authed/farmer/tests")({
  head: () => ({
    meta: [
      { title: "LCC & soil test results — KAD" },
      { name: "description", content: "Leaf colour chart and soil test results recorded by your CRP." },
      { property: "og:title", content: "LCC & soil test results — KAD" },
      { property: "og:description", content: "Your field test results from the CRP." },
    ],
  }),
  component: TestResultsPage,
});

function TestResultsPage() {
  const profile = useProfile();
  const lcc = useQuery(lccReadingsQuery(profile.id));
  const soil = useQuery(soilTestsQuery(profile.id));

  return (
    <Screen back title="Test results" subtitle="Checked in your field by the CRP">
      <Tabs defaultValue="lcc" className="mt-1">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-muted p-1">
          <TabsTrigger value="lcc" className="h-full rounded-xl font-semibold">
            Green tape (LCC)
          </TabsTrigger>
          <TabsTrigger value="soil" className="h-full rounded-xl font-semibold">
            Soil test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lcc" className="mt-5 space-y-4">
          {lcc.isPending && <Skeleton className="h-56 rounded-3xl" />}
          {lcc.data?.length === 0 && (
            <EmptyState icon={Leaf} title="No leaf colour check yet">
              Your CRP will check your crop with the green tape and the result will show here.
            </EmptyState>
          )}
          {lcc.data?.[0] && <LccCard reading={lcc.data[0]} />}
          {lcc.data && lcc.data.length > 1 && (
            <History
              items={lcc.data.slice(1).map((r) => ({
                id: r.id,
                date: r.tested_on,
                text: `${r.crop} — score ${r.leaf_score}/6`,
              }))}
            />
          )}
        </TabsContent>

        <TabsContent value="soil" className="mt-5 space-y-4">
          {soil.isPending && <Skeleton className="h-72 rounded-3xl" />}
          {soil.data?.length === 0 && (
            <EmptyState icon={FlaskConical} title="No soil test yet">
              When your CRP uploads your soil test, you'll see pH, nutrients and advice here.
            </EmptyState>
          )}
          {soil.data?.[0] && <SoilTestCard test={soil.data[0]} />}
          {soil.data && soil.data.length > 1 && (
            <History
              items={soil.data.slice(1).map((t) => ({
                id: t.id,
                date: t.tested_on,
                text: `pH ${t.ph ?? "–"} · OC ${t.organic_carbon ?? "–"}%`,
              }))}
            />
          )}
        </TabsContent>
      </Tabs>
    </Screen>
  );
}

function History({ items }: { items: { id: string; date: string; text: string }[] }) {
  return (
    <section className="pt-2 pb-8">
      <SectionTitle>Earlier results</SectionTitle>
      <ul className="divide-y rounded-3xl bg-muted px-5">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between py-3 text-sm">
            <span>{item.text}</span>
            <span className="text-muted-foreground">{shortDate(item.date)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
