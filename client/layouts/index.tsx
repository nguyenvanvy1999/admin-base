import AdminSidebar from '@client/components/AdminSidebar';
import Footer from '@client/components/Footer';
import Header from '@client/components/Header';
import { ACCESS_TOKEN_KEY } from '@client/constants';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

const ProtectedPageLayout = () => {
  const navigate = useNavigate();
  const pathname = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(200);

  useEffect(() => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      navigate('/login');
    }
  }, [pathname.pathname]);

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900 flex flex-col">
      <Header />
      <AdminSidebar onWidthChange={setSidebarWidth} />
      <div
        className="flex flex-col transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-64px)] p-4 md:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default ProtectedPageLayout;
