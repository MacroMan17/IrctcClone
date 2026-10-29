import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import SearchResults from './pages/SearchResults.jsx';
import TrainDetails from './pages/TrainDetails.jsx';
import Passengers from './pages/Passengers.jsx';
import Payment from './pages/Payment.jsx';
import BookingDetails from './pages/BookingDetails.jsx';
import CancelBooking from './pages/CancelBooking.jsx';
import PnrStatus from './pages/PnrStatus.jsx';
import Verify from './pages/Verify.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

const guard = (el, admin) => <ProtectedRoute admin={admin}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="trains/:id" element={<TrainDetails />} />
        <Route path="book" element={guard(<Passengers />)} />
        <Route path="pay/:id" element={guard(<Payment />)} />
        <Route path="booking/:id" element={guard(<BookingDetails />)} />
        <Route path="booking/:id/cancel" element={guard(<CancelBooking />)} />
        <Route path="pnr" element={<PnrStatus />} />
        <Route path="pnr/:pnr" element={<PnrStatus />} />
        <Route path="verify/:token" element={<Verify />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard" element={guard(<Dashboard />)} />
        <Route path="admin" element={guard(<Admin />, true)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
