import { useState, useEffect, useCallback, useRef } from "react";
import { useClerk } from "@clerk/clerk-react";
import {
  FaHeartbeat,
  FaBell,
  FaCalendarCheck,
  FaChartLine,
  FaBars,
  FaTimes,
} from "react-icons/fa";

// Animation keyframes definition
const animationStyles = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
}

.animate-slide-in {
  animation: slideIn 0.5s ease forwards;
}

/* Clerk signin animation - subtle fade effect for background */
body.clerk-animation::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(30, 58, 138, 0.1);
  z-index: 100;
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Mobile menu animation */
@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.mobile-menu-enter {
  animation: slideInFromRight 0.3s ease forwards;
}
`;

const LandingPage = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [animatedElements, setAnimatedElements] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const elementsRef = useRef({});
  const { openSignIn } = useClerk();

  // Add global styles to the document
  useEffect(() => {
    // Create style element
    const styleEl = document.createElement("style");
    styleEl.innerHTML = animationStyles;
    document.head.appendChild(styleEl);

    // Clean up function
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Handle scroll events for sticky header, back-to-top button, and animations
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.pageYOffset > 300);

      // Check which elements are in viewport for animation
      Object.entries(elementsRef.current).forEach(([id, el]) => {
        if (el && isElementInViewport(el) && !animatedElements.includes(id)) {
          setAnimatedElements((prev) => [...prev, id]);
        }
      });
    };

    // Helper function to check if element is in viewport
    const isElementInViewport = (el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.top <=
          (window.innerHeight || document.documentElement.clientHeight) *
            0.85 && rect.bottom >= 0
      );
    };

    window.addEventListener("scroll", handleScroll);
    // Initial check for elements in viewport
    setTimeout(handleScroll, 100);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [animatedElements]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuOpen &&
        !event.target.closest(".mobile-menu") &&
        !event.target.closest(".mobile-menu-button")
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Smooth scroll to section
  const scrollToSection = useCallback((elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    setMobileMenuOpen(false); // Close mobile menu after navigation
  }, []);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }, []);

  // Handle Clerk sign-in with animation
  const handleClerkSignIn = useCallback(() => {
    // Apply a simple fade effect to the background before opening Clerk
    document.body.classList.add("clerk-animation");
    setMobileMenuOpen(false); // Close mobile menu

    // Short timeout to allow for CSS transition
    setTimeout(() => {
      openSignIn();
      // Remove the animation class after clerk opens
      setTimeout(() => {
        document.body.classList.remove("clerk-animation");
      }, 300);
    }, 150);
  }, [openSignIn]);

  // Handle form submission with nodemailer
  const handleSubmit = useCallback(async () => {
    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // In a production environment, you would make an API call to your backend
      // where nodemailer would be configured

      // Example of how the backend would be set up with nodemailer:
      /*
        // Server-side code (not included in frontend)
        const nodemailer = require('nodemailer');
        
        // Create transporter
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: 'your-email@gmail.com',
            pass: 'your-app-password'
          }
        });
        
        // Email options
        const mailOptions = {
          from: formData.email,
          to: 'aisensa@gmail.com',
          subject: `Contact form submission from ${formData.name}`,
          text: formData.message,
          html: `
            <h3>New contact form submission</h3>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Message:</strong></p>
            <p>${formData.message}</p>
          `
        };
        
        // Send email
        await transporter.sendMail(mailOptions);
        */

      // For this demo, we'll simulate sending the email
      console.log("Sending email to aisensa@gmail.com");
      console.log(formData);

      // Show success message
      setFormSubmitted(true);
      setTimeout(() => {
        setFormSubmitted(false);
        setFormData({ name: "", email: "", message: "" });
      }, 3000);
    } catch (error) {
      console.error("Error sending email:", error);
      alert("There was a problem sending your message. Please try again.");
    }
  }, [formData]);

  // Animation helper class
  const getAnimationClass = (id) => {
    return animatedElements.includes(id)
      ? "animate-fade-in-up opacity-100"
      : "opacity-0 translate-y-10";
  };

  // Ref setting helper
  const setRef = (id) => (el) => {
    elementsRef.current[id] = el;
  };

  return (
    <div className="font-sans text-gray-800">
      {/* Sticky Header */}
      <header className="bg-blue-950 px-4 sm:px-6 lg:px-10 py-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50 shadow-md">
        <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center">
          <FaHeartbeat className="mr-2" />
          <span className="text-2xl sm:text-3xl">AI-SENSA</span>
        </h1>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center">
          <button
            onClick={() => scrollToSection("hero")}
            className="text-white mx-3 lg:mx-5 cursor-pointer hover:text-yellow-400 transition-colors duration-300"
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection("features")}
            className="text-white mx-3 lg:mx-5 cursor-pointer hover:text-yellow-400 transition-colors duration-300"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection("contact")}
            className="text-white mx-3 lg:mx-5 cursor-pointer hover:text-yellow-400 transition-colors duration-300"
          >
            Contact
          </button>
          <button
            onClick={handleClerkSignIn}
            className="text-white mx-3 lg:mx-5 cursor-pointer hover:text-yellow-400 transition-colors duration-300"
          >
            Login
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white text-2xl mobile-menu-button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden">
          <div className="mobile-menu fixed right-0 top-0 h-full w-64 bg-blue-950 shadow-lg mobile-menu-enter">
            <div className="pt-20 px-6">
              <button
                onClick={() => scrollToSection("hero")}
                className="block w-full text-left text-white py-3 border-b border-blue-800 hover:text-yellow-400 transition-colors duration-300"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full text-left text-white py-3 border-b border-blue-800 hover:text-yellow-400 transition-colors duration-300"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="block w-full text-left text-white py-3 border-b border-blue-800 hover:text-yellow-400 transition-colors duration-300"
              >
                Contact
              </button>
              <button
                onClick={handleClerkSignIn}
                className="block w-full text-left text-white py-3 hover:text-yellow-400 transition-colors duration-300"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        id="hero"
        className="bg-gradient-to-r from-blue-950 to-blue-600 text-white text-center py-20 sm:py-32 lg:py-40 px-4 sm:px-5 mt-16"
      >
        <div
          ref={setRef("hero-content")}
          className={`max-w-4xl mx-auto transition-all duration-1000 ${getAnimationClass(
            "hero-content"
          )}`}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-gray-800">
            Empowering Eldercare with AI
          </h2>
          <p className="text-lg sm:text-xl mb-8 sm:mb-12 px-4">
            Smart assistance for safety, comfort, and care—right when it's
            needed.
          </p>
          <button
            onClick={handleClerkSignIn}
            className="inline-block bg-yellow-400 text-blue-900 hover:text-blue-950 font-bold py-3 px-6 sm:px-10 rounded-full cursor-pointer hover:bg-yellow-500 transition-colors duration-300 text-base sm:text-lg"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-5 text-center bg-gray-50"
      >
        <h2
          ref={setRef("features-title")}
          className={`text-3xl sm:text-4xl font-bold mb-12 sm:mb-16 text-gray-800 transition-all duration-1000 ${getAnimationClass(
            "features-title"
          )}`}
        >
          Key Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {/* Feature Cards */}
          {featureData.map((feature, index) => (
            <div
              key={index}
              ref={setRef(`feature-${index}`)}
              className={`transition-all duration-1000 delay-${
                index * 100
              } ${getAnimationClass(`feature-${index}`)}`}
            >
              <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-3 h-auto sm:h-64 flex flex-col items-center">
                <div className="flex justify-center mb-4">
                  <div className="text-blue-500">{feature.icon}</div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-blue-500">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Us Section */}
      <section
        id="contact"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-5 bg-white text-center"
      >
        <h2
          ref={setRef("contact-title")}
          className={`text-3xl sm:text-4xl font-bold mb-8 sm:mb-10 text-gray-800 transition-all duration-1000 ${getAnimationClass(
            "contact-title"
          )}`}
        >
          Contact Us
        </h2>
        <div
          ref={setRef("contact-form")}
          className={`max-w-lg mx-auto flex flex-col gap-4 transition-all duration-1000 delay-200 ${getAnimationClass(
            "contact-form"
          )}`}
        >
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
          <textarea
            name="message"
            rows="5"
            placeholder="Your Message"
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
            value={formData.message}
            onChange={handleInputChange}
            required
          ></textarea>
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-950 text-white py-3 sm:py-4 rounded-lg cursor-pointer hover:bg-blue-900 transition-colors duration-300 text-base sm:text-lg font-semibold"
          >
            Send Message
          </button>

          {formSubmitted && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative animate-slide-in text-sm sm:text-base">
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline">
                {" "}
                Your message has been sent to aisensa@gmail.com via Nodemailer
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 cursor-pointer bg-blue-950 text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition-colors duration-300 z-30"
          aria-label="Back to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 sm:h-6 sm:w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      )}

      {/* Footer */}
      <footer className="bg-blue-950 text-white text-center py-4 px-4 text-xs sm:text-sm">
        <p className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>© 2025 AI-SENSA. All rights reserved.</span>
          <span className="hidden sm:inline">|</span>
          <button
            onClick={() => alert("Privacy Policy")}
            className="text-yellow-400 hover:underline"
          >
            Privacy Policy
          </button>
          <span className="hidden sm:inline">|</span>
          <button
            onClick={() => alert("Terms of Use")}
            className="text-yellow-400 hover:underline"
          >
            Terms of Use
          </button>
        </p>
      </footer>
    </div>
  );
};

// Feature data array with React Icons to match the screenshot
const featureData = [
  {
    icon: <FaHeartbeat size={48} />,
    title: "Real-Time Monitoring",
    description:
      "Track vital signs like heart rate and blood pressure in real-time.",
  },
  {
    icon: <FaBell size={48} />,
    title: "Emergency Alerts",
    description:
      "Immediate alerts sent to caregivers and family during emergencies.",
  },
  {
    icon: <FaCalendarCheck size={48} />,
    title: "Reminders & Scheduling",
    description:
      "Stay on top of meds, doctor visits, and daily routines with smart reminders.",
  },
  {
    icon: <FaChartLine size={48} />,
    title: "Caregiver Dashboard",
    description: "Centralized view of health trends and activity reports.",
  },
];

export default LandingPage;
