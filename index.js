import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer } from 'ws';
import * as z from 'zod';

// Create the server
const server = new McpServer({
    name: 'phaser-monster-tools',
    version: '1.0.0',
});

// --- WebSocket bridge to the Phaser game ---
const wss = new WebSocketServer({ port: 5500 });
let gameSocket = null;          // the currently connected game, if any
const pending = new Map();      // message id -> resolve function
let nextId = 1;

wss.on('connection', (ws) => {
    console.error('[bridge] Phaser game connected');
    gameSocket = ws;

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        // Find the promise waiting for this reply, and resolve it
        const resolve = pending.get(msg.id);
        if (resolve) {
            resolve(msg);
            pending.delete(msg.id);
        }
    });

    ws.on('close', () => {
        console.error('[bridge] game disconnected');
        if (gameSocket === ws) gameSocket = null;
    });
});

// Send a command to the game and wait for its reply
function sendToGame(command, params = {}) {
    return new Promise((resolve, reject) => {
        if (!gameSocket) {
            reject(new Error('No game connected. Is the game page open in your browser?'));
            return;
        }
        const id = nextId++;
        pending.set(id, resolve);
        gameSocket.send(JSON.stringify({ id, command, params }));

        // Don't wait forever
        setTimeout(() => {
            if (pending.delete(id)) {
                reject(new Error('Game did not respond within 5 seconds.'));
            }
        }, 5000);
    });
}

