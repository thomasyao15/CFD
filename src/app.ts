import { createM365Agent } from "./integrations/m365";

console.log("LANGCHAIN_TRACING_V2:", process.env.LANGCHAIN_TRACING_V2);
console.log("LANGCHAIN_API_KEY:", process.env.LANGCHAIN_API_KEY ? "SET" : "NOT SET");
console.log("LANGCHAIN_PROJECT:", process.env.LANGCHAIN_PROJECT);

export const cfdAgent = createM365Agent();
