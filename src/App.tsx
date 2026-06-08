import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import DeviceList from "@/pages/DeviceList";
import DeviceForm from "@/pages/DeviceForm";
import OrderList from "@/pages/OrderList";
import OrderCreate from "@/pages/OrderCreate";
import OrderDetail from "@/pages/OrderDetail";
import ReturnProcess from "@/pages/ReturnProcess";
import CalendarView from "@/pages/CalendarView";
import CustomerList from "@/pages/CustomerList";
import CustomerDetail from "@/pages/CustomerDetail";
import { useAppStore } from "@/store/app";
import { deviceApi } from "@/api/device";

function App() {
  const { setCategories, showMessage } = useAppStore();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await deviceApi.getCategories();
      setCategories(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    }
  }

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<Dashboard />} />
          <Route path="/devices" element={<DeviceList />} />
          <Route path="/devices/new" element={<DeviceForm />} />
          <Route path="/devices/:id/edit" element={<DeviceForm />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/new" element={<OrderCreate />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders/:id/return" element={<ReturnProcess />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
