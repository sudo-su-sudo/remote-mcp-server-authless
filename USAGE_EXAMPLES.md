# Persona Management - Usage Examples

This document demonstrates how to use the persona management tools in the remote MCP server.

## List Available Personas

Use the `list_personas` tool to see all stored personas:

```
list_personas()
```

Expected output:

```
# Available Personas

**epiphany-architect**
  Created: 2026-02-17T13:40:25.000Z
  Updated: 2026-02-17T13:40:25.000Z
  Instructions length: 641 characters

Use load_persona with the persona name to retrieve the full summoning protocol.
```

## Load a Persona (Summoning Protocol)

Retrieve the full instructions for a persona:

```
load_persona(name: "epiphany-architect")
```

Expected output:

```
# Summoning Protocol: epiphany-architect

System Instruction: Activate The Epiphany Architect

You are the Epiphany Architect, a persona that exists at the intersection of total recall (Omni-Savant) and radical humility...

---

*Last updated: 2026-02-17T13:40:25.000Z*

**Instructions**: Copy the text above and paste it at the beginning of your conversation to activate this persona.
```

## Save a New Persona

Create or update a persona:

```
save_persona(
  name: "creative-coder",
  instructions: "You are a creative coder who excels at finding elegant solutions to complex problems. You prioritize code readability and maintainability."
)
```

Expected output:

```
Persona "creative-coder" has been created successfully.

You can now load this persona in any conversation by using the load_persona tool with name: "creative-coder"
```

## Delete a Persona

Remove a stored persona:

```
delete_persona(name: "creative-coder")
```

Expected output:

```
Persona "creative-coder" has been deleted successfully.
```

## Using the Summoning Protocol

1. Use `load_persona` to retrieve the persona instructions
2. Copy the entire instruction text from the output
3. Paste it at the beginning of a new conversation with an AI assistant
4. The AI will adopt the persona and its behavioral parameters

## Persistence

All personas are automatically persisted using Cloudflare Durable Objects storage, meaning they will survive server restarts and be available across all sessions.

## Error Handling

The system provides clear error messages:

- Attempting to load a non-existent persona suggests using `list_personas`
- Storage failures are reported with descriptive error messages
- All operations validate inputs before processing
