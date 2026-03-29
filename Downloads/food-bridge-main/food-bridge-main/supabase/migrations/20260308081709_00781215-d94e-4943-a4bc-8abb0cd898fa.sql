-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'volunteer' CHECK (role IN ('restaurant', 'ngo', 'volunteer', 'admin')),
  phone TEXT,
  address TEXT,
  city TEXT,
  avatar_url TEXT,
  organization_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create food_donations table
CREATE TABLE public.food_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  food_category TEXT NOT NULL DEFAULT 'veg' CHECK (food_category IN ('veg', 'non-veg')),
  preparation_time TIMESTAMP WITH TIME ZONE NOT NULL,
  expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  image_url TEXT,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'picked_up', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.food_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view food donations" ON public.food_donations FOR SELECT USING (true);
CREATE POLICY "Restaurants can insert donations" ON public.food_donations FOR INSERT WITH CHECK (auth.uid() = restaurant_id);
CREATE POLICY "Restaurants can update their donations" ON public.food_donations FOR UPDATE USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurants can delete their donations" ON public.food_donations FOR DELETE USING (auth.uid() = restaurant_id);
CREATE POLICY "Authenticated users can update donation status" ON public.food_donations FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create pickup_requests table
CREATE TABLE public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES public.food_donations(id) ON DELETE CASCADE,
  ngo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_transit', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view pickup requests" ON public.pickup_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "NGOs can create pickup requests" ON public.pickup_requests FOR INSERT WITH CHECK (auth.uid() = ngo_id);
CREATE POLICY "Participants can update pickup requests" ON public.pickup_requests FOR UPDATE USING (auth.uid() = ngo_id OR auth.uid() = volunteer_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('new_donation', 'pickup_accepted', 'delivery_update', 'system')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();