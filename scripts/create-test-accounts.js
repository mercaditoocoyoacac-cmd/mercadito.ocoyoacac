require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NOMBRES = [
  "Juan","Maria","Pedro","Ana","Luis","Carmen","Jose","Guadalupe","Miguel","Sofia",
  "Carlos","Rosa","Fernando","Lucia","Jorge","Elena","Ricardo","Patricia","Roberto","Teresa",
  "Alejandro","Veronica","Daniel","Monica","Francisco","Gabriela","Eduardo","Claudia","Manuel","Adriana",
  "Arturo","Silvia","Gerardo","Leticia","Raul","Marta","Sergio","Diana","Mario","Andrea",
  "Oscar","Paola","Hector","Natalia","Alfredo","Yolanda","Julio","Alicia","Victor","Pilar",
  "Enrique","Lourdes","Felipe","Esperanza","Andres","Isabel","Ramon","Angela","Antonio","Norma",
  "Diego","Cristina","Jesus","Susana","Pablo","Liliana","Javier","Valentina","Emilio","Camila",
  "Gustavo","Daniela","Agustin","Ximena","Ruben","Renata","Martin","Jimena","Tomas","Abril",
];
const APELLIDOS = [
  "Garcia","Martinez","Lopez","Rodriguez","Hernandez","Perez","Sanchez","Ramirez","Flores","Cruz",
  "Morales","Gomez","Reyes","Diaz","Torres","Gonzalez","Vazquez","Castillo","Mendoza","Ramos",
  "Ortiz","Moreno","Jimenez","Castro","Rivera","Medina","Vargas","Romero","Herrera","Aguilar",
  "Chavez","Mendoza","Salazar","Gutierrez","Ruiz","Delgado","Nunez","Campos","Miranda","Soto",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateName(role, i) {
  const nombre = pick(NOMBRES);
  const apellido = pick(APELLIDOS);
  const rolePrefix = role === "CUSTOMER" ? "cli" : role === "VENDOR" ? "ven" : "del";
  return {
    name: `${nombre} ${apellido}`,
    email: `${rolePrefix}${String(i).padStart(3, "0")}@pruebas.mercadito.mx`,
  };
}

async function main() {
  const roles = ["CUSTOMER", "VENDOR", "DELIVERY"];
  const countPerRole = 100;
  const password = "Pruebas2026!";
  const hash = await bcrypt.hash(password, 10);
  let total = 0;
  let skipped = 0;

  for (const role of roles) {
    console.log(`\nCreando ${countPerRole} cuentas ${role}...`);
    const batch = [];

    for (let i = 1; i <= countPerRole; i++) {
      const { name, email } = generateName(role, i);
      batch.push({ email, name, passwordHash: hash, role });
    }

    for (const data of batch) {
      try {
        const exists = await prisma.user.findUnique({ where: { email: data.email } });
        if (exists) {
          skipped++;
          continue;
        }
        await prisma.user.create({ data });
        total++;
      } catch (e) {
        if (e.code === "P2002") skipped++;
        else throw e;
      }
    }
    console.log(`  ${role}: ${countPerRole} procesadas`);
  }

  console.log(`\nTotal creadas: ${total}`);
  console.log(`Ya existian: ${skipped}`);
  console.log(`\nTodas las cuentas usan la contraseña: ${password}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
