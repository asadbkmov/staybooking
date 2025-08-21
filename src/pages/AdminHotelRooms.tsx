import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { PhotoUpload } from "@/components/PhotoUpload";
import { RoomAvailabilityCalendar } from "@/components/RoomAvailabilityCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2, Users, Square, ArrowLeft, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/use-seo";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const roomSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  capacity: z.number().min(1, "Вместимость должна быть больше 0"),
  price_per_night: z.number().min(1, "Цена должна быть больше 0"),
  amenities: z.string().optional(),
  room_type: z.string().optional(),
  is_active: z.boolean().default(true),
  size_sqm: z.number().min(1).optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

const AdminHotelRooms = () => {
  const { hotelId } = useParams<{ hotelId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roomPhotos, setRoomPhotos] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
      description: "",
      capacity: 1,
      price_per_night: 0,
      amenities: "",
      room_type: "",
      is_active: true,
      size_sqm: 0,
    },
  });

  // Get hotel details
  const { data: hotel } = useQuery({
    queryKey: ["hotel", hotelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("*")
        .eq("id", parseInt(hotelId as string))
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!hotelId
  });

  // Get rooms for this hotel
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["hotel-rooms", hotelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("hotel_id", parseInt(hotelId as string))
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!hotelId
  });

  useSEO({
    title: hotel ? `Номера отеля ${hotel.name} - Админ панель` : "Управление номерами",
    description: "Административная панель для управления номерами отеля"
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      const amenitiesArray = data.amenities 
        ? data.amenities.split(",").map(a => a.trim()).filter(a => a)
        : [];

      const { error } = await supabase.from("rooms").insert({
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        price_per_night: data.price_per_night,
        amenities: amenitiesArray,
        room_type: data.room_type,
        is_active: data.is_active,
        size_sqm: data.size_sqm,
        photos: roomPhotos,
        hotel_id: parseInt(hotelId as string),
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-rooms", hotelId] });
      toast({ title: "Номер создан успешно" });
      setDialogOpen(false);
      setRoomPhotos([]);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка при создании номера", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: async (data: RoomFormData & { id: number }) => {
      const amenitiesArray = data.amenities 
        ? data.amenities.split(",").map(a => a.trim()).filter(a => a)
        : [];

      const { error } = await supabase
        .from("rooms")
        .update({
          name: data.name,
          description: data.description,
          capacity: data.capacity,
          price_per_night: data.price_per_night,
          amenities: amenitiesArray,
          room_type: data.room_type,
          is_active: data.is_active,
          size_sqm: data.size_sqm,
          photos: roomPhotos,
        })
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-rooms", hotelId] });
      toast({ title: "Номер обновлен успешно" });
      setDialogOpen(false);
      setEditingRoom(null);
      setRoomPhotos([]);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка при обновлении номера", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-rooms", hotelId] });
      toast({ title: "Номер удален успешно" });
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка при удалении номера", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: RoomFormData) => {
    if (editingRoom) {
      updateRoomMutation.mutate({ ...data, id: editingRoom.id });
    } else {
      createRoomMutation.mutate(data);
    }
  };

  const handleEdit = (room: any) => {
    setEditingRoom(room);
    setRoomPhotos(room.photos || []);
    form.reset({
      name: room.name,
      description: room.description || "",
      capacity: room.capacity,
      price_per_night: room.price_per_night,
      amenities: room.amenities?.join(", ") || "",
      room_type: room.room_type || "",
      is_active: room.is_active,
      size_sqm: room.size_sqm || 0,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRoom(null);
    setRoomPhotos([]);
    form.reset();
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/admin/hotels" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад к отелям
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Номера отеля {hotel?.name}
            </h1>
            <p className="text-muted-foreground">Управляйте номерами отеля</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить номер
          </Button>
        </div>

        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rooms">Номера</TabsTrigger>
            <TabsTrigger value="calendar">Календарь доступности</TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rooms?.map((room) => (
                <Card key={room.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {room.photos?.[0] ? (
                      <img 
                        src={room.photos[0]} 
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Нет фото
                      </div>
                    )}
                    {!room.is_active && (
                      <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded px-2 py-1 text-xs">
                        Неактивен
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded px-2 py-1 text-sm font-medium">
                      {room.price_per_night}₽/ночь
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-xl">{room.name}</CardTitle>
                    {room.room_type && (
                      <CardDescription>{room.room_type}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {room.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {room.capacity} гостей
                      </div>
                      {room.size_sqm && (
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          {room.size_sqm} м²
                        </div>
                      )}
                    </div>

                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.slice(0, 3).map((amenity: string) => (
                          <Badge key={amenity} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                        {room.amenities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{room.amenities.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          // Switch to calendar tab
                          const tabTrigger = document.querySelector('[value="calendar"]') as HTMLElement;
                          tabTrigger?.click();
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(room)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteRoomMutation.mutate(room.id)}
                        disabled={deleteRoomMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {rooms?.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  В отеле пока нет номеров
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Создайте первый номер для начала работы
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить первый номер
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            {selectedRoomId ? (
              <RoomAvailabilityCalendar roomId={selectedRoomId} />
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Выберите номер для управления доступностью
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Нажмите на иконку календаря рядом с номером для управления его доступностью
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? "Редактировать номер" : "Создать новый номер"}
              </DialogTitle>
              <DialogDescription>
                {editingRoom 
                  ? "Обновите информацию о номере" 
                  : "Заполните информацию о новом номере"
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название номера *</FormLabel>
                      <FormControl>
                        <Input placeholder="Стандартный двухместный номер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="room_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип номера</FormLabel>
                      <FormControl>
                        <Input placeholder="Стандарт, Люкс, Президентский" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Описание номера" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Вместимость *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="2" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Площадь (м²)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="25" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price_per_night"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Цена за ночь *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="5000" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="amenities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Удобства номера (через запятую)</FormLabel>
                      <FormControl>
                        <Input placeholder="Wi-Fi, Кондиционер, Телевизор, Холодильник" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Активен</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Номер доступен для бронирования
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <PhotoUpload
                  bucketName="room-photos"
                  folder={editingRoom ? editingRoom.id.toString() : "temp"}
                  existingPhotos={roomPhotos}
                  onPhotosUpdate={setRoomPhotos}
                  maxPhotos={8}
                />

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                    className="flex-1"
                  >
                    {editingRoom ? "Сохранить изменения" : "Создать номер"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminHotelRooms;