import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";

interface RoomAvailabilityCalendarProps {
  roomId: number;
}

export function RoomAvailabilityCalendar({ roomId }: RoomAvailabilityCalendarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceOverride, setPriceOverride] = useState("");
  const [status, setStatus] = useState<"available" | "booked" | "blocked">("available");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get room availability for current month
  const { data: availability, isLoading } = useQuery({
    queryKey: ["room-availability", roomId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_availability")
        .select("*")
        .eq("room_id", roomId)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));
      
      if (error) throw error;
      return data || [];
    }
  });

  // Get room details for base price
  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("name, price_per_night")
        .eq("id", roomId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: { date: string; status: string; priceOverride?: number }) => {
      const { error } = await supabase
        .from("room_availability")
        .upsert({
          room_id: roomId,
          date: data.date,
          status: data.status,
          price_override: data.priceOverride || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-availability", roomId] });
      toast({ title: "Доступность обновлена" });
      setDialogOpen(false);
      setSelectedDate(null);
      setPriceOverride("");
      setStatus("available");
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const getAvailabilityForDate = (date: Date) => {
    return availability?.find(a => isSameDay(new Date(a.date), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-800 border-green-200";
      case "booked": return "bg-red-100 text-red-800 border-red-200";
      case "blocked": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const existing = getAvailabilityForDate(date);
    if (existing) {
      setStatus(existing.status as "available" | "booked" | "blocked");
      setPriceOverride(existing.price_override?.toString() || "");
    } else {
      setStatus("available");
      setPriceOverride("");
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedDate) return;
    
    updateAvailabilityMutation.mutate({
      date: format(selectedDate, "yyyy-MM-dd"),
      status,
      priceOverride: priceOverride ? parseFloat(priceOverride) : undefined,
    });
  };

  if (isLoading) {
    return <div className="p-4">Загрузка календаря...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Календарь доступности
          {room && <span className="text-sm font-normal text-muted-foreground">- {room.name}</span>}
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-medium">
              {format(currentMonth, "LLLL yyyy", { locale: ru })}
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>Доступно</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Забронировано</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
              <span>Заблокировано</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date) => {
            const availability = getAvailabilityForDate(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                className={`
                  p-2 text-sm border rounded-lg transition-colors
                  ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                  ${availability ? getStatusColor(availability.status) : "bg-background hover:bg-muted"}
                  hover:scale-105 hover:shadow-sm
                `}
              >
                <div className="font-medium">{format(date, "d")}</div>
                {availability?.price_override && (
                  <div className="text-xs mt-1">
                    {availability.price_override}₽
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Настройка доступности на {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: ru })}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Статус</label>
                <Select value={status} onValueChange={(value: "available" | "booked" | "blocked") => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Доступно</SelectItem>
                    <SelectItem value="booked">Забронировано</SelectItem>
                    <SelectItem value="blocked">Заблокировано</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">
                  Специальная цена (базовая: {room?.price_per_night}₽)
                </label>
                <Input
                  type="number"
                  placeholder="Оставьте пустым для базовой цены"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateAvailabilityMutation.isPending}>
                  Сохранить
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}