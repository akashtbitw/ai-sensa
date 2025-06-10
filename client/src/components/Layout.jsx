import React, { useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { FaHeartbeat } from "react-icons/fa";

function Layout({ onboardingStatus }) {
  const { user, isSignedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced protection against manual URL changes
  useEffect(() => {
    // If not signed in, redirect to landing page
    if (!isSignedIn) {
      navigate("/", { replace: true });
      return;
    }

    // If needs onboarding and not already on onboarding page, redirect to onboarding
    if (
      onboardingStatus.onboardingRequired &&
      location.pathname !== "/onboarding"
    ) {
      navigate("/onboarding", { replace: true });
      return;
    }
  }, [
    isSignedIn,
    onboardingStatus.onboardingRequired,
    location.pathname,
    navigate,
  ]);

  // If checks didn't pass, don't render the layout at all
  if (!isSignedIn) {
    return null; // Will redirect via the useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation header */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">
                  <div className="flex items-center content-center">
                    <FaHeartbeat className="mr-2" />
                    <span className="text-3xl">AI-SENSA</span>
                  </div>
                </h1>
              </div>
              <div className="ml-6 flex space-x-8">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    isActive
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/monitoring"
                  className={({ isActive }) =>
                    isActive
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Monitoring
                </NavLink>

                <NavLink
                  to="/simulation"
                  className={({ isActive }) =>
                    isActive
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Simulation
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    isActive
                      ? "border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  }
                >
                  Settings
                </NavLink>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex items-center gap-4">
                {user && (
                  <span className="text-sm text-gray-700">
                    {user.firstName || user.username}
                  </span>
                )}
                <UserButton />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
