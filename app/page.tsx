
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Search,
  MapPin,
  Plus,
  Package,
  X,
  Clock,
  Laptop,
  BookOpen,
  Headphones,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ItemType = "Lost" | "Found";

type Item = {
  id: number;
  name: string;
  location: string;
  category: string;
  type: ItemType;
  date: string;
  image_url: string | null;
  contact_email: string | null;
  status: "Active" | "Claimed";
};

const categories = [
  "All",
  "Electronics",
  "Accessories",
  "Books",
];

function CategoryIcon({ category }: { category: string }) {
  const iconClass = "h-7 w-7";

  switch (category) {
    case "Electronics":
      return <Laptop className={iconClass} />;
    case "Books":
      return <BookOpen className={iconClass} />;
    case "Accessories":
      return <Headphones className={iconClass} />;
    default:
      return <Package className={iconClass} />;
  }
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [category, setCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    const formattedItems: Item[] = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      location: item.location,
      category: item.category,
      type: item.type as ItemType,
      date: item.created_at
        ? new Date(item.created_at).toLocaleDateString()
        : "Recently",
        image_url: item.image_url || null,
        contact_email: item.contact_email || null,
        status: item.status || "Active",
    }));

    setItems(formattedItems);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

 async function handleClaim(itemId: number) {
  const confirmed = window.confirm(
    "Are you sure you want to mark this item as claimed?"
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("items")
    .update({ status: "Claimed" })
    .eq("id", itemId);

  if (error) {
    console.error("Claim error:", error);
    setError(error.message);
    return;
  }

  await loadItems();
}

async function handleReport(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const name = String(formData.get("name") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const contactEmail = String(
  formData.get("contact_email") || ""
).trim();
  const type = String(formData.get("type") || "Lost");
  const category = String(formData.get("category") || "Accessories");
  const image = formData.get("image") as File | null;
  

  if (!name || !location) {
    setError("Please fill in all required fields.");
    return;
  }

  if (image && image.size > 5 * 1024 * 1024) {
    setError("Image must be smaller than 5 MB.");
    return;
  }

  setSubmitting(true);
  setError("");

  let imageUrl: string | null = null;

  // Upload image if the user selected one
  if (image && image.size > 0) {
    const extension = image.name.split(".").pop() || "jpg";
    const filePath = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(filePath, image);

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      setError(uploadError.message);
      setSubmitting(false);
      return;
    }

    const { data } = supabase.storage
      .from("item-images")
      .getPublicUrl(filePath);

    imageUrl = data.publicUrl;
  }

  // Save listing details in the database
  const { error: insertError } = await supabase
    .from("items")
    .insert({
      name,
      location,
      type,
      category,
      status: "Active",
      image_url: imageUrl,
      contact_email: contactEmail,
    });

  if (insertError) {
    console.error("Listing error:", insertError);
    setError(insertError.message);
    setSubmitting(false);
    return;
  }

  form.reset();
  setShowForm(false);
  setSubmitting(false);

  await loadItems();
}


  const filteredItems = items.filter((item) => {
    const matchesTab =
      activeTab === "All" || item.type === activeTab;

    const matchesCategory =
      category === "All" || item.category === category;

    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVBAR */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="#" className="flex items-center gap-2">
            <div className="rounded-xl bg-violet-600 p-2 text-white">
              <Package size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Campus<span className="text-violet-600">Find</span>
            </span>
          </a>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <Plus size={18} />
            Report an item
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mb-5 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
            Your campus lost and found platform
          </span>

          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Lost something?
            <br />
            <span className="text-violet-300">
              Find it here.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-violet-100 md:text-lg">
            A simple place to report lost belongings, share found
            items, and reconnect people with what matters.
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-violet-900 transition hover:bg-violet-100"
          >
            Report an item
            <Plus size={18} />
          </button>
        </div>
      </section>

      {/* LISTINGS */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">
            Browse listings
          </h2>
          <p className="mt-2 text-slate-500">
            Search for lost and found belongings around campus.
          </p>
        </div>

        {/* SEARCH */}
        <div className="mb-7 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item name or location..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none focus:border-violet-500"
            />
          </div>
        

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700"
          >
            <Plus size={18} />
            Add listing
          </button>
        </div>

        {/* FILTERS */}
        <div className="mb-8 flex flex-wrap gap-3">
          {["All", "Lost", "Found"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300"
              }`}
            >
              {tab === "All" ? "All items" : tab}
            </button>
          ))}

          <div className="ml-auto">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All categories" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            Loading listings...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Package
              size={42}
              className="mx-auto mb-4 text-slate-300"
            />
            <h3 className="text-xl font-semibold">
              No listings found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try another search or report an item to get started.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700"
            >
              Report an item
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 to-slate-100 text-violet-500">
  {item.image_url ? (
    <img
      src={item.image_url}
      alt={item.name}
      className="h-full w-full object-cover"
    />
  ) : (
    <CategoryIcon category={item.category} />
  )}

                <span
  className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${
    item.status === "Claimed"
      ? "bg-slate-200 text-slate-700"
      : item.type === "Lost"
      ? "bg-red-100 text-red-700"
      : "bg-emerald-100 text-emerald-700"
  }`}
>
  {item.status === "Claimed" ? "Claimed" : item.type}
</span>
                </div>

                <div className="p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-600">
                    {item.category}
                  </div>

                  <h3 className="text-lg font-bold">
                    {item.name}
                  </h3>

                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin size={16} />
                    {item.location}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                    <Clock size={16} />
                    {item.date}
                  </div>
                  {item.contact_email && (
  <a
    href={`mailto:${item.contact_email}?subject=${encodeURIComponent(
      `Regarding your ${item.type.toLowerCase()} item: ${item.name}`
    )}`}
    className="mt-5 block rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
  >
    Contact Reporter
  </a>
)}
{item.status === "Active" && (
  <button
    onClick={() => handleClaim(item.id)}
    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
  >
    Mark as Claimed
  </button>
)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
          <span>
            © 2026 CampusFind. Made for campus communities.
          </span>
          <span>Lost it? Find it.</span>
        </div>
      </footer>

      {/* REPORT MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Report an item
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form
              onSubmit={handleReport}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Item name
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Blue water bottle"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <div>
  <label className="mb-2 block text-sm font-semibold">
    Contact email
  </label>
  <input
    type="email"
    name="contact_email"
    required
    placeholder="yourname@example.com"
    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
  />
</div>
              <div>
  <label className="mb-2 block text-sm font-semibold">
    Item photo
  </label>
  <input
    type="file"
    name="image"
    accept="image/*"
    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
  />
  <p className="mt-1 text-xs text-slate-500">
    Upload a photo of the lost or found item.
  </p>
</div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Location
                </label>
                <input
                  name="location"
                  required
                  placeholder="Where was it lost or found?"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Listing type
                </label>
                <select
                  name="type"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500"
                >
                  <option value="Lost">I lost this item</option>
                  <option value="Found">I found this item</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Category
                </label>
                <select
                  name="category"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500"
                >
                  {categories.slice(1).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit listing"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
