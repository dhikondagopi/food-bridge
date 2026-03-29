export interface FoodDonation {
  id: string;
  restaurant_id: string;
  food_name: string;
  quantity: number;
  food_category: string;
  preparation_time: string;
  expiry_time: string;
  pickup_time: string;
  description?: string | null;
  image_url?: string | null;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    organization_name?: string | null;
  } | null;
}

export interface PickupRequest {
  id: string;
  donation_id: string;
  ngo_id: string;
  volunteer_id?: string | null;
  status: string;
  created_at: string;
  food_donations?: FoodDonation | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}
