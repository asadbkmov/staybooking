import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { CalendarSkeleton } from "@/components/LoadingSkeleton";

interface AvailabilityCalendarProps {
  month?: Date;
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
}

export function AvailabilityCalendar({ month, selected, onSelect }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(month ?? new Date());

  // Fetch available dates and booked dates
  const { data: availableDates = [], refetch } = useQuery({
    queryKey: ["availability", currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      const from = startOfMonth(currentMonth);
      const to = endOfMonth(currentMonth);
      
      // Get available room dates
      const { data: availData, error: availError } = await supabase
        .from("room_availability")
        .select("date")
        .gte("date", from.toISOString().slice(0, 10))
        .lte("date", to.toISOString().slice(0, 10))
        .eq("status", "available");
      if (availError) throw availError;
      
      // Get booked dates
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("check_in_date, check_out_date")
        .gte("check_out_date", from.toISOString().slice(0, 10))
        .lte("check_in_date", to.toISOString().slice(0, 10))
        .in("status", ["pending", "confirmed"]);
      if (bookingError) throw bookingError;
      
      const availSet = new Set<string>((availData ?? []).map((d) => d.date));
      
      // Remove booked dates from available dates
      (bookingData ?? []).forEach((booking) => {
        const startDate = new Date(booking.check_in_date);
        const endDate = new Date(booking.check_out_date);
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          availSet.delete(d.toISOString().slice(0, 10));
        }
      });
      
      return Array.from(availSet).map((d) => new Date(d + "T00:00:00"));
    },
  });

  // Realtime subscription: refresh on changes
  useEffect(() => {
    const channel = supabase
      .channel("calendar_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_availability" },
        () => setTimeout(() => refetch(), 0)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
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

  if (availableDates.length === 0) {
    return <CalendarSkeleton />;
  }

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
