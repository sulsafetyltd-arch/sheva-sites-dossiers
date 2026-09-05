import { Navigate } from 'react-router-dom';

/** Login screen removed — always enter the safety app. */
export default function SafetyLogin() {
  return <Navigate to="/safety" replace />;
}
