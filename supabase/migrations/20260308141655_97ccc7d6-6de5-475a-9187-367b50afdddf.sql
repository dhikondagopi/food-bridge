
ALTER TABLE public.pickup_requests
ADD COLUMN pickup_photo_url text DEFAULT NULL,
ADD COLUMN delivery_photo_url text DEFAULT NULL;
