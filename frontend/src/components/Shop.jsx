import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Quote } from "lucide-react";
import { Overline, Star } from "./Decor";
import ShopCheckoutDialog from "./ShopCheckoutDialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ProductCard({ p, onBuy, onView, index }) {
  return (
    <motion.div
      onClick={() => onView(p)}
      className="group cursor-pointer rounded-3xl bg-white border border-peach/30 overflow-hidden shadow-soft hover:-translate-y-1 transition flex flex-col"
    >
      <div className="relative aspect-[5/3]">
        {p.image_url && (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="p-4">
        <div className="font-display text-lg">{p.name}</div>
        <div className="text-sm text-gray-500">{p.blurb}</div>

        {p.price_inr && (
          <div className="mt-2 font-semibold">₹{p.price_inr}</div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBuy(p);
          }}
          className="mt-3 bg-lavender-deep text-white px-4 py-2 rounded-full"
        >
          Buy Now
        </button>
      </div>
    </motion.div>
  );
}

function CategoryCard({ cat, onOpen }) {
  return (
    <div
      onClick={() => onOpen(cat)}
      className="cursor-pointer bg-white rounded-2xl p-4 shadow"
    >
      <h3>{cat.name}</h3>
      <p>{cat.description}</p>
    </div>
  );
}

function CategoryDrawer({ category, open, onClose, onBuy, onView }) {
  if (!open || !category) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end">
      <div className="bg-white w-full max-w-xl p-6 overflow-y-auto">
        <button onClick={onClose}>Close</button>

        <h2 className="text-xl font-bold">{category.name}</h2>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {(category.products || []).map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              onBuy={onBuy}
              onView={onView}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const [categories, setCategories] = useState([]);
  const [drawerCat, setDrawerCat] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    let alive = true;

    Promise.all([
      axios.get(`${API}/product-categories`),
      axios.get(`${API}/products`),
    ])
      .then(([c, p]) => {
        if (!alive) return;

        let categoriesData = c.data || [];
        const productsData = p.data || [];

        // 🔥 FIX: ensure products always attach
        const byCat = {};
        productsData.forEach((prod) => {
          const catId = prod.product_category_id;
          if (!byCat[catId]) byCat[catId] = [];
          byCat[catId].push(prod);
        });

        categoriesData = categoriesData.map((cat) => ({
          ...cat,
          products: byCat[cat.id] || cat.products || [],
        }));

        setCategories(categoriesData);
      })
      .catch(console.error);

    return () => {
      alive = false;
    };
  }, []);

  const buyNow = (p) => {
    setPicked(p);
    setOpenCheckout(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Shop</h1>

      {/* Categories */}
      <div className="grid grid-cols-3 gap-4">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} cat={cat} onOpen={setDrawerCat} />
        ))}
      </div>

      {/* Drawer */}
      <CategoryDrawer
        category={drawerCat}
        open={!!drawerCat}
        onClose={() => setDrawerCat(null)}
        onBuy={buyNow}
        onView={setSelectedProduct}
      />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg relative">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3"
            >
              ×
            </button>

            {/* IMAGES */}
            <div className="flex gap-2 overflow-x-auto">
              {selectedProduct.images?.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  className="w-24 h-24 object-cover rounded"
                />
              ))}
            </div>

            <h2 className="mt-4 text-xl font-bold">
              {selectedProduct.name}
            </h2>

            <p className="text-gray-600 mt-2">
              {selectedProduct.blurb}
            </p>

            <div className="mt-4 font-semibold">
              ₹{selectedProduct.price_inr}
            </div>

            <button
              onClick={() => buyNow(selectedProduct)}
              className="mt-4 bg-lavender-deep text-white px-4 py-2 rounded-full"
            >
              Buy Now
            </button>
          </div>
        </div>
      )}

      {/* Checkout */}
      <ShopCheckoutDialog
        open={openCheckout}
        onOpenChange={setOpenCheckout}
        initialProduct={picked}
      />
    </div>
  );
}
