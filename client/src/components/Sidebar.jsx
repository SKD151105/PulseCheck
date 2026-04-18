import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

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

  const handleScrollToMonitors = (event) => {
    event.preventDefault();

    const section = document.getElementById("monitors");

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", "#monitors");
    }
  };

  const handleLogout = () => {
    setIsLogoutOpen(false);
    logout();
  };

  return (
    <>
      <aside className="sidebar">
        <div>
          <div className="sidebar__brand">
            <span className="sidebar__brand-dot" />
            <span>PulseCheck</span>
          </div>

          <nav className="sidebar__nav">
            <NavLink to="/" end className="sidebar__nav-link">
              Dashboard
            </NavLink>
            <a href="#monitors" className="sidebar__nav-link" onClick={handleScrollToMonitors}>
              Monitors
            </a>
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
