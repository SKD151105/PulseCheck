import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import "./Sidebar.css";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const lockRef = useRef({ section: null, timerId: null });

  useEffect(() => {
    if (!isLogoutOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsLogoutOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isLogoutOpen]);

  useEffect(() => {
    const syncActiveSection = () => {
      if (lockRef.current.section) {
        setActiveSection(lockRef.current.section);
        return;
      }

      const analyticsSection = document.getElementById("analytics");
      const monitorsSection = document.getElementById("monitors");
      const scrollPosition = window.scrollY + 140;

      if (monitorsSection && scrollPosition >= monitorsSection.offsetTop) {
        setActiveSection("monitors");
        return;
      }

      if (analyticsSection && scrollPosition >= analyticsSection.offsetTop) {
        setActiveSection("analytics");
        return;
      }

      setActiveSection("dashboard");
    };

    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });

    return () => window.removeEventListener("scroll", syncActiveSection);
  }, []);

  const handleScrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    window.clearTimeout(lockRef.current.timerId);
    lockRef.current.section = sectionId;
    lockRef.current.timerId = window.setTimeout(() => {
      lockRef.current.section = null;
      lockRef.current.timerId = null;
    }, 700);

    if (sectionId === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleLogout = () => {
    setIsLogoutOpen(false);
    logout();
  };

  useEffect(
    () => () => {
      window.clearTimeout(lockRef.current.timerId);
    },
    []
  );

  return (
    <>
      <aside className="sidebar">
        <div>
          <div className="sidebar__mobile-bar">
            <div className="sidebar__mobile-brand">
              <span className="sidebar__brand-dot" />
              <span>PulseCheck</span>
            </div>
            <div className="sidebar__mobile-actions">
              <ThemeToggle />
              <span className={`sidebar__plan sidebar__plan--${user?.plan?.toLowerCase()}`}>
                {user?.plan} plan
              </span>
              <button className="sidebar__logout sidebar__logout--mobile" onClick={() => setIsLogoutOpen(true)}>
                Logout
              </button>
            </div>
          </div>

          <div className="sidebar__brand">
            <span className="sidebar__brand-dot" />
            <span>PulseCheck</span>
          </div>

          <nav className="sidebar__nav">
            <button
              type="button"
              className={`sidebar__nav-link ${activeSection === "dashboard" ? "active" : ""}`}
              onClick={() => handleScrollToSection("dashboard")}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`sidebar__nav-link ${activeSection === "analytics" ? "active" : ""}`}
              onClick={() => handleScrollToSection("analytics")}
            >
              Analytics
            </button>
            <button
              type="button"
              className={`sidebar__nav-link ${activeSection === "monitors" ? "active" : ""}`}
              onClick={() => handleScrollToSection("monitors")}
            >
              Monitors
            </button>
          </nav>
        </div>

        <div className="sidebar__footer">
          <div className="sidebar__user-email">{user?.email}</div>
          <button className="sidebar__logout" onClick={() => setIsLogoutOpen(true)}>
            Logout
          </button>
        </div>
      </aside>

      {isLogoutOpen ? (
        <div className="sidebar-modal" onClick={() => setIsLogoutOpen(false)}>
          <div
            className="sidebar-modal__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="sidebar-modal__title" id="logout-title">
              Log out?
            </h2>
            <p className="sidebar-modal__text">Are you sure you want to log out of PulseCheck?</p>
            <div className="sidebar-modal__actions">
              <button className="sidebar-modal__button sidebar-modal__button--secondary" onClick={() => setIsLogoutOpen(false)}>
                Cancel
              </button>
              <button className="sidebar-modal__button sidebar-modal__button--danger" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
