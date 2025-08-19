import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { DateRange } from "react-day-picker";
import { BookingForm } from "@/components/BookingForm";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/use-seo";
import { RoomCardSkeleton } from "@/components/LoadingSkeleton";

const Index = () => {
  // Hotel booking system main page
  useSEO({ title: "Бронирование отеля | Доступность и номера", description: "Онлайн-бронирование номеров: календарь доступных дат, цены и оформление.", canonicalPath: "/" });
  const { user } = useAuth();
  const [range, setRange] = useState<DateRange | undefined>();

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, description, price_per_night, is_active")
        .eq("is_active", true)
        .order("id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  return (
    <main className="min-h-screen p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Онлайн-бронирование</h1>
        <nav className="flex items-center gap-3 text-sm">
          {!user ? (
            <Link to="/auth" className="text-primary underline-offset-4 hover:underline">Вход / Регистрация</Link>
          ) : (
            <>
              <span className="text-muted-foreground">Привет, {user.email}</span>
              <Link to="/admin" className="text-primary underline-offset-4 hover:underline">Админ</Link>
            </>
          )}
        </nav>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Календарь доступности</h2>
          <AvailabilityCalendar selected={range} onSelect={setRange} />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Номера</h2>
          <div className="grid gap-4">
            {rooms.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))
            ) : (
              rooms.map((r: any) => (
              <article key={r.id} className="p-4 border rounded-md bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{r.name}</h3>
                    <p className="text-sm text-muted-foreground">{r.description || ""}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">от</div>
                    <div className="text-lg font-semibold">{Number(r.price_per_night).toLocaleString()} ₽ / ночь</div>
                  </div>
                </div>
                <div className="mt-3">
                  {selectedRoom?.id === r.id ? (
                    <BookingForm room={{ id: r.id, name: r.name, price_per_night: r.price_per_night }} range={range}
                      onSuccess={() => setSelectedRoom(null)} />
                  ) : (
                    <Button onClick={() => setSelectedRoom(r)} disabled={!range?.from || !range?.to}>
                      Забронировать даты
                    </Button>
                  )}
                </div>
              </article>
              ))
            )}
          </div>
        </div>
      </section>

      <footer className="text-center text-sm text-muted-foreground">
        Данные обновляются в реальном времени при изменении доступности.
      </footer>
    </main>
  );
};

export default Index;
