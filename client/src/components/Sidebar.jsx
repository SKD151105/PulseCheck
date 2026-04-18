import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const handleScrollToMonitors = (event) => {
    event.preventDefault();

    const section = document.getElementById("monitors");

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", "#monitors");
    }
  };

  return (
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
        <button className="sidebar__logout" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
