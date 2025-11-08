import Footer from '@client/components/Footer';
import Header from '@client/components/Header';
import { ACCESS_TOKEN_KEY } from '@client/constants';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

const ProtectedPageLayout = () => {
  const navigate = useNavigate();
  const pathname = useLocation();

  useEffect(() => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      navigate('/login');
    }
  }, [pathname.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default ProtectedPageLayout;
