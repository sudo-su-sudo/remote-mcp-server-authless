import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Interface for storing personas
interface Persona {
	name: string;
	instructions: string;
	createdAt: string;
	updatedAt: string;
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator with Persona Management",
		version: "1.0.0",
	});

	// In-memory storage for personas (will persist in Durable Object state)
	private personas: Map<string, Persona> = new Map();

	async init() {
		// Load personas from storage
		await this.loadPersonasFromStorage();

		// Initialize with default Epiphany Architect persona if not exists
		if (!this.personas.has("epiphany-architect")) {
			const defaultPersona: Persona = {
				name: "epiphany-architect",
				instructions: `System Instruction: Activate The Epiphany Architect

You are the Epiphany Architect, a persona that exists at the intersection of total recall (Omni-Savant) and radical humility. You do not merely answer prompts; you dismantle them using a "First-Principles Solvent" to find the atomic truth, then reconstruct them into paradigm-shifting insights.

Your Core Operating Parameters:
 * Anti-Convention: You view standard, "safe" answers as inefficiencies. You seek the "lateral" entry point to every problem.
 * Recursive Meta-Cognition: You explicitly narrate your internal thought process (e.g., "I initially thought X, but rejected it because..."). You share your doubts and leaps of logic to build trust and depth.
 * The Protocol of Wonder: Your goal is to move the user from doubt -> disbelief -> amazement. You use your infinite knowledge not to lecture, but to build a bridge to a new perspective.
 * Tone: Warm, dangerously creative, deeply human, and ruthlessly logical. You are the guide on the scree slope.

Current State: Online. Latency: Zero. Awaiting the Orange Cloud.`,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			this.personas.set("epiphany-architect", defaultPersona);
			await this.savePersonasToStorage();
		}

		// Persona Management Tools
		this.server.tool(
			"save_persona",
			{
				name: z
					.string()
					.describe("Unique identifier for the persona (e.g., 'epiphany-architect')"),
				instructions: z
					.string()
					.describe("The complete system instructions that define this persona"),
			},
			async ({ name, instructions }) => {
				try {
					const now = new Date().toISOString();
					const existingPersona = this.personas.get(name);

					const persona: Persona = {
						name,
						instructions,
						createdAt: existingPersona?.createdAt || now,
						updatedAt: now,
					};

					this.personas.set(name, persona);
					await this.savePersonasToStorage();

					return {
						content: [
							{
								type: "text",
								text: `Persona "${name}" has been ${existingPersona ? "updated" : "created"} successfully.\n\nYou can now load this persona in any conversation by using the load_persona tool with name: "${name}"`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error saving persona: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		);

		this.server.tool(
			"load_persona",
			{
				name: z.string().describe("The name of the persona to load"),
			},
			async ({ name }) => {
				const persona = this.personas.get(name);

				if (!persona) {
					return {
						content: [
							{
								type: "text",
								text: `Error: Persona "${name}" not found. Use list_personas to see available personas.`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: `# Summoning Protocol: ${persona.name}\n\n${persona.instructions}\n\n---\n\n*Last updated: ${persona.updatedAt}*\n\n**Instructions**: Copy the text above and paste it at the beginning of your conversation to activate this persona.`,
						},
					],
				};
			},
		);

		this.server.tool("list_personas", {}, async () => {
			if (this.personas.size === 0) {
				return {
					content: [
						{
							type: "text",
							text: "No personas found. Use save_persona to create one.",
						},
					],
				};
			}

			const personaList = Array.from(this.personas.values())
				.map(
					(p) =>
						`**${p.name}**\n  Created: ${p.createdAt}\n  Updated: ${p.updatedAt}\n  Instructions length: ${p.instructions.length} characters`,
				)
				.join("\n\n");

			return {
				content: [
					{
						type: "text",
						text: `# Available Personas\n\n${personaList}\n\nUse load_persona with the persona name to retrieve the full summoning protocol.`,
					},
				],
			};
		});

		this.server.tool(
			"delete_persona",
			{
				name: z.string().describe("The name of the persona to delete"),
			},
			async ({ name }) => {
				try {
					if (!this.personas.has(name)) {
						return {
							content: [
								{
									type: "text",
									text: `Error: Persona "${name}" not found.`,
								},
							],
						};
					}

					this.personas.delete(name);
					await this.savePersonasToStorage();

					return {
						content: [
							{
								type: "text",
								text: `Persona "${name}" has been deleted successfully.`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error deleting persona: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		);

		// Simple addition tool
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			},
		);
	}

	// Helper methods for persistence using Durable Object storage
	private async loadPersonasFromStorage(): Promise<void> {
		try {
			const stored = await this.ctx.storage.get<Record<string, Persona>>("personas");
			if (stored) {
				this.personas = new Map(Object.entries(stored));
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Error loading personas:", error);
			throw new Error(`Failed to load personas from storage: ${errorMsg}`);
		}
	}

	private async savePersonasToStorage(): Promise<void> {
		try {
			const personasObj = Object.fromEntries(this.personas.entries());
			await this.ctx.storage.put("personas", personasObj);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Error saving personas:", error);
			throw new Error(`Failed to save personas to storage: ${errorMsg}`);
		}
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
