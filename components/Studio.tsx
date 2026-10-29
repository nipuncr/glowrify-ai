"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Camera,
  Check,
  CloudSun,
  Heart,
  Loader2,
  MapPin,
  ScanLine,
  ShieldCheck,
  Upload,
  X,
  LogOut,
} from "lucide-react";
import { authClient, request, guestRequest } from "@/lib/supabase";
import { Edit, History, Profile, inr } from "@/lib/types";
import Dialog from "./Dialog";
const occasions = ["Casual", "Formal", "Party", "Work", "Travel", "Active"];
// Demo-ready real product photography, selected by catalog SKU where available.
const productPhotos: Record<string, string> = {
  "GLO-001": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85",
  "GLO-002": "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85",
  "GLO-003": "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=900&q=85",
  "GLO-004": "https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=900&q=85",
  "GLO-005": "https://images.unsplash.com/photo-1620012253295-c15a3e6e4bb0?auto=format&fit=crop&w=900&q=85",
  "GLO-006": "https://www.kraftindia.in/cdn/shop/files/IMG_0060_724a0488-239b-477d-8fba-1047287f945f.jpg?v=1726048894&width=1080",
  "GLO-007": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85",
  "GLO-008": "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=900&q=85",
  "GLO-009": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85",
  "GLO-010": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85",
  "GLO-011": "https://images.unsplash.com/photo-1625910513413-5fc45e2e3c34?auto=format&fit=crop&w=900&q=85",
  "GLO-012": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
  "GLO-013": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
  "GLO-014": "https://mondabeqiri.com/cdn/shop/files/2923DEFF-0CF2-4065-A686-F10709AC9FFD.jpg?v=1737375795&width=1200",
};

