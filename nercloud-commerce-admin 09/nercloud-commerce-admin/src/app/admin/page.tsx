import { db } from "@/lib/db";
export default async function Admin() {
 const [users,audit]=await Promise.all([
   db.adminUser.findMany({select:{id:true,name:true,email:true,role:true,active:true,createdAt:true},orderBy:{createdAt:"desc"}}),
   db.adminAuditLog.findMany({include:{actor:true},orderBy:{createdAt:"desc"},take:50})
 ]);
 return <><h1>Admin</h1><h2>Usuários</h2><table className="table"><thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Ativo</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.active?"Sim":"Não"}</td></tr>)}</tbody></table><h2 style={{marginTop:30}}>Auditoria</h2><table className="table"><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th><th>Ator</th></tr></thead><tbody>{audit.map(a=><tr key={a.id}><td>{a.createdAt.toLocaleString("pt-BR")}</td><td>{a.action}</td><td>{a.entity} {a.entityId??""}</td><td>{a.actor?.email??"system"}</td></tr>)}</tbody></table></>
}
