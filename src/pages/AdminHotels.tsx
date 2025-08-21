import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Star, MapPin, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/use-seo";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const hotelSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  website: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  amenities: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
});

type HotelFormData = z.infer<typeof hotelSchema>;

const AdminHotels = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hotelPhotos, setHotelPhotos] = useState<string[]>([]);

  useSEO({
    title: "Управление отелями - Админ панель",
    description: "Административная панель для управления отелями"
  });

  const form = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      country: "",
      contact_phone: "",
      contact_email: "",
      website: "",
      amenities: "",
      rating: 0,
    },
  });

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["admin-hotels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select(`
          *,
          rooms(count)
        `)
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });

  const createHotelMutation = useMutation({
    mutationFn: async (data: HotelFormData) => {
      const amenitiesArray = data.amenities 
        ? data.amenities.split(",").map(a => a.trim()).filter(a => a)
        : [];

      const { error } = await supabase.from("hotels").insert({
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        country: data.country,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email || null,
        website: data.website || null,
        amenities: amenitiesArray,
        rating: data.rating,
        photos: hotelPhotos,
        created_by: user?.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
      toast({ title: "Отель создан успешно" });
      setDialogOpen(false);
      setHotelPhotos([]);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка при создании отеля", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateHotelMutation = useMutation({
    mutationFn: async (data: HotelFormData & { id: number }) => {
      const amenitiesArray = data.amenities 
        ? data.amenities.split(",").map(a => a.trim()).filter(a => a)
        : [];

      const { error } = await supabase
        .from("hotels")
        .update({
          name: data.name,
          description: data.description,
          address: data.address,
          city: data.city,
          country: data.country,
          contact_phone: data.contact_phone,
          contact_email: data.contact_email || null,
          website: data.website || null,
          amenities: amenitiesArray,
          rating: data.rating,
          photos: hotelPhotos,
        })
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
      toast({ title: "Отель обновлен успешно" });
      setDialogOpen(false);
      setEditingHotel(null);
      setHotelPhotos([]);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка при обновлении отеля", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteHotelMutation = useMutation({
    mutationFn: async (hotelId: number) => {
      const { error } = await supabase
        .from("hotels")
        .delete()
        .eq("id", hotelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
      toast({ title: "Отель удален успешно" });
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка при удалении отеля", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: HotelFormData) => {
    if (editingHotel) {
      updateHotelMutation.mutate({ ...data, id: editingHotel.id });
    } else {
      createHotelMutation.mutate(data);
    }
  };

  const handleEdit = (hotel: any) => {
    setEditingHotel(hotel);
    setHotelPhotos(hotel.photos || []);
    form.reset({
      name: hotel.name,
      description: hotel.description || "",
      address: hotel.address || "",
      city: hotel.city || "",
      country: hotel.country || "",
      contact_phone: hotel.contact_phone || "",
      contact_email: hotel.contact_email || "",
      website: hotel.website || "",
      amenities: hotel.amenities?.join(", ") || "",
      rating: hotel.rating || 0,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingHotel(null);
    setHotelPhotos([]);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Управление отелями</h1>
            <p className="text-muted-foreground">Создавайте и управляйте отелями</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить отель
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hotels?.map((hotel) => (
            <Card key={hotel.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {hotel.photos?.[0] ? (
                  <img 
                    src={hotel.photos[0]} 
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Нет фото
                  </div>
                )}
                {hotel.rating > 0 && (
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{hotel.rating}</span>
                  </div>
                )}
              </div>

              <CardHeader>
                <CardTitle className="text-xl">{hotel.name}</CardTitle>
                {hotel.city && hotel.country && (
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {hotel.city}, {hotel.country}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {hotel.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {hotel.description}
                  </p>
                )}

                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hotel.amenities.slice(0, 3).map((amenity: string) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {hotel.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{hotel.amenities.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  {hotel.rooms?.[0]?.count || 0} номеров
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/admin/hotels/${hotel.id}/rooms`}>
                      Номера
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(hotel)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteHotelMutation.mutate(hotel.id)}
                    disabled={deleteHotelMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {hotels?.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Отели пока не добавлены
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первый отель для начала работы
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первый отель
            </Button>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingHotel ? "Редактировать отель" : "Создать новый отель"}
              </DialogTitle>
              <DialogDescription>
                {editingHotel 
                  ? "Обновите информацию об отеле" 
                  : "Заполните информацию о новом отеле"
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
                      <FormLabel>Название отеля *</FormLabel>
                      <FormControl>
                        <Input placeholder="Название отеля" {...field} />
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
                        <Textarea placeholder="Описание отеля" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Город</FormLabel>
                        <FormControl>
                          <Input placeholder="Москва" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Страна</FormLabel>
                        <FormControl>
                          <Input placeholder="Россия" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Адрес</FormLabel>
                      <FormControl>
                        <Input placeholder="Полный адрес отеля" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <PhotoUpload
                  bucketName="hotel-photos"
                  folder={editingHotel ? editingHotel.id.toString() : "temp"}
                  existingPhotos={hotelPhotos}
                  onPhotosUpdate={setHotelPhotos}
                  maxPhotos={10}
                />

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createHotelMutation.isPending || updateHotelMutation.isPending}
                    className="flex-1"
                  >
                    {editingHotel ? "Сохранить изменения" : "Создать отель"}
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

export default AdminHotels;