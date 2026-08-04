const APP = {
  discordUrl: "https://discord.gg/Budc8VnFhm",
  kakobuyUrl: "https://ikako.vip/r/kvx20",
  supabaseUrl: "https://rxxjilskrzvcvsdqdamq.supabase.co",
  supabaseKey: "sb_publishable_bxJLm6XgbTJpQp1LCaqKKw_ogFpdaKM",
  table: "products"
};

const memoryStore = {};
const sessionMemory = {};

function safeLocalGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return key in memoryStore ? memoryStore[key] : null;
  }
}

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    memoryStore[key] = value;
  }
}

function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    return key in sessionMemory ? sessionMemory[key] : null;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    sessionMemory[key] = value;
  }
}

function safeSessionRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    delete sessionMemory[key];
  }
}

const FAVORITES_KEY = "kvx_favorites_v2";
const THEME_KEY = "kvx_theme_v2";
const LANGUAGE_KEY = "kvx_language_v2";
const POPUP_KEY = "kvx_popup_seen_v2";
const ADMIN_FLAG_KEY = "kvx_admin_logged_v2";

const DB = {
  supabase: null,

  init() {
    if (
      !window.supabase ||
      !APP.supabaseUrl ||
      !APP.supabaseKey ||
      APP.supabaseUrl.includes("TU_WKLEJ") ||
      APP.supabaseKey.includes("TU_WKLEJ")
    ) {
      console.warn("Supabase is not configured yet.");
      return null;
    }

    if (!this.supabase) {
      this.supabase = window.supabase.createClient(APP.supabaseUrl, APP.supabaseKey);
    }

    return this.supabase;
  },

  async getProducts() {
    const client = this.init();
    if (!client) return [];

    const { data, error } = await client
      .from(APP.table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getProducts error:", error.message);
      return [];
    }

    return (data || []).map((row) => this.normalizeProduct(row));
  },

  async getProductById(id) {
    const client = this.init();
    if (!client) return null;

    const { data, error } = await client
      .from(APP.table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("getProductById error:", error.message);
      return null;
    }

    return this.normalizeProduct(data);
  },

  async addProduct(product) {
    const client = this.init();
    if (!client) return { data: null, error: new Error("Supabase not configured") };

    const payload = {
      name: product.name || "",
      category: product.category || "Accessories",
      price: String(product.price || "").trim(),
      link: product.link || "",
      image: product.image || "",
      qc_images: Array.isArray(product.qcImages) ? product.qcImages : []
    };

    const { data, error } = await client
      .from(APP.table)
      .insert(payload)
      .select()
      .single();

    return {
      data: data ? this.normalizeProduct(data) : null,
      error
    };
  },

  async updateProduct(id, updates) {
    const client = this.init();
    if (!client) return { data: null, error: new Error("Supabase not configured") };

    const payload = {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.category !== undefined ? { category: updates.category } : {}),
      ...(updates.price !== undefined ? { price: String(updates.price).trim() } : {}),
      ...(updates.link !== undefined ? { link: updates.link } : {}),
      ...(updates.image !== undefined ? { image: updates.image } : {}),
      ...(updates.qcImages !== undefined ? { qc_images: Array.isArray(updates.qcImages) ? updates.qcImages : [] } : {})
    };

    const { data, error } = await client
      .from(APP.table)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    return {
      data: data ? this.normalizeProduct(data) : null,
      error
    };
  },

  async deleteProduct(id) {
    const client = this.init();
    if (!client) return { error: new Error("Supabase not configured") };

    const { error } = await client
      .from(APP.table)
      .delete()
      .eq("id", id);

    return { error };
  },

  async loginAdmin(email, password) {
    const client = this.init();
    if (!client) return { data: null, error: new Error("Supabase not configured") };

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (!error) {
      safeSessionSet(ADMIN_FLAG_KEY, "true");
    }

    return { data, error };
  },

  async logoutAdmin() {
    const client = this.init();
    safeSessionRemove(ADMIN_FLAG_KEY);

    if (!client) return;
    await client.auth.signOut();
  },

  async isAdminLoggedIn() {
    const client = this.init();
    if (!client) return false;

    const { data } = await client.auth.getSession();
    return !!data?.session;
  },

  normalizeProduct(row) {
    return {
      id: row.id,
      name: row.name || "",
      category: row.category || "Accessories",
      price: row.price || "",
      link: row.link || "",
      image: row.image || "",
      qcImages: Array.isArray(row.qc_images) ? row.qc_images : [],
      createdAt: row.created_at || null
    };
  },

  getFavorites() {
    const raw = safeLocalGet(FAVORITES_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      return [];
    }
  },

  saveFavorites(items) {
    safeLocalSet(FAVORITES_KEY, JSON.stringify(items.map(String)));
  },

  addFavorite(id) {
    const favorites = this.getFavorites();
    const value = String(id);

    if (!favorites.includes(value)) {
      favorites.push(value);
      this.saveFavorites(favorites);
    }
  },

  removeFavorite(id) {
    const value = String(id);
    const filtered = this.getFavorites().filter(item => item !== value);
    this.saveFavorites(filtered);
  },

  isFavorite(id) {
    return this.getFavorites().includes(String(id));
  },

  toggleFavorite(id) {
    if (this.isFavorite(id)) {
      this.removeFavorite(id);
      return false;
    }

    this.addFavorite(id);
    return true;
  }
};

