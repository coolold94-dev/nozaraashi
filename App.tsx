import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import BackupPage from './pages/Backup';
import CustomersPage from './pages/Customers';
import DashboardPage from './pages/Dashboard';
import InventoryPage from './pages/Inventory';
import LoginPage from './pages/Login';
import PosPage from './pages/Pos';
import PurchasesPage from './pages/Purchases';
import ReportsPage from './pages/Reports';
import SettingsPage from './pages/Settings';
import TreasuryPage from './pages/Treasury';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="pos" element={<PosPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="treasury" element={<TreasuryPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="backup" element={<BackupPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
