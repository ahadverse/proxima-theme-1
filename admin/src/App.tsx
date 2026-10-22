import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Login from '@/pages/Login';
import { lazyPage } from '@/lib/lazyPage';
import { SuperAdminRoute } from '@/routes/SuperAdminRoute';
import { usePublicSettings } from '@/api/settings';
import { applyTheme } from '@/lib/theme';

// Every page after sign-in is its own file, downloaded the first time it is opened. Before, the sign-in screen carried the
// whole admin — every page, the chart library, the rich text editor, drag and drop — as one 1.8 MB file.
const Dashboard = lazyPage(() => import('@/pages/Dashboard'));
const Categories = lazyPage(() => import('@/pages/Categories'));
const Brands = lazyPage(() => import('@/pages/Brands'));
const Attributes = lazyPage(() => import('@/pages/Attributes'));
const ProductList = lazyPage(() => import('@/pages/Products/ProductList'));
const ProductForm = lazyPage(() => import('@/pages/Products/ProductForm'));
const Inventory = lazyPage(() => import('@/pages/Inventory'));
const Orders = lazyPage(() => import('@/pages/Orders'));
const IncompleteOrders = lazyPage(() => import('@/pages/IncompleteOrders'));
const Customers = lazyPage(() => import('@/pages/Customers'));
const Reviews = lazyPage(() => import('@/pages/Reviews'));
const Coupons = lazyPage(() => import('@/pages/Coupons'));
const Settings = lazyPage(() => import('@/pages/Settings'));
const Staff = lazyPage(() => import('@/pages/Staff'));
const Banners = lazyPage(() => import('@/pages/Banners'));
const Analytics = lazyPage(() => import('@/pages/Analytics'));
const BlogList = lazyPage(() => import('@/pages/Blog/BlogList'));
const BlogForm = lazyPage(() => import('@/pages/Blog/BlogForm'));
const Faq = lazyPage(() => import('@/pages/Faq'));
const NotFound = lazyPage(() => import('@/pages/NotFound'));
const StaticPages = lazyPage(() => import('@/pages/StaticPages'));
const StaticPageForm = lazyPage(() => import('@/pages/StaticPages/StaticPageForm'));

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
