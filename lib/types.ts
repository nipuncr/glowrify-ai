export type Point = { x: number; y: number; z: number; visibility: number };
export type Profile = {
  gender: "Men" | "Women";
  age: number;
  height_cm: number;
  weight_kg: number;
  occasion: string;
};
export type Weather = {
  temp: number;
  feels_like: number;
  description: string;
  city: string;
  rain: boolean;
  humidity: number;
  wind_mps: number;
  observed_at: number;
  source: string;
};
export type Analysis = {
  id: string;
  image_url: string;
  landmarks: Point[];
  world_landmarks: { x: number; y: number; z: number }[];
  silhouette: string;
  shoulder_hip_ratio: number;
  confidence: number;
  profile: Profile;
  occasion: string;
  created_at: string;
};
export type Garment = {
  gender: "Men" | "Women" | "Unisex";
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  color: string;
  material: string;
  price_inr: number;
  currency: "INR";
  image_url: string;
  overlay_url: string;
  occasions: string[];
  body_shapes: string[];
  min_temp: number;
  max_temp: number;
  water_resistant: boolean;
  sizes: string[];
  score: number;
  reasons: string[];
  anchors: {
    left_shoulder: [number, number];
    right_shoulder: [number, number];
    hip: [number, number];
  };
};
export type Edit = { analysis: Analysis; items: Garment[]; weather: Weather };
export type History = {
  id: string;
  occasion: string;
  silhouette: string;
  created_at: string;
};
export const inr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
