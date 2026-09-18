import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart3,
  Receipt,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Database,
  ChevronRight,
} from "lucide-react";

function Home() {
  const features = [
    {
      icon: ShoppingCart,
      title: "Point of Sale",
      description:
        "Process sales quickly with a simple and efficient POS interface for daily business transactions.",
    },
    {
      icon: Package,
      title: "Inventory Management",
      description:
        "Track products, stock levels, purchases, and inventory movement from one centralized system.",
    },
    {
      icon: Receipt,
      title: "Sales & Purchases",
      description:
        "Manage sales, purchases, returns, billing, and business transactions efficiently.",
    },
    {
      icon: Users,
      title: "Customer Management",
      description:
        "Keep customer information, transaction records, and customer activity organized.",
    },
    {
      icon: Truck,
      title: "Supplier Management",
      description:
        "Manage suppliers, supplier ledgers, purchases, and supplier information with ease.",
    },
    {
      icon: BarChart3,
      title: "Business Reports",
      description:
        "Access organized business reports to understand sales, inventory, and business performance.",
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NexaPOS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "NexaPOS is a modern point of sale and inventory management system designed to simplify sales, stock, purchases, customers, suppliers, and business operations.",
  };

  return (
    <main className="home-page">
      {/* STRUCTURED DATA */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* =========================================
          NAVBAR
      ========================================== */}
      <nav className="home-navbar">
        <div className="home-navbar-inner">
          <Link to="/" className="home-brand">
            <div className="home-logo-mark">NX</div>

            <div>
              <div className="home-brand-name">NEXA</div>
              <div className="home-brand-label">POS SYSTEM</div>
            </div>
          </Link>

          <Link
            to="/login"
            className="home-nav-login"
            aria-label="Login to NexaPOS"
          >
            Login
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* =========================================
          HERO
      ========================================== */}
      <header className="home-hero">
        <div className="home-hero-grid"></div>

        <div className="home-hero-glow home-hero-glow-one"></div>
        <div className="home-hero-glow home-hero-glow-two"></div>

        <div className="home-hero-content">
          <div
            className="home-hero-badge"
            aria-label="NexaPOS smart business management platform"
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            Smart Business Management
          </div>

          <div className="home-hero-label">
            <span></span>
            MODERN POS & BUSINESS PLATFORM
          </div>

          <h1>
            <span>Nexa</span>
            <strong>POS</strong>
          </h1>

          <h2>
            Smart Point of Sale
            <br />
            <span>& Inventory Management</span>
          </h2>

          <p>
            NexaPOS helps businesses manage sales, inventory,
            purchases, customers, suppliers, billing, and daily
            operations from one modern platform.
          </p>

          <div className="home-hero-actions">
            <Link
              to="/login"
              aria-label="Login to NexaPOS"
              className="home-primary-btn"
            >
              Login to NexaPOS
              <ArrowRight size={18} />
            </Link>

            <a
              href="#features"
              className="home-secondary-btn"
            >
              Explore Features
              <ChevronRight size={17} />
            </a>
          </div>

          <div className="home-trust-row">
            <div>
              <ShieldCheck size={15} />
              <span>Secure Access</span>
            </div>

            <div>
              <Zap size={15} />
              <span>Fast Workflow</span>
            </div>

            <div>
              <Database size={15} />
              <span>Centralized Data</span>
            </div>
          </div>
        </div>

        {/* DASHBOARD PREVIEW */}
        <div className="home-dashboard-preview">
          <div className="home-preview-window">
            <div className="home-preview-topbar">
              <div className="home-preview-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="home-preview-title">
                NEXA POS
              </div>

              <div className="home-preview-status">
                <span></span>
                System Online
              </div>
            </div>

            <div className="home-preview-body">
              <div className="home-preview-sidebar">
                <div className="home-preview-sidebar-logo">
                  NX
                </div>

                <span className="active"></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="home-preview-main">
                <div className="home-preview-heading">
                  <div>
                    <small>OVERVIEW</small>
                    <strong>Business Dashboard</strong>
                  </div>

                  <div className="home-preview-date">
                    Today
                  </div>
                </div>

                <div className="home-preview-cards">
                  <div>
                    <small>Today Sales</small>
                    <strong>₨ 128,450</strong>
                    <span>+12.4%</span>
                  </div>

                  <div>
                    <small>Total Products</small>
                    <strong>1,248</strong>
                    <span>Active</span>
                  </div>

                  <div>
                    <small>Invoices</small>
                    <strong>186</strong>
                    <span>Today</span>
                  </div>
                </div>

                <div className="home-preview-chart">
                  <div className="home-preview-chart-head">
                    <span>Sales Analytics</span>
                    <small>Last 7 days</small>
                  </div>

                  <div className="home-preview-bars">
                    <i style={{ height: "38%" }}></i>
                    <i style={{ height: "52%" }}></i>
                    <i style={{ height: "43%" }}></i>
                    <i style={{ height: "68%" }}></i>
                    <i style={{ height: "58%" }}></i>
                    <i style={{ height: "82%" }}></i>
                    <i style={{ height: "92%" }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================
          FEATURES
      ========================================== */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="home-features-section"
      >
        <div className="home-section-container">
          <div className="home-section-header">
            <div className="home-section-eyebrow">
              <span></span>
              POWERFUL FEATURES
              <span></span>
            </div>

            <h2 id="features-heading">
              Everything you need to
              <span> manage your business.</span>
            </h2>

            <p>
              NexaPOS brings essential point of sale,
              inventory, sales, customer, supplier, and
              reporting tools together in one place.
            </p>
          </div>

          <div className="home-feature-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="home-feature-card"
                >
                  <div className="home-feature-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div
                    className="home-feature-icon"
                    aria-hidden="true"
                  >
                    <Icon size={22} />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.description}</p>

                  <div className="home-feature-line"></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================
          CTA
      ========================================== */}
      <section
        aria-labelledby="cta-heading"
        className="home-cta-section"
      >
        <div className="home-cta-grid"></div>

        <div className="home-cta-content">
          <div className="home-cta-icon">
            <Zap size={21} />
          </div>

          <div className="home-section-eyebrow">
            READY TO GET STARTED?
          </div>

          <h2 id="cta-heading">
            Manage your business
            <span> smarter.</span>
          </h2>

          <p>
            Access NexaPOS and manage your daily business
            operations from one centralized platform.
          </p>

          <Link
            to="/login"
            aria-label="Get started with NexaPOS"
            className="home-primary-btn"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================== */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <Link to="/" className="home-footer-brand">
            <div className="home-logo-mark small">NX</div>

            <div>
              <div className="home-brand-name">NEXA</div>
              <div className="home-brand-label">
                POS SYSTEM
              </div>
            </div>
          </Link>

          <p>
            © {new Date().getFullYear()} NexaPOS. All rights
            reserved.
          </p>

          <Link
            to="/login"
            className="home-footer-login"
          >
            Login
            <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </main>
  );
}

export default Home;