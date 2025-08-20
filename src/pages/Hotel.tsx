import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Star, MapPin, Phone, Mail, Globe, Users, Bed, Wifi, Car, Utensils } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { Skeleton } from "@/components/ui/skeleton";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BookingForm } from "@/components/BookingForm";
import { useAuth } from "@/hooks/useAuth";
import { DateRange } from "react-day-picker";

const Hotel = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>();

  const { data: hotel, isLoading: hotelLoading } = useQuery({
    queryKey: ["hotel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("*")
        .eq("id", Number(id))
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["hotel-rooms", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("hotel_id", Number(id))
        .eq("is_active", true)
        .order("price_per_night");
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  useSEO({
    title: hotel ? `${hotel.name} - Система бронирования` : "Отель",
    description: hotel?.description || "Информация об отеле"
  });

  const amenityIcons: Record<string, any> = {
    'Wi-Fi': Wifi,
    'Парковка': Car,
    'Ресторан': Utensils,
    'Завтрак': Utensils,
  };

  if (hotelLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Отель не найден</h1>
          <Button asChild>
            <Link to="/hotels">Вернуться к списку отелей</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/hotels" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад к отелям
            </Link>
          </Button>
        </div>

        {/* Hotel Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
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
              </div>
              
              {hotel.photos && hotel.photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {hotel.photos.slice(1, 5).map((photo, index) => (
                    <div key={index} className="aspect-square bg-muted rounded overflow-hidden">
                      <img 
                        src={photo} 
                        alt={`${hotel.name} фото ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:w-1/3">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">{hotel.name}</h1>
                  {hotel.city && hotel.country && (
                    <div className="flex items-center gap-1 text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      {hotel.city}, {hotel.country}
                    </div>
                  )}
                  {hotel.address && (
                    <p className="text-sm text-muted-foreground">{hotel.address}</p>
                  )}
                </div>
                {hotel.rating > 0 && (
                  <div className="flex items-center gap-1 bg-primary/10 rounded-full px-3 py-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-medium">{hotel.rating}</span>
                  </div>
                )}
              </div>

              {hotel.description && (
                <p className="text-muted-foreground mb-6">{hotel.description}</p>
              )}

              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Удобства отеля</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {hotel.amenities.map((amenity) => {
                      const Icon = amenityIcons[amenity] || Badge;
                      return (
                        <div key={amenity} className="flex items-center gap-2 text-sm">
                          {Icon !== Badge && <Icon className="h-4 w-4" />}
                          <span>{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(hotel.contact_phone || hotel.contact_email || hotel.website) && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Контакты</h3>
                  <div className="space-y-2">
                    {hotel.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${hotel.contact_phone}`} className="hover:underline">
                          {hotel.contact_phone}
                        </a>
                      </div>
                    )}
                    {hotel.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${hotel.contact_email}`} className="hover:underline">
                          {hotel.contact_email}
                        </a>
                      </div>
                    )}
                    {hotel.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4" />
                        <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          Сайт отеля
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for Rooms and Booking */}
        <Tabs defaultValue="rooms" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rooms">Номера</TabsTrigger>
            <TabsTrigger value="booking">Бронирование</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rooms" className="mt-6">
            {roomsLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {rooms?.map((room) => (
                  <Card key={room.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted">
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
                    </div>
                    
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {room.name}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {room.price_per_night}₽
                          </div>
                          <div className="text-sm text-muted-foreground">за ночь</div>
                        </div>
                      </CardTitle>
                      {room.room_type && (
                        <CardDescription>{room.room_type}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      {room.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {room.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {room.capacity} гостей
                        </div>
                        {room.size_sqm && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {room.size_sqm} м²
                          </div>
                        )}
                      </div>

                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {room.amenities.slice(0, 3).map((amenity) => (
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

                      <Button 
                        className="w-full" 
                        onClick={() => {
                          setSelectedRoom(room);
                          // Switch to booking tab
                          const bookingTab = document.querySelector('[value="booking"]') as HTMLButtonElement;
                          bookingTab?.click();
                        }}
                      >
                        Забронировать
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {rooms?.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  В этом отеле пока нет номеров
                </h3>
                <p className="text-sm text-muted-foreground">
                  Обратитесь к администратору для добавления номеров
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="booking" className="mt-6">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium mb-4">Выберите даты</h3>
                <AvailabilityCalendar 
                  selected={selectedDateRange}
                  onSelect={setSelectedDateRange}
                />
              </div>

              <div>
                {selectedRoom && selectedDateRange?.from && selectedDateRange?.to ? (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Оформление бронирования</h3>
                    <BookingForm
                      room={selectedRoom}
                      checkInDate={selectedDateRange.from}
                      checkOutDate={selectedDateRange.to}
                      onSuccess={() => {
                        setSelectedRoom(null);
                        setSelectedDateRange(undefined);
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {!selectedRoom ? (
                      <div>
                        <p className="mb-2">Выберите номер для бронирования</p>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            const roomsTab = document.querySelector('[value="rooms"]') as HTMLButtonElement;
                            roomsTab?.click();
                          }}
                        >
                          Перейти к номерам
                        </Button>
                      </div>
                    ) : (
                      <p>Выберите даты заезда и выезда</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Hotel;