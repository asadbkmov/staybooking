-- Create hotels table
CREATE TABLE public.hotels (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  description text,
  address text,
  city text,
  country text,
  contact_phone text,
  contact_email text,
  website text,
  photos text[] DEFAULT '{}',
  amenities text[] DEFAULT '{}',
  rating numeric(3,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create hotel_managers table for role-based access
CREATE TABLE public.hotel_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id bigint REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, hotel_id)
);

-- Add hotel_id to rooms table
ALTER TABLE public.rooms 
ADD COLUMN hotel_id bigint REFERENCES public.hotels(id);

-- Enable RLS on new tables
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_managers ENABLE ROW LEVEL SECURITY;

-- RLS policies for hotels
CREATE POLICY "Hotels are viewable by everyone" 
ON public.hotels 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage all hotels" 
ON public.hotels 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hotel managers can view their hotels" 
ON public.hotels 
FOR SELECT 
USING (
  id IN (
    SELECT hotel_id FROM public.hotel_managers 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Hotel managers can update their hotels" 
ON public.hotels 
FOR UPDATE 
USING (
  id IN (
    SELECT hotel_id FROM public.hotel_managers 
    WHERE user_id = auth.uid()
  )
);

-- RLS policies for hotel_managers
CREATE POLICY "Admins can manage hotel managers" 
ON public.hotel_managers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their hotel assignments" 
ON public.hotel_managers 
FOR SELECT 
USING (user_id = auth.uid());

-- Update rooms policies to include hotel context
CREATE POLICY "Hotel managers can manage rooms in their hotels" 
ON public.rooms 
FOR ALL 
USING (
  hotel_id IN (
    SELECT hotel_id FROM public.hotel_managers 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  hotel_id IN (
    SELECT hotel_id FROM public.hotel_managers 
    WHERE user_id = auth.uid()
  )
);

-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('hotel-photos', 'hotel-photos', true),
  ('room-photos', 'room-photos', true);

-- Storage policies for hotel photos
CREATE POLICY "Hotel photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'hotel-photos');

CREATE POLICY "Admins and hotel managers can upload hotel photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'hotel-photos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    auth.uid() IN (
      SELECT user_id FROM public.hotel_managers
    )
  )
);

-- Storage policies for room photos
CREATE POLICY "Room photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'room-photos');

CREATE POLICY "Admins and hotel managers can upload room photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'room-photos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    auth.uid() IN (
      SELECT user_id FROM public.hotel_managers
    )
  )
);

-- Trigger for updating hotels updated_at
CREATE TRIGGER update_hotels_updated_at
BEFORE UPDATE ON public.hotels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();