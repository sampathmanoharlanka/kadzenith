import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";

import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { METHODS, findMethod } from "@/lib/natural-farming";
import { cn } from "@/lib/utils";

export interface ScheduleDraft {
  method: string;
  title: string;
  details: string;
  scheduledOn: string;
  scheduledTime: string;
}

export function ScheduleForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (draft: ScheduleDraft) => Promise<unknown>;
}) {
  const [method, setMethod] = useState("jeevamrutham");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [scheduledOn, setScheduledOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [scheduledTime, setScheduledTime] = useState("07:00");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      method,
      title: title.trim() || `Apply ${findMethod(method).name}`,
      details: details.trim(),
      scheduledOn,
      scheduledTime,
    });
    setTitle("");
    setDetails("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-muted p-4">
      <div>
        <p className="mb-2 text-sm font-medium">Method</p>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMethod(item.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                method === item.id ? "bg-ink text-ink-foreground" : "bg-background",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{findMethod(method).purpose}</p>
      </div>

      <Field label="Title">
        {(id) => (
          <Input
            id={id}
            className="bg-background"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Apply ${findMethod(method).name}`}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          {(id) => (
            <Input
              id={id}
              type="date"
              className="bg-background"
              value={scheduledOn}
              onChange={(e) => setScheduledOn(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Time">
          {(id) => (
            <Input
              id={id}
              type="time"
              className="bg-background"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
            />
          )}
        </Field>
      </div>

      <Field label="How to do it (optional)">
        {(id) => (
          <Textarea
            id={id}
            className="rounded-xl border-transparent bg-background"
            value={details}
            maxLength={300}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. 200 litres per acre with irrigation water"
          />
        )}
      </Field>

      <Button type="submit" variant="ink" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
        Add to schedule
      </Button>
    </form>
  );
}
