import { beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../../.env.local") });