type Audience = "Men" | "Women";
type OutfitPiece = { label: string; query: string; color: string; category: string };
const outfitPieces = (occasion: string, audience: Audience): OutfitPiece[] => {
  const womens: Record<string, OutfitPiece[]> = {
    Casual: [
      { label: "Bottom · Straight-leg jeans", query: "women high rise straight fit blue jeans", color: "Classic blue", category: "jeans" },
      { label: "Shoes · White sneakers", query: "women white casual sneakers", color: "White", category: "shoes" },
      { label: "Accessory · Everyday shoulder bag", query: "women casual shoulder bag", color: "Tan", category: "bags" },
    ],
    Formal: [
      { label: "Bottom · Tailored trousers", query: "women formal tailored trousers", color: "Charcoal", category: "trousers" },
      { label: "Shoes · Closed-toe heels", query: "women formal block heels", color: "Black", category: "heels" },
      { label: "Accessory · Structured tote", query: "women formal office tote bag", color: "Black", category: "bags" },
    ],
    Party: [
      { label: "Bottom · Satin midi skirt", query: "women satin midi skirt party wear", color: "Black", category: "skirts" },
      { label: "Shoes · Party heels", query: "women party high heels", color: "Metallic", category: "heels" },
      { label: "Accessory · Statement earrings", query: "women statement party earrings", color: "Gold", category: "jewellery" },
    ],
    Work: [
      { label: "Bottom · Straight-fit trousers", query: "women office straight fit trousers", color: "Beige", category: "trousers" },
      { label: "Shoes · Loafers", query: "women formal loafers office", color: "Brown", category: "flats" },
      { label: "Accessory · Work tote", query: "women laptop office tote bag", color: "Tan", category: "bags" },
    ],
    Travel: [
      { label: "Bottom · Relaxed cargo pants", query: "women relaxed cargo pants travel", color: "Olive", category: "trousers" },
      { label: "Shoes · Walking sneakers", query: "women lightweight walking sneakers", color: "Neutral", category: "sports-shoes" },
      { label: "Accessory · Crossbody bag", query: "women travel crossbody sling bag", color: "Black", category: "bags" },
    ],
    Active: [
      { label: "Bottom · Training leggings", query: "women quick dry gym leggings", color: "Black", category: "sports-wear" },
      { label: "Shoes · Running shoes", query: "women running shoes", color: "Black / white", category: "sports-shoes" },
      { label: "Accessory · Sports cap", query: "women sports running cap", color: "Black", category: "caps" },
    ],
  };
  const mens: Record<string, OutfitPiece[]> = {
    Casual: [
      { label: "Bottom · Straight-fit jeans", query: "men straight fit blue jeans", color: "Classic blue", category: "jeans" },
      { label: "Shoes · Clean sneakers", query: "men white casual sneakers", color: "White", category: "casual-shoes" },
      { label: "Accessory · Everyday watch", query: "men minimalist everyday watch", color: "Silver / black", category: "watches" },
    ],
    Formal: [
      { label: "Bottom · Tailored trousers", query: "men slim fit formal trousers charcoal", color: "Charcoal", category: "trousers" },
      { label: "Shoes · Oxford shoes", query: "men black oxford formal shoes", color: "Black", category: "formal-shoes" },
      { label: "Accessory · Leather belt", query: "men black leather formal belt", color: "Black", category: "belts" },
    ],
    Party: [
      { label: "Bottom · Smart trousers", query: "men party wear tailored trousers black", color: "Black", category: "trousers" },
      { label: "Shoes · Loafers", query: "men party wear black loafers", color: "Black", category: "casual-shoes" },
      { label: "Accessory · Minimal chain", query: "men minimalist silver chain necklace", color: "Silver", category: "accessories" },
    ],
    Work: [
      { label: "Bottom · Office chinos", query: "men office slim fit chinos beige", color: "Beige", category: "trousers" },
      { label: "Shoes · Derby shoes", query: "men brown derby office shoes", color: "Brown", category: "formal-shoes" },
      { label: "Accessory · Work bag", query: "men minimalist office laptop bag", color: "Tan / black", category: "bags" },
    ],
    Travel: [
      { label: "Bottom · Stretch chinos", query: "men travel stretch chinos olive", color: "Olive", category: "trousers" },
      { label: "Shoes · Walking sneakers", query: "men lightweight walking sneakers", color: "Neutral", category: "casual-shoes" },
      { label: "Accessory · Crossbody bag", query: "men travel crossbody sling bag", color: "Black", category: "bags" },
    ],
    Active: [
      { label: "Bottom · Training joggers", query: "men quick dry training joggers", color: "Black", category: "track-pants" },
      { label: "Shoes · Running shoes", query: "men running shoes lightweight", color: "Black / white", category: "sports-shoes" },
      { label: "Accessory · Sports cap", query: "men sports running cap", color: "Black", category: "caps" },
    ],
  };
  return (audience === "Women" ? womens : mens)[occasion] || (audience === "Women" ? womens.Casual : mens.Casual);
};
type TopOption = { label: string; query: string; color: string; category: string };
const topOptions = (occasion: string, audience: Audience): TopOption[] => {
  const looks: Record<Audience, Record<string, TopOption[]>> = {
    Men: {
      Casual: [{label:"Relaxed overshirt",query:"men casual overshirt",color:"Olive",category:"shirts"},{label:"Textured polo tee",query:"men textured polo t shirt",color:"Cream",category:"tshirts"},{label:"Graphic-free crew tee",query:"men solid crew neck t shirt",color:"Black",category:"tshirts"}],
      Formal: [{label:"Crisp formal shirt",query:"men slim fit formal shirt",color:"White",category:"shirts"},{label:"Knit polo",query:"men smart casual knit polo",color:"Navy",category:"tshirts"},{label:"Structured blazer",query:"men tailored formal blazer",color:"Charcoal",category:"blazers"}],
      Party: [{label:"Satin evening shirt",query:"men satin party shirt",color:"Black",category:"shirts"},{label:"Statement black shirt",query:"men black party wear shirt",color:"Black",category:"shirts"},{label:"Textured party blazer",query:"men party wear blazer",color:"Burgundy",category:"blazers"}],
      Work: [{label:"Oxford office shirt",query:"men oxford office shirt",color:"Light blue",category:"shirts"},{label:"Fine-knit polo",query:"men smart casual polo shirt",color:"Navy",category:"tshirts"},{label:"Unstructured blazer",query:"men unstructured office blazer",color:"Taupe",category:"blazers"}],
      Travel: [{label:"Linen blend shirt",query:"men linen blend casual shirt",color:"Sand",category:"shirts"},{label:"Lightweight hoodie",query:"men lightweight travel hoodie",color:"Grey",category:"sweatshirts"},{label:"Utility overshirt",query:"men utility overshirt",color:"Olive",category:"shirts"}],
      Active: [{label:"Quick-dry training tee",query:"men quick dry gym t shirt",color:"Black",category:"sports-wear"},{label:"Performance polo",query:"men sports polo t shirt",color:"Navy",category:"sports-wear"},{label:"Lightweight training jacket",query:"men lightweight running jacket",color:"Grey",category:"sports-wear"}],
    },
    Women: {
      Casual: [{label:"Relaxed cotton shirt",query:"women relaxed cotton casual shirt",color:"White",category:"shirts"},{label:"Ribbed fitted tee",query:"women ribbed fitted t shirt",color:"Cream",category:"tshirts"},{label:"Relaxed knit top",query:"women casual knit top",color:"Sage",category:"tops"}],
      Formal: [{label:"Tailored blouse",query:"women formal office blouse",color:"Ivory",category:"tops"},{label:"Structured shirt",query:"women formal button down shirt",color:"Blue",category:"shirts"},{label:"Single-breasted blazer",query:"women formal tailored blazer",color:"Charcoal",category:"blazers"}],
      Party: [{label:"Satin party top",query:"women satin party top",color:"Black",category:"tops"},{label:"Statement blouse",query:"women statement party blouse",color:"Wine",category:"tops"},{label:"Dressy corset top",query:"women party corset top",color:"Burgundy",category:"tops"}],
      Work: [{label:"Smart office blouse",query:"women office formal blouse",color:"Light blue",category:"tops"},{label:"Striped work shirt",query:"women striped office shirt",color:"Blue / white",category:"shirts"},{label:"Lightweight work blazer",query:"women office blazer",color:"Beige",category:"blazers"}],
      Travel: [{label:"Linen blend shirt",query:"women linen blend travel shirt",color:"Sand",category:"shirts"},{label:"Soft oversized tee",query:"women oversized cotton t shirt",color:"White",category:"tshirts"},{label:"Zip-up sweatshirt",query:"women lightweight zip up sweatshirt",color:"Grey",category:"sweatshirts"}],
      Active: [{label:"Quick-dry training tee",query:"women quick dry gym t shirt",color:"Black",category:"sports-wear"},{label:"Supportive sports top",query:"women sports bra workout top",color:"Black",category:"sports-wear"},{label:"Lightweight training jacket",query:"women running training jacket",color:"Lilac",category:"sports-wear"}],
    },
  };
  return looks[audience][occasion] || looks[audience].Casual;
};
// Use a category landing page plus a specific query so a shoe link doesn't open a generic/kids feed.
const shopSearch = (query: string, audience: Audience, category: string) => {
  const prefix = audience === "Women" ? "women" : "men";
  const categorySlug = `${prefix}-${category}`;
  return `https://www.myntra.com/${categorySlug}?rawQuery=${encodeURIComponent(query)}`;
};
export default function Studio({
  accountOpen,
  openAccount,
  closeAccount,
  onUser,
}: {
  accountOpen: boolean;
  openAccount: () => void;
  closeAccount: () => void;
  onUser: (email: string) => void;
}) {
  const reduced = useReducedMotion();
  const [profile, setProfile] = useState<Profile>({
    gender: "Men",
    age: 20,
    height_cm: 170,
    weight_kg: 65,
    occasion: "Casual",
  });
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [user, setUser] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [history, setHistory] = useState<History[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const requestId = useRef("");
  // Keep complete-look links aligned with the gender used for the current analysis.
  const audience: Audience = edit?.analysis.profile.gender ?? profile.gender;
  useEffect(() => {
    mounted.current = true;
    let unsubscribe: (() => void) | undefined;
    authClient()
      .then(async (client) => {
        if (!mounted.current) return;
        const {
          data: { session },
        } = await client.auth.getSession();
        if (!mounted.current) return;
        setUser(session?.user.email || "");
        onUser(session?.user.email || "");
        const { data } = client.auth.onAuthStateChange((event, session) => {
          setUser(session?.user.email || "");
          onUser(session?.user.email || "");
          if (event === "SIGNED_OUT") {
            setEdit(null);
            setFile(null);
            setHistory([]);
            setFavorites([]);
          }
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
      unsubscribe?.();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onUser]);
  useEffect(() => {
    if (!file) {
      setPhotoUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (camera && video.current && stream.current)
      video.current.srcObject = stream.current;
  }, [camera]);
  useEffect(() => {
    if (!accountOpen || !user) return;
    let live = true;
    setHistoryBusy(true);
    setAuthMessage("");
    request<History[]>("/api/sessions")
      .then((rows) => {
        if (live) setHistory(rows);
      })
      .catch((e) => {
        if (live) setAuthMessage(e.message);
      })
      .finally(() => {
        if (live) setHistoryBusy(false);
      });
    return () => {
      live = false;
    };
  }, [accountOpen, user]);
  function changeProfile(key: keyof Profile, value: number | string) {
    setProfile((p) => ({ ...p, [key]: value }));
    requestId.current = "";
  }
  function choosePhoto(photo?: File) {
    if (!photo || busy) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type) ||
      photo.size > 8 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG, or WebP smaller than 8 MB.");
      return;
    }
    setFile(photo);
    setEdit(null);
    requestId.current = "";
    setError("");
  }
  async function startCamera() {
    setError("");
    setCameraBusy(true);
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (!mounted.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = next;
      setCamera(true);
    } catch {
      setError("Camera access is unavailable. Allow access or upload a photo.");
    } finally {
      if (mounted.current) setCameraBusy(false);
    }
  }
  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  }
  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob)
          choosePhoto(new File([blob], "portrait.jpg", { type: "image/jpeg" }));
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  }
  function locate() {
    setLocating(true);
    if (!navigator.geolocation) {
      setError("Location is unavailable. Enter your city instead.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoordinates({ lat: p.coords.latitude, lon: p.coords.longitude });
        requestId.current = "";
        setLocating(false);
        setError("");
      },
      () => {
        setError("Location was not shared. Enter your city instead.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Upload or capture a photo first.");
      return;
    }
    if (!consent) {
      setError("Please consent to processing your photo.");
      return;
    }
    if (!coordinates && !city.trim()) {
      setError("Enter your city or share your location.");
      return;
    }
    setBusy(true);
    try {
      if (!requestId.current) requestId.current = crypto.randomUUID();
      const body = new FormData();
      body.set("photo", file);
      body.set("profile", JSON.stringify(profile));
      body.set(
        "location",
        JSON.stringify(coordinates || { city: city.trim() }),
      );
      body.set("consent", "true");
      body.set("request_id", requestId.current);
      const result = await guestRequest<Edit>("/api/guest/analyze-silhouette", {
        method: "POST",
        body,
      });
      setEdit(result);
      setFavorites([]);
      setTimeout(
        () =>
          document
            .getElementById("edit")
            ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" }),
        50,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const client = await authClient();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setAuthMessage("Check your email for your secure sign-in link.");
    } catch (e) {
      setAuthMessage((e as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }
  async function loadSession(id: string) {
    setHistoryBusy(true);
    setAuthMessage("");
    try {
      const result = await request<Edit>(`/api/sessions/${id}`);
      setEdit(result);
      closeAccount();
      setTimeout(
        () =>
          document
            .getElementById("edit")
            ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" }),
        50,
      );
    } catch (e) {
      setAuthMessage((e as Error).message);
    } finally {
      setHistoryBusy(false);
    }
  }
  async function removeSession(id: string) {
    setHistoryBusy(true);
    setAuthMessage("");
    try {
      await request<void>(`/api/sessions/${id}`, { method: "DELETE" });
      setHistory((rows) => rows.filter((row) => row.id !== id));
      if (edit?.analysis.id === id) {
        setEdit(null);
        setFile(null);
        requestId.current = "";
      }
    } catch (e) {
      setAuthMessage((e as Error).message);
    } finally {
      setHistoryBusy(false);
    }
  }
  return (
    <>
      <motion.section
        id="studio"
        className="studio section-wrap"
        initial={reduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="section-title">
          <div>
            <span className="eyebrow">01 / YOUR STYLE STARTS HERE</span>
            <h2>
              Let’s get to <em>know you.</em>
            </h2>
          </div>
          <span className="privacy">
            <ShieldCheck size={16} /> Guest demo · no sign-in · photos are not saved
          </span>
        </div>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="studio-grid">
            <div className="upload-panel">
              <div
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  choosePhoto(e.dataTransfer.files[0]);
                }}
              >
                {photoUrl ? (
                  <>
                    <img src={photoUrl} alt="Your selected styling photo" />
                    <button
                      type="button"
                      className="remove-photo"
                      aria-label="Remove selected photo"
                      onClick={() => {
                        setFile(null);
                        requestId.current = "";
                        if (input.current) input.current.value = "";
                      }}
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="scan-icon">
                      <ScanLine size={38} strokeWidth={1} />
                    </div>
                    <h3>A picture of possibility.</h3>
                    <p>
                      Upload a full-length, front-facing photo.
                      <br />
                      Keep your shoulders and hips clearly visible.
                    </p>
                    <button
                      type="button"
                      className="button dark"
                      onClick={() => input.current?.click()}
                    >
                      <Upload size={16} /> Upload a photo
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={cameraBusy}
                      onClick={startCamera}
                    >
                      <Camera size={15} />
                      {cameraBusy ? "Opening camera…" : "Use your camera"}
                    </button>
                    <small>JPG, PNG or WEBP · Up to 8 MB</small>
                  </>
                )}
                <input
                  ref={input}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => choosePhoto(e.target.files?.[0])}
                />
              </div>
              <p className="fineprint">
                <ShieldCheck size={14} /> Your photo is processed for this session and is not saved to an account.
              </p>
            </div>
            <div className="details-panel">
              <h3>The details make the difference.</h3>
              <p>Set your occasion. We’ll check the weather.</p>
              <span className="field-label" id="gender-label">
                Shop styles for
              </span>
              <div className="occasion-options" role="group" aria-labelledby="gender-label">
                {(["Men", "Women"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={profile.gender === g}
                    className={profile.gender === g ? "active" : ""}
                    onClick={() => changeProfile("gender", g)}
                  >
                    {g}
                    {profile.gender === g && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="measurements">
                {(
                  [
                    {
                      title: "Age",
                      key: "age",
                      unit: "years",
                      min: 18,
                      max: 100,
                    },
                    {
                      title: "Height",
                      key: "height_cm",
                      unit: "cm",
                      min: 100,
                      max: 230,
                    },
                    {
                      title: "Weight",
                      key: "weight_kg",
                      unit: "kg",
                      min: 30,
                      max: 250,
                    },
                  ] as const
                ).map((f) => (
                  <label key={f.key}>
                    {f.title}
                    <div className="input-unit">
                      <input
                        required
                        type="number"
                        min={f.min}
                        max={f.max}
                        step={f.key === "age" ? 1 : 0.1}
                        value={profile[f.key]}
                        onChange={(e) =>
                          changeProfile(f.key, Number(e.target.value))
                        }
                      />
                      <span>{f.unit}</span>
                    </div>
                  </label>
                ))}
              </div>
              <span className="field-label" id="occasion-label">
                What’s the occasion?
              </span>
              <div
                className="occasion-options"
                role="group"
                aria-labelledby="occasion-label"
              >
                {occasions.map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={profile.occasion === o}
                    className={profile.occasion === o ? "active" : ""}
                    onClick={() => changeProfile("occasion", o)}
                  >
                    {o}
                    {profile.occasion === o && <Check size={14} />}
                  </button>
                ))}
              </div>
              <label className="city-input">
                Your city
                <input
                  value={city}
                  maxLength={100}
                  placeholder="City, country code"
                  required={!coordinates}
                  disabled={!!coordinates || busy}
                  onChange={(e) => {
                    setCity(e.target.value);
                    requestId.current = "";
                  }}
                />
              </label>
              <button
                className="location-row"
                type="button"
                disabled={locating}
                onClick={
                  coordinates
                    ? () => {
                        setCoordinates(null);
                        requestId.current = "";
                      }
                    : locate
                }
              >
                <MapPin size={18} />
                <span>
                  {coordinates ? "Location shared" : "Use current location"}
                  <small>
                    {coordinates
                      ? "Tap to enter a city instead"
                      : locating
                        ? "Finding your location…"
                        : "For the current local weather"}
                  </small>
                </span>
                {coordinates && <Check size={18} />}
              </button>
              <label className="consent">
                <input
                  required
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                I’m 18 or older and consent to processing this photo for styling. It will not be saved to an account.
              </label>
              <button type="submit" className="button lime full">
                {busy ? (
                  <>
                    <Loader2 size={18} className="spin" /> Analyzing your style…
                  </>
                ) : (
                  <>
Create my personal edit
                    <ArrowUpRight size={20} />
                  </>
                )}
              </button>
              <p className="error" role="alert">
                {error}
              </p>
            </div>
          </fieldset>
        </form>
      </motion.section>
      {edit && (
        <>
          <motion.section
            id="edit"
            className="edit section-wrap"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <section id="complete-outfits" className="complete-outfits" aria-labelledby="complete-outfits-title">
              <div className="outfit-heading">
                <div className="audience-picker" aria-label="Outfit audience">
                  <span className="eyebrow">STYLES FOR {profile.gender.toUpperCase()}</span>
                </div>
                <div>
                  <span className="eyebrow">02 / HEAD-TO-TOE STYLING</span>
                  <h3 id="complete-outfits-title">Complete looks for {edit.analysis.occasion.toLowerCase()}.</h3>
                  <p>Pair each recommended top with matching bottoms, shoes and an accessory.</p>
                </div>
              </div>
              <div className="outfit-grid">
                {edit.items.slice(0, 3).map((g, index) => {
                  const pieces = outfitPieces(edit.analysis.occasion, audience);
                  const top = topOptions(edit.analysis.occasion, audience)[index % 3];
                  const outfitName = ["The everyday edit", "The polished edit", "The statement edit"][index] || "The complete edit";
                  const palette = [top.color, pieces[0].color, pieces[1].color].join(" · ");
                  return (
                    <article className="outfit-card" key={`outfit-${g.id}`}>
                      <div className="outfit-card-head">
                        <span className="eyebrow">LOOK 0{index + 1}</span>
                        <h4>{outfitName}</h4>
                        <p className="outfit-palette">Color story: {palette}</p>
                      </div>
                      <div className="outfit-pieces">
                        <div className="outfit-piece">
                          <span className="piece-number">01</span>
                          <div><strong>Top · {top.label}</strong><small>Suggested color: {top.color}</small></div>
                          <a href={shopSearch(top.query, audience, top.category)} target="_blank" rel="noreferrer">Shop <ArrowUpRight size={14} /></a>
                        </div>
                        {pieces.map((piece, pieceIndex) => (
                          <div className="outfit-piece" key={piece.label}>
                            <span className="piece-number">0{pieceIndex + 2}</span>
                            <div><strong>{piece.label}</strong><small>Suggested color: {piece.color}</small></div>
                            <a href={shopSearch(piece.query, audience, piece.category)} target="_blank" rel="noreferrer">Shop <ArrowUpRight size={14} /></a>
                          </div>
                        ))}
                      </div>
                      <p className="outfit-note"><Check size={14} /> {edit.analysis.occasion} look · {edit.weather.temp}°C in {edit.weather.city}</p>
                    </article>
                  );
                })}
              </div>
              <p className="outfit-disclaimer">Shopping links open search results, not verified individual product listings. Check product details and prices on the retailer site.</p>
            </section>
            <div className="section-title">
              <div>
                <span className="eyebrow">03 / CURATED FOR YOUR DAY</span>
                <h2>
                  Your personal <em>edit.</em>
                </h2>
              </div>
              <span className="eyebrow">ALL PRICES IN INR</span>
            </div>
            <div className="edit-context">
              <span>
                <CloudSun size={18} />
                {edit.weather.temp}°C · {edit.weather.description}
              </span>
              <span>{edit.weather.city}</span>
              <span>{edit.analysis.occasion}</span>
            </div>
            <p className="analysis-summary">
              {edit.analysis.silhouette.replace("-", " ")} proportions · Weather
              observed{" "}
              {new Date(edit.weather.observed_at * 1000).toLocaleString(
                "en-IN",
              )}{" "}
              · OpenWeatherMap
            </p>
            {edit.items.length ? (
              <div className="garment-grid">
                {edit.items.map((g, i) => (
                  <article key={g.id} className="garment-card">
                    <div className={`garment-image tone-${i % 3}`}>
                      <span className="garment-badge">
                        {g.material.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        className="favorite"
                        aria-label={`${favorites.includes(g.id) ? "Unsave" : "Save"} ${g.name}`}
                        onClick={() =>
                          setFavorites((f) =>
                            f.includes(g.id)
                              ? f.filter((id) => id !== g.id)
                              : [...f, g.id],
                          )
                        }
                      >
                        <Heart
                          size={18}
                          fill={
                            favorites.includes(g.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                      <img src={productPhotos[g.sku] || g.image_url} alt={`${g.color} ${g.name}`} loading="lazy" />
                      <a
                        className="try-button"
                        href="https://anywear.decart.ai/virtual-try-on"
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open live virtual try-on for ${g.name}`}
                      >
                        Try on live <ArrowUpRight size={16} />
                      </a>
                    </div>
                    <div className="garment-info">
                      <span className="eyebrow">{g.category}</span>
                      <h3>{g.name}</h3>
                      <p>
                        {g.color}
                        <span>{inr(g.price_inr)}</span>
                      </p>
                      <div className="reason-row">
                        {g.reasons.map((reason) => (
                          <span key={reason}>
                            <Check size={12} />
                            {reason}
                          </span>
                        ))}
                      </div>
                      <p className="fineprint">
                        Available sizes: {g.sizes.join(" / ")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No matching pieces for these conditions.</h3>
                <p>
                  Try another occasion or photo. Guest results are temporary.
                </p>
              </div>
            )}

          </motion.section>
          <div className="live-tryon-fallback section-wrap">
            <div>
              <span className="eyebrow">LIVE VIRTUAL TRY-ON</span>
              <h3>See the outfit move with you.</h3>
              <p>Anywear blocks embedding its camera inside this page, so open the live try-on in a separate tab instead. Your outfit and shopping links remain here.</p>
            </div>
            <a className="button dark" href="https://anywear.decart.ai/virtual-try-on" target="_blank" rel="noreferrer">Open live try-on <ArrowUpRight size={16} /></a>
          </div>
          {/* The old 2D photo overlay is intentionally not shown as the live try-on. */}
        </>
      )}
      {camera && (
        <Dialog title="Step into the frame." onClose={stopCamera}>
          <p>Keep your shoulders and hips visible and face the camera.</p>
          <video ref={video} muted autoPlay playsInline />
          <button type="button" className="button dark" onClick={capture}>
            <Camera size={16} /> Capture photo
          </button>
        </Dialog>
      )}
      {accountOpen && (
        <Dialog
          title={user ? "Your style archive." : "Make yourself at home."}
          onClose={closeAccount}
        >
          {user ? (
            <>
              <p>{user}</p>
              {historyBusy && <p role="status">Loading your archive…</p>}
              <div className="history-list">
                {history.map((row) => (
                  <div key={row.id}>
                    <button
                      className="history-open"
                      disabled={historyBusy}
                      onClick={() => loadSession(row.id)}
                    >
                      {row.occasion}
                      <small>
                        {new Date(row.created_at).toLocaleDateString("en-IN")}
                      </small>
                    </button>
                    <button
                      className="text-button"
                      disabled={historyBusy}
                      onClick={() => removeSession(row.id)}
                    >
                      Delete photo & data
                    </button>
                  </div>
                ))}
              </div>
              {!historyBusy && !history.length && (
                <p>Your completed styling sessions will appear here.</p>
              )}
              <button
                className="button dark"
                onClick={async () => {
                  try {
                    const client = await authClient();
                    await client.auth.signOut();
                    setAuthMessage("");
                    closeAccount();
                  } catch (e) {
                    setAuthMessage((e as Error).message);
                  }
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <div>
              <p>Guest demo is enabled. You can create a styling edit without signing in.</p>
              <p className="fineprint">Guest edits are temporary and are not saved to an account.</p>
            </div>
          )}
          <p role="status">{authMessage}</p>
        </Dialog>
      )}
    </>
  );
}
