import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import {
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser,
} from "@clerk/clerk-react";

// Pages
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import SimulationControl from "./pages/SimulationControl";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";

// Components
import Layout from "./components/Layout";
import ViewData from "./pages/ViewData";

function App() {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const { isLoaded, isSignedIn, user } = useUser();

  const location = useLocation();
  const [onboardingStatus, setOnboardingStatus] = useState({
    isLoading: true,
    onboardingRequired: false,
  });

  // Check onboarding status when user signs in
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isLoaded || !isSignedIn) {
        setOnboardingStatus({ isLoading: false, onboardingRequired: false });
        return;
      }

      // First check if we have a session flag indicating onboarding was just completed
      const sessionOnboardingCompleted = window.sessionStorage.getItem(
        `onboardingCompleted-${user?.primaryEmailAddress}`
      );
      if (sessionOnboardingCompleted === "true") {
        console.log(
          "Onboarding completed flag found in session, skipping API check"
        );
        setOnboardingStatus({ isLoading: false, onboardingRequired: false });
        return;
      }

      try {
        // Check user profile from your API
        const response = await fetch(
          `${API_URL}/api/users/profile/${user?.id}`
        );

        // Debug
        console.log("Profile check status:", response.status);

        if (response.status === 404) {
          // User not found, needs onboarding
          console.log("User not found, onboarding required");
          setOnboardingStatus({ isLoading: false, onboardingRequired: true });
        } else if (response.ok) {
          const data = await response.json();
          const needsOnboarding = !data.user.onboardingCompleted;
          console.log(
            "Onboarding required based on API response:",
            needsOnboarding
          );
          setOnboardingStatus({
            isLoading: false,
            onboardingRequired: needsOnboarding,
          });
        } else {
          // Error occurred, but we'll default to showing the dashboard
          console.error("Error checking onboarding status");
          setOnboardingStatus({ isLoading: false, onboardingRequired: false });
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setOnboardingStatus({ isLoading: false, onboardingRequired: false });
      }
    };

    if (isSignedIn) {
      checkOnboardingStatus();
    } else {
      setOnboardingStatus({ isLoading: false, onboardingRequired: false });
    }
  }, [isLoaded, isSignedIn]);

  // Common loading indicator
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  // Authentication guard component - ensures non-authenticated users can't access protected routes
  const AuthGuard = ({ children }) => {
    if (!isLoaded) return <LoadingSpinner />;

    if (!isSignedIn) {
      return <Navigate to="/" replace state={{ from: location }} />;
    }

    return children;
  };

  // Onboarding guard component - ensures onboarding is completed before accessing main app
  const OnboardingGuard = ({ children }) => {
    if (!isLoaded || onboardingStatus.isLoading) return <LoadingSpinner />;

    // Check session storage for recently completed onboarding
    const sessionOnboardingCompleted = window.sessionStorage.getItem(
      `onboardingCompleted-${user?.primaryEmailAddress}`
    );

    if (
      onboardingStatus.onboardingRequired &&
      sessionOnboardingCompleted !== "true"
    ) {
      return <Navigate to="/onboarding" replace />;
    }

    return children;
  };

  // Public routes guard - prevents authenticated users from accessing public routes
  const PublicRouteGuard = ({ children }) => {
    if (!isLoaded) return <LoadingSpinner />;

    if (isSignedIn) {
      // If onboarding required, go to onboarding
      if (onboardingStatus.onboardingRequired) {
        return <Navigate to="/onboarding" replace />;
      }
      // Otherwise go to dashboard
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  // Onboarding route guard - only onboarding-required users can access
  const OnboardingRouteGuard = ({ children }) => {
    if (!isLoaded || onboardingStatus.isLoading) return <LoadingSpinner />;

    if (!isSignedIn) {
      return <Navigate to="/" replace />;
    }

    // Check session storage for recently completed onboarding
    const sessionOnboardingCompleted = window.sessionStorage.getItem(
      `onboardingCompleted-${user?.primaryEmailAddress}`
    );

    if (
      !onboardingStatus.onboardingRequired ||
      sessionOnboardingCompleted === "true"
    ) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  return (
    <div className="App">
      <Routes>
        {/* Public route - Landing Page */}
        <Route
          path="/"
          element={
            <PublicRouteGuard>
              <LandingPage />
            </PublicRouteGuard>
          }
        />

        {/* Onboarding route - only for signed in users who need onboarding */}
        <Route
          path="/onboarding"
          element={
            <OnboardingRouteGuard>
              <Onboarding />
            </OnboardingRouteGuard>
          }
        />

        {/* Protected routes with full authentication & onboarding check */}
        <Route
          element={
            <AuthGuard>
              <OnboardingGuard>
                <Layout onboardingStatus={onboardingStatus} />
              </OnboardingGuard>
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/view-data/:dataType" element={<ViewData />} />
          <Route path="/simulation" element={<SimulationControl />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Redirect for unknown routes - public users to landing, authenticated to dashboard */}
        <Route
          path="*"
          element={
            isSignedIn ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </div>
  );
}

export default App;
