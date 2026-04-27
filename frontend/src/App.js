import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";

/**
 * Deep-link URL structure:
 *   /                      → homepage
 *   /shop                  → homepage, scrolls to shop
 *   /shop/:catId           → homepage, opens category  e.g. /shop/crystals
 *   /product/:productId    → homepage, opens product modal  e.g. /product/crystal-amethyst
 *   /book/:serviceId       → homepage, opens booking dialog  e.g. /book/tarot-15min
 *   /payment-success       → order confirmation page
 *   /admin/login           → admin login
 *   /admin                 → admin dashboard
 */
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<HomePage scrollToShop />} />
          <Route path="/shop/:catId" element={<HomePage scrollToShop />} />
          <Route path="/product/:productId" element={<HomePage scrollToShop />} />
          <Route path="/book/:serviceId" element={<HomePage openBooking />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
