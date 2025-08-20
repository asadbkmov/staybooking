import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Phone, Mail, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/use-seo";
import { Skeleton } from "@/components/ui/skeleton";

const Hotels = () => {
  useSEO({
    title: "Отели - Система бронирования",
    description: "Выберите отель для бронирования номера"
  });

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["hotels"],
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Наши отели</h1>
          <p className="text-muted-foreground">Выберите отель для бронирования номера</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hotels?.map((hotel) => (
            <Card key={hotel.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {hotel.description}
                  </p>
                )}

                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hotel.amenities.slice(0, 3).map((amenity) => (
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

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    {hotel.rooms?.[0]?.count || 0} номеров
                  </div>
                  <Button asChild>
                    <Link to={`/hotel/${hotel.id}`}>
                      Посмотреть номера
                    </Link>
                  </Button>
                </div>

                {(hotel.contact_phone || hotel.contact_email || hotel.website) && (
                  <div className="flex gap-2 pt-2 border-t">
                    {hotel.contact_phone && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`tel:${hotel.contact_phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {hotel.contact_email && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`mailto:${hotel.contact_email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {hotel.website && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={hotel.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {hotels?.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Отели пока не добавлены
            </h3>
            <p className="text-sm text-muted-foreground">
              Обратитесь к администратору для добавления отелей
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Hotels;