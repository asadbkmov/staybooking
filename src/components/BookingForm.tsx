import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/useAuth";

interface RoomLite {
  id: number;
  name: string;
  price_per_night: number;
}

interface BookingFormProps {
  room: RoomLite;
  range: DateRange | undefined;
  onSuccess?: () => void;
}

export function BookingForm({ room, range, onSuccess }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guests_count: 1,
    special_requests: "",
  });

  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    return Math.max(1, differenceInCalendarDays(range.to, range.from));
  }, [range]);

  const total = useMemo(() => nights * (room.price_per_night ?? 0), [nights, room.price_per_night]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Требуется вход", description: "Пожалуйста, войдите, чтобы забронировать." });
      return;
    }
    if (!range?.from || !range?.to) {
      toast({ title: "Выберите даты", description: "Укажите даты заезда и выезда." });
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      room_id: room.id,
      guest_name: form.guest_name,
      guest_email: form.guest_email,
      guest_phone: form.guest_phone,
      guests_count: form.guests_count,
      special_requests: form.special_requests || null,
      check_in_date: format(range.from, 'yyyy-MM-dd'),
      check_out_date: format(range.to, 'yyyy-MM-dd'),
      total_price: total,
      status: 'pending',
    });

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Бронирование создано", description: "Мы свяжемся с вами для подтверждения." });
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-md bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="guest_name">Имя</Label>
          <Input id="guest_name" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="guest_email">Email</Label>
          <Input id="guest_email" type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="guest_phone">Телефон</Label>
          <Input id="guest_phone" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="guests_count">Гостей</Label>
          <Input id="guests_count" type="number" min={1} value={form.guests_count}
            onChange={(e) => setForm({ ...form, guests_count: Number(e.target.value) })} required />
        </div>
      </div>
      <div>
        <Label htmlFor="special_requests">Пожелания</Label>
        <Textarea id="special_requests" value={form.special_requests}
          onChange={(e) => setForm({ ...form, special_requests: e.target.value })} placeholder="Необязательно" />
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Ночей: {nights}</span>
        <span>Итого: {total.toLocaleString()} ₽</span>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Забронировать</Button>
        <Button 
          type="button" 
          variant="outline" 
          className="flex-1"
          disabled
        >
          Оплатить
          {/* TODO: Интеграция с Payme/Uzum - добавить обработчик клика */}
        </Button>
      </div>
    </form>
  );
}
