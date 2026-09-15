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
    <main className="min-h-screen bg-slate-950 text-white">
      {/* STRUCTURED DATA */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* HERO */}
      <header className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center lg:px-8 lg:py-32">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300"
            aria-label="NexaPOS smart business management platform"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            Smart Business Management
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="text-white">Nexa</span>
            <span className="text-blue-400">POS</span>
            <span className="sr-only">
              — Smart Point of Sale & Inventory Management
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-2xl font-semibold text-slate-200 sm:text-3xl">
            Smart Point of Sale & Inventory Management
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            NexaPOS helps businesses manage sales, inventory, purchases,
            customers, suppliers, billing, and daily business operations from
            one modern platform.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              aria-label="Login to NexaPOS"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
            >
              Login to NexaPOS
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section
        aria-labelledby="features-heading"
        className="border-t border-slate-800 bg-slate-900/50 py-20"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Powerful Features
            </p>

            <h2
              id="features-heading"
              className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Everything you need to manage your business
            </h2>

            <p className="mt-4 text-slate-400">
              NexaPOS brings essential point of sale, inventory, sales,
              customer, supplier, and reporting tools together in one place.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-6 transition hover:border-blue-500/50"
                >
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400"
                    aria-hidden="true"
                  >
                    <Icon size={24} />
                  </div>

                  <h3 className="text-xl font-semibold text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        aria-labelledby="cta-heading"
        className="border-t border-slate-800 py-20"
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2
            id="cta-heading"
            className="text-3xl font-bold sm:text-4xl"
          >
            Ready to manage your business smarter?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Access NexaPOS and manage your daily business operations from one
            centralized point of sale and inventory management system.
          </p>

          <Link
            to="/login"
            aria-label="Get started with NexaPOS"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
          >
            Get Started
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-500">
          <p>
            © {new Date().getFullYear()} NexaPOS. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

export default Home;
