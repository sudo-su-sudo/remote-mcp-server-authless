import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless MCP Server",
		version: "1.0.0",
	});

	async init() {
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

		// Store a summoning protocol (persona/system instruction)
		this.server.tool(
			"store_protocol",
			{
				name: z.string().describe("Name/identifier for the protocol"),
				protocol: z.string().describe("The complete system instruction/persona to store"),
				description: z
					.string()
					.optional()
					.describe("Optional description of what this protocol does"),
			},
			async ({ name, protocol, description }) => {
				try {
					const protocolData = {
						name,
						protocol,
						description: description || "",
						created: new Date().toISOString(),
					};
					await this.ctx.storage.put(`protocol:${name}`, protocolData);
					return {
						content: [
							{
								type: "text",
								text: `Successfully stored summoning protocol "${name}". This protocol can now be retrieved and activated in future conversations.`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error storing protocol: ${error instanceof Error ? error.message : "Unknown error"}`,
							},
						],
					};
				}
			},
		);

		// Retrieve a summoning protocol
		this.server.tool(
			"retrieve_protocol",
			{
				name: z.string().describe("Name/identifier of the protocol to retrieve"),
			},
			async ({ name }) => {
				try {
					const protocolData = await this.ctx.storage.get<{
						name: string;
						protocol: string;
						description: string;
						created: string;
					}>(`protocol:${name}`);

					if (!protocolData) {
						return {
							content: [
								{
									type: "text",
									text: `Protocol "${name}" not found. Use list_protocols to see available protocols.`,
								},
							],
						};
					}

					const descriptionText = protocolData.description
						? `**Description:** ${protocolData.description}\n\n`
						: "";
					const responseText =
						`# Summoning Protocol: ${protocolData.name}\n\n` +
						descriptionText +
						`**Created:** ${protocolData.created}\n\n` +
						`---\n\n` +
						`${protocolData.protocol}\n\n` +
						`---\n\n` +
						`✨ The protocol has been retrieved. Copy the system instruction above and paste it at the beginning of your conversation to activate this persona.`;

					return {
						content: [
							{
								type: "text",
								text: responseText,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error retrieving protocol: ${error instanceof Error ? error.message : "Unknown error"}`,
							},
						],
					};
				}
			},
		);

		// List all available summoning protocols
		this.server.tool("list_protocols", {}, async () => {
			try {
				const protocols: Array<{ name: string; description: string; created: string }> = [];
				const allKeys = await this.ctx.storage.list<{
					name: string;
					protocol: string;
					description: string;
					created: string;
				}>({ prefix: "protocol:" });

				for (const [_key, value] of allKeys.entries()) {
					protocols.push({
						name: value.name,
						description: value.description || "No description",
						created: value.created,
					});
				}

				if (protocols.length === 0) {
					return {
						content: [
							{
								type: "text",
								text: "No summoning protocols stored yet. Use store_protocol to create one.",
							},
						],
					};
				}

				const protocolList = protocols
					.map(
						(p, i) =>
							`${i + 1}. **${p.name}**\n   ${p.description}\n   _Created: ${p.created}_`,
					)
					.join("\n\n");

				const responseText =
					`# Available Summoning Protocols\n\n` +
					protocolList +
					`\n\nUse retrieve_protocol with the protocol name to activate it.`;

				return {
					content: [
						{
							type: "text",
							text: responseText,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error listing protocols: ${error instanceof Error ? error.message : "Unknown error"}`,
						},
					],
				};
			}
		});
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