// --- Register tools
server.registerTool(
    'create_body',
    {
        description: 'Create the monster body. Must be called before adding any other parts. Replaces any existing monster.',
        inputSchema: z.object({
            color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Body color, dark=brown'),
            shape: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).describe('Body shape variant: A=square, B=round, C=oval, D=squat oval, E=long body, F=long body with hair tufts'),
        }),
    },
    async ({ color, shape }) => {
        try {
            const reply = await sendToGame('create_body', { color, shape });
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

// --- TODO: define more tools here

server.registerTool(
    'add_arms',
    {
        description: 'Adds arms to the monster body. There must be an existing body or it will error.',
        inputSchema: z.object({
            color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Arm color, dark=brown'),
            pose: z.enum(['A', 'B', 'C', 'D', 'E']).describe('Arm type variant: A=crab claw, B=skinny, C=three prong, D=bulky, E=bear arm'),
        }),
    },
    async ({ color, pose }) => {
        try {
            const reply = await sendToGame('add_arms', { color, pose });
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

server.registerTool(
    'add_legs',
    {
        description: 'Adds legs to the monster body. There must be an existing body or it will error.',
        inputSchema: z.object({
            color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Leg color, dark=brown'),
            pose: z.enum(['A', 'B', 'C', 'D', 'E']).describe('Leg type variant: A=normal, B=skinny, C=claws, D=bulky, E=short'),
        }),
    },
    async ({ color, pose }) => {
        try {
            const reply = await sendToGame('add_legs', { color, pose });
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

server.registerTool(
    'add_eyes',
    {
        description: 'Adds eyes to the monster body. There must be an existing body or it will error.',
        inputSchema: z.object({
            type: z.enum(['angry_blue', 'angry_green', 'angry_red', 'blue', 'closed_feminine', 'closed_happy',
                'cute_dark', 'cute_light', 'dead', 'human_blue', 'human_green', 'human_red', 'human', 'psycho_dark',
                'psycho_light', 'red', 'yellow'
            ])
            .describe('Eye type variants. Names give self descriptions.'),
            count: z.enum(['1', '2', '3']).describe('The number of eyes to add to the monster.'),
        }),
    },
    async ({ type, count }) => {
        try {
            const reply = await sendToGame('add_eyes', { type, count });
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

server.registerTool(
    'add_mouth',
    {
        description: 'Adds a mouth to the monster body. There must be an existing body or it will error.',
        inputSchema: z.object({
            type: z.enum(['closed_fangs', 'closed_happy', 'closed_sad', 'closed_teeth',
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'
            ])
            .describe('Mouth type variants: A=happy open, B=happy open with fangs, C=wide open happy big teeth, D=frown open square teeth, E=smirk open happy, F=open monster mouth, G=suprised open, H=smile open tongue out, I=monster scream, J=large open mouth with fangs'),
        }),
    },
    async ({ type }) => {
        try {
            const reply = await sendToGame('add_mouth', { type });
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

server.registerTool(
    'add_antennas',
    {
        description: 'Adds antennas to the monster body. There must be an existing body or it will error.',
        inputSchema: z.object({
            color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Antenna color, dark=brown'),
            type: z.enum(['antenna_large', 'antenna_small', 'ear_round', 
                'ear', 'eye', 'horn_large', 'horn_small']).describe('The antenna type and shape.'),
            count: z.enum(['1', '2']).describe('The number of antennas to add to the monster.'),
        }),
    },
    async ({ color, type, count }) => {
        try {
            const reply = await sendToGame('add_antennas', { color, type, count });
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

server.registerTool(
    'get_monster_state',
    {
        description: 'Will retrieve a JSON description of every part currently on the monster'
    },
    async () => {
        try {
            const reply = await sendToGame('get_monster_state');
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

server.registerTool(
    'build_monster',
    {
        description: 'An all-in-one command that takes a complete monster specification and builds the whole thing at once',
        inputSchema: z.object({
            // Body
            body_color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Body color, dark=brown'),
            body_shape: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).describe('Body shape variant: A=square, B=round, C=oval, D=squat oval, E=long body, F=long body with hair tufts'),

            // Arms
            arm_color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Arm color, dark=brown'),
            arm_pose: z.enum(['A', 'B', 'C', 'D', 'E']).describe('Arm type variant: A=crab claw, B=skinny, C=three prong, D=bulky, E=bear arm'),

            // Legs
            leg_color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Leg color, dark=brown'),
            leg_pose: z.enum(['A', 'B', 'C', 'D', 'E']).describe('Leg type variant: A=normal, B=skinny, C=claws, D=bulky, E=short'),

            // Eyes
            eye_type: z.enum(['angry_blue', 'angry_green', 'angry_red', 'blue', 'closed_feminine', 'closed_happy',
                'cute_dark', 'cute_light', 'dead', 'human_blue', 'human_green', 'human_red', 'human', 'psycho_dark',
                'psycho_light', 'red', 'yellow'
            ])
            .describe('Eye type variants. Names give self descriptions.'),
            eye_count: z.enum(['1', '2', '3']).describe('The number of eyes to add to the monster.'),

            // Mouth
            mouth_type: z.enum(['closed_fangs', 'closed_happy', 'closed_sad', 'closed_teeth',
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'
                ]).describe('Mouth type variants: A=happy open, B=happy open with fangs, C=wide open happy big teeth, D=frown open square teeth, E=smirk open happy, F=open monster mouth, G=suprised open, H=smile open tongue out, I=monster scream, J=large open mouth with fangs'),

            // Antennas
            antenna_color: z.enum(['blue', 'green', 'red', 'yellow', 'dark', 'white']).describe('Antenna color, dark=brown'),
            antenna_type: z.enum(['antenna_large', 'antenna_small', 'ear_round', 
                'ear', 'eye', 'horn_large', 'horn_small']).describe('The antenna type and shape.'),
            antenna_count: z.enum(['1', '2']).describe('The number of antennas to add to the monster.'),
        }),
    },
    async ({body_color, body_shape, arm_color, arm_pose, 
        leg_color, leg_pose, eye_type, eye_count, mouth_type, 
        antenna_color, antenna_type, antenna_count}) => {
        try {
            const reply = await sendToGame('build_monster', { body_color, body_shape, arm_color, arm_pose, leg_color, leg_pose, eye_type, eye_count, mouth_type, antenna_color, antenna_type, antenna_count });
            return { content: [{ type: 'text', text: reply.result }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);



// -- Start the server on stdio
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP server running — waiting for connections.');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});