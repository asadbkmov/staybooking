import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/use-seo";

interface RoleRow { role: string }

const Admin = () => {
  useSEO({ title: "Админ-панель | Бронирование отеля", description: "Управление доступностью и бронированиями.", canonicalPath: "/admin" });
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: isAdmin } = useQuery({
    enabled: !!user,
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, name, price_per_night").order("id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [roomId, setRoomId] = useState<number | "">("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("available");
  const [priceOverride, setPriceOverride] = useState<string>("");

  const saveAvailability = async () => {
    if (!roomId || !date) return;
    // Try update if exists, else insert
    const { data: existing, error: selErr } = await supabase
      .from("room_availability")
      .select("id")
      .eq("room_id", roomId)
      .eq("date", date)
      .maybeSingle();
    if (selErr) {
      toast({ title: "Ошибка", description: selErr.message });
      return;
    }

    const payload: any = {
      room_id: roomId,
      date,
      status,
      price_override: priceOverride ? Number(priceOverride) : null,
    };

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("room_availability").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("room_availability").insert(payload));
    }

    if (error) toast({ title: "Ошибка", description: error.message });
    else {
      toast({ title: "Сохранено", description: "Доступность обновлена" });
      qc.invalidateQueries({ queryKey: ["availability"] });
    }
  };

  const { data: bookings = [] } = useQuery({
    enabled: !!isAdmin,
    queryKey: ["allBookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_name, guest_email, guest_phone, guests_count, status, total_price, check_in_date, check_out_date, room_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Требуется вход. Перейдите на страницу авторизации.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Доступ запрещён. Нужны права администратора.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Управление доступностью</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border rounded-md bg-card">
          <div>
            <Label>Номер</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3" value={roomId}
              onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— выберите —</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Статус</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="available">Доступно</option>
              <option value="blocked">Заблокировано</option>
            </select>
          </div>
          <div>
            <Label>Цена (override)</Label>
            <Input type="number" min="0" placeholder="Опционально" value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Button onClick={saveAvailability}>Сохранить</Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Все бронирования</h2>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Гость</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Телефон</th>
                <th className="text-left p-2">Номер</th>
                <th className="text-left p-2">Даты</th>
                <th className="text-left p-2">Гостей</th>
                <th className="text-left p-2">Статус</th>
                <th className="text-left p-2">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id} className="border-t">
                  <td className="p-2">{b.id}</td>
                  <td className="p-2">{b.guest_name}</td>
                  <td className="p-2">{b.guest_email}</td>
                  <td className="p-2">{b.guest_phone}</td>
                  <td className="p-2">#{b.room_id}</td>
                  <td className="p-2">{b.check_in_date} – {b.check_out_date}</td>
                  <td className="p-2">{b.guests_count}</td>
                  <td className="p-2">{b.status}</td>
                  <td className="p-2">{Number(b.total_price).toLocaleString()} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default Admin;
