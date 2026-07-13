import "next-auth"; import "next-auth/jwt";
declare module "next-auth" { interface User { role:"ADMIN"|"USER"; status:"ACTIVE"|"INACTIVE"|"SUSPENDED"|"PENDING_PASSWORD_CHANGE" } interface Session { user:{id:string;role:User["role"];status:User["status"];name?:string|null;email?:string|null;image?:string|null} } }
declare module "next-auth/jwt" { interface JWT { id:string;role:"ADMIN"|"USER";status:"ACTIVE"|"INACTIVE"|"SUSPENDED"|"PENDING_PASSWORD_CHANGE" } }
