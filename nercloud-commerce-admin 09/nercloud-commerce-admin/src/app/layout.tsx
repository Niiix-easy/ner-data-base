import "./globals.css";
import Link from "next/link";

export default function Layout({children}:{children:React.ReactNode}) {
  return <div className="layout">
    <aside className="side">
      <div className="brand">NERCloud Admin</div>
      <nav className="nav">
        <Link href="/">Billing dashboard</Link>
        <Link href="/usage">Usage dashboard</Link>
        <Link href="/invoices">Invoices</Link>
        <Link href="/payments">Payments</Link>
        <Link href="/plans">Plans</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </aside>
    <main className="main">{children}</main>
  </div>
}
