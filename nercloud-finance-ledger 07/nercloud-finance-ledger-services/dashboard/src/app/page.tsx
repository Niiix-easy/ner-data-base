import Link from "next/link";
const x=[["Double-entry Ledger","/ledger"],["Reconciliation","/reconciliation"],["Financial Reports","/reports"],["Audit","/audit"]];
export default function Home(){return <><header className="header"><h1>NERCloud Finance</h1></header><nav className="nav">{x.map(a=><Link href={a[1]} key={a[1]}>{a[0]}</Link>)}</nav><main className="container"><h2>Finance & Accounting</h2><div className="grid">{x.map(a=><Link className="card" href={a[1]} key={a[1]}><h2>{a[0]}</h2><p>Módulo financeiro.</p></Link>)}</div></main></>}
