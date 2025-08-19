import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

interface AvailabilityCalendarProps {
  month?: Date;
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
}

export function AvailabilityCalendar({ month, selected, onSelect }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(month ?? new Date());

  const { data: availableDates = [], refetch } = useQuery({
    queryKey: ["availability", currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      const from = startOfMonth(currentMonth);
      const to = endOfMonth(currentMonth);
      const { data, error } = await supabase
        .from("room_availability")
        .select("date")
        .gte("date", from.toISOString().slice(0, 10))
        .lte("date", to.toISOString().slice(0, 10))
        .eq("status", "available");
      if (error) throw error;
      const dset = new Set<string>((data ?? []).map((d) => d.date));
      // return array of Date for modifiers
      return Array.from(dset).map((d) => new Date(d + "T00:00:00"));
    },
  });

  // Realtime subscription: refresh on changes
  useEffect(() => {
    const channel = supabase
      .channel("room_availability_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_availability" },
        () => setTimeout(() => refetch(), 0)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const disabledDays = useMemo(() => {
    // Disable days with no availability within current month
    const availSet = new Set(availableDates.map((d) => d.toDateString()));
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const copy = new Date(d);
      if (!availSet.has(copy.toDateString())) days.push(copy);
    }
    return days;
  }, [availableDates, currentMonth]);

  return (
    <div className="p-4 border rounded-md bg-card">
      <Calendar
        showOutsideDays
        mode="range"
        selected={selected}
        onSelect={onSelect}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        disabled={disabledDays}
        className="w-full"
      />
      <p className="text-sm text-muted-foreground mt-2">Выделенные даты доступны для бронирования.</p>
    </div>
  );
}
