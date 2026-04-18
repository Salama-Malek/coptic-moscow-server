import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import NewAnnouncement from './pages/NewAnnouncement';
import AnnouncementHistory from './pages/AnnouncementHistory';
import CalendarPage from './pages/Calendar';
import Templates from './pages/Templates';
import Snippets from './pages/Snippets';
import Team from './pages/Team';
import MyAccount from './pages/MyAccount';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/change-password" element={
          <ProtectedRoute><ChangePassword /></ProtectedRoute>
        } />

        {/* All protected routes use the Layout shell */}
        <Route path="/admin" element={
          <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
        } />
        <Route path="/admin/new-announcement" element={
          <ProtectedRoute><Layout><NewAnnouncement /></Layout></ProtectedRoute>
        } />
        <Route path="/admin/announcements" element={
          <ProtectedRoute><Layout><AnnouncementHistory /></Layout></ProtectedRoute>
        } />
        <Route path="/admin/calendar" element={
          <ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>
        } />
        <Route path="/admin/templates" element={
          <ProtectedRoute><Layout><Templates /></Layout></ProtectedRoute>
        } />
        <Route path="/admin/snippets" element={
          <ProtectedRoute><Layout><Snippets /></Layout></ProtectedRoute>
        } />
        <Route path="/admin/team" element={
          <ProtectedRoute><Layout><Team /></Layout></ProtectedRoute>
        } />
        <Route path="/admin/my-account" element={
          <ProtectedRoute><Layout><MyAccount /></Layout></ProtectedRoute>
        } />

        {/* Catch-all: redirect to admin dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
