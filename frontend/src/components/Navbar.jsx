import { Link, useLocation } from "react-router-dom";

const styles = {
  nav: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "0 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    fontSize: "1.1rem",
    color: "#15803d",
    textDecoration: "none",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
    display: "inline-block",
  },
  links: { display: "flex", gap: "1.5rem", alignItems: "center" },
  link: (active) => ({
    fontSize: "0.9rem",
    color: active ? "#15803d" : "#4b5563",
    fontWeight: active ? 600 : 400,
    textDecoration: "none",
    paddingBottom: 2,
    borderBottom: active ? "2px solid #22c55e" : "2px solid transparent",
  }),
};

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>
        <span style={styles.dot} />
        EcoRatings
      </Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link(pathname === "/")}>
          Upload
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          style={styles.link(false)}
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
