import { startServer } from "@microsoft/agents-hosting-express";
import { cfdAgent } from "./app";

startServer(cfdAgent);