const UI = {
  categories: [
    "All",
    "Shoes",
    "Headwear",
    "T-shirts",
    "Tracksuits",
    "Hoodies",
    "Pants",
    "Underwear",
    "Shorts",
    "Accessories",
    "Bags",
    "Electronics",
    "Jackets",
    "Polo",
    "Belts",
    "Sportswear",
    "Lego",
    "Room decorations",
    "Perfumes",
    "Sports shoes",
    "Watches",
    "Shoe accessories"
  ],

  translations: {
    en: {
      brand: "KVX Reps",
      navHome: "Home",
      navFavorites: "Favorites",
      navAdmin: "Admin",
      heroBadge: "Premium replica picks",
      heroTitle: "Clean finds. Better links. One shared catalog.",
      heroText: "A premium browsing experience for carefully added products, organized cleanly and built for quick access.",
      heroPrimary: "Browse products",
      heroSecondary: "Open favorites",
      searchPlaceholder: "Search products...",
      categoriesTitle: "Categories",
      productsTitle: "All products",
      emptyTitle: "No products found",
      emptyText: "Try another search or category.",
      buyNow: "Open product",
      details: "Details",
      save: "Save",
      saved: "Saved",
      favoritesTitle: "Favorites",
      popupBadge: "Before you start",
      popupTitle: "Join Discord and unlock Kakobuy coupons",
      popupText: "Use Discord for help, links and updates. Use the Kakobuy referral for coupons and easier ordering.",
      popupDiscord: "Join Discord",
      popupKakobuy: "Open Kakobuy",
      popupClose: "Continue to site",
      promoDiscord: "Need links or help? Join Discord",
      promoKakobuy: "Need coupons? Open Kakobuy",
      footerText: "Shared product database. Private favorites in your browser."
    },
    pl: {
      brand: "KVX Reps",
      navHome: "Start",
      navFavorites: "Ulubione",
      navAdmin: "Admin",
      heroBadge: "Wybrane premium repy",
      heroTitle: "Najlepsze oferty. Sprawdzone linki. Wszystko w jednym miejscu.",
      heroText: "Wszystko, co potrzebne, w jednym miejscu – czytelnie, szybko i wygodnie.",
      heroPrimary: "Przeglądaj produkty",
      heroSecondary: "Otwórz ulubione",
      searchPlaceholder: "Szukaj produktów...",
      categoriesTitle: "Kategorie",
      productsTitle: "Wszystkie produkty",
      emptyTitle: "Nie znaleziono produktów",
      emptyText: "Spróbuj innego wyszukiwania albo kategorii.",
      buyNow: "Otwórz produkt",
      details: "Szczegóły",
      save: "Zapisz",
      saved: "Zapisano",
      favoritesTitle: "Ulubione",
      popupBadge: "Zanim zaczniesz",
      popupTitle: "Wejdź na Discord i odpal zniżki Kakobuy",
      popupText: "Na Discordzie masz pomoc, linki i aktualizacje. Kakobuy daje kupony i łatwiejsze zamawianie.",
      popupDiscord: "Dołącz do Discorda",
      popupKakobuy: "Otwórz Kakobuy",
      popupClose: "Przejdź do strony",
      promoDiscord: "Potrzebujesz linków albo pomocy? Wejdź na Discord",
      promoKakobuy: "Chcesz kupony? Otwórz Kakobuy",
      footerText: "Wspólna baza produktów. Prywatne ulubione zapisane w Twojej przeglądarce."
    }
  },

  getLang() {
    const lang = safeLocalGet(LANGUAGE_KEY);
    return lang === "pl" || lang === "en" ? lang : "pl";
  },

  setLang(lang) {
    safeLocalSet(LANGUAGE_KEY, lang);
  },

  t(key) {
    const lang = this.getLang();
    return this.translations[lang]?.[key] || this.translations.pl[key] || key;
  },

  getTheme() {
    const stored = safeLocalGet(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },

  setTheme(theme) {
    safeLocalSet(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  },

  toggleTheme() {
    const current = this.getTheme();
    const next = current === "dark" ? "light" : "dark";
    this.setTheme(next);
    return next;
  },

  shouldShowPopup() {
    return safeLocalGet(POPUP_KEY) !== "seen";
  },

  closePopupForever() {
    safeLocalSet(POPUP_KEY, "seen");
  }
};

window.APP = APP;
window.DB = DB;
window.UI = UI;