import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Categories from '@/pages/Categories';
import Brands from '@/pages/Brands';
import Attributes from '@/pages/Attributes';
import ProductList from '@/pages/Products/ProductList';
import ProductForm from '@/pages/Products/ProductForm';
import Inventory from '@/pages/Inventory';
import Orders from '@/pages/Orders';
import IncompleteOrders from '@/pages/IncompleteOrders';
import Customers from '@/pages/Customers';
import Reviews from '@/pages/Reviews';
import Coupons from '@/pages/Coupons';
import Settings from '@/pages/Settings';
import Staff from '@/pages/Staff';
import Banners from '@/pages/Banners';
import Analytics from '@/pages/Analytics';
import BlogList from '@/pages/Blog/BlogList';
import BlogForm from '@/pages/Blog/BlogForm';
import Faq from '@/pages/Faq';
import NotFound from '@/pages/NotFound';
import StaticPages from '@/pages/StaticPages';
import StaticPageForm from '@/pages/StaticPages/StaticPageForm';
import { SuperAdminRoute } from '@/routes/SuperAdminRoute';
import { usePublicSettings } from '@/api/settings';
import { applyTheme } from '@/lib/theme';

export default function App() {
  // The admin follows the store's colour theme: whenever Settings.theme changes (first load,
  // refresh button, tab refocus, or a save from the Settings page) re-apply it. If the settings
  // API isn't reachable, the defaults in index.css just stay in effect.
  const { data: settings } = usePublicSettings();
  const theme = settings?.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/attributes" element={<Attributes />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/incomplete-orders" element={<IncompleteOrders />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/banners" element={<Banners />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/new" element={<BlogForm />} />
          <Route path="/blog/:id/edit" element={<BlogForm />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/pages" element={<StaticPages />} />
          <Route path="/pages/new" element={<StaticPageForm />} />
          <Route path="/pages/:id/edit" element={<StaticPageForm />} />
          <Route element={<SuperAdminRoute />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/staff" element={<Staff />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
