import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer } from 'ws';
import * as z from 'zod';
import fs from 'fs';

// Create the server
const server = new McpServer({
    name: 'phaser-monster-tools',
    version: '1.0.0',
});

// --- WebSocket bridge to the Phaser game ---
const wss = new WebSocketServer({ port: 8081 });
let gameSocket = null;          // the currently connected game, if any
const pending = new Map();      // message id -> resolve function
let nextId = 1;
let shotCount = 0;   // screenshots taken

const NOTES_FILE = 'design_notes.json'; // MEMORY FILE


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

// --- Helper: load the notes array from disk ---
// If the file doesn't exist yet (first run), start with an empty list.
function loadNotes() {
    if (!fs.existsSync(NOTES_FILE)) {
        return [];
    }
    // readFileSync returns the raw bytes of the file; 'utf8' says
    // "interpret those bytes as text". JSON.parse turns that text
    // back into a JavaScript array.
    const text = fs.readFileSync(NOTES_FILE, 'utf8');
    return JSON.parse(text);
}


// --- Register tools

server.registerTool(
    'take_screenshot',
    {
        description: 'Capture an image of the current monster so you can see your work. Use this after building to evaluate the design.',
        inputSchema: z.object({}),
    },
    async () => {
        const reply = await sendToGame('take_screenshot');
        const b64 = reply.result;

        fs.mkdirSync('gallery', { recursive: true });
        fs.writeFileSync(`gallery/monster_${++shotCount}.png`,
            Buffer.from(b64, 'base64'));

        return {
            content: [{ type: 'image', data: b64, mimeType: 'image/png' }],
        };
    }
);

server.registerTool(
    'create_body',
    {
        description: 'Create the monster body. Must be called before adding any other parts. Replaces any existing monster.',
        inputSchema: z.object({
            color: z.enum(['blue', 'green', 'red', 'yellow', 'dark']).describe('Body color, dark=brown'),
            shape: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).describe('Body shape variant: A=square, B=round, C=oval, D=squat oval, E=long body, F=long body with hair tufts'),
 
            other: z.object({
                tint: z.string().describe('A hex color string to tint the body to. Optional.').optional(),
                scale: z.object({
                    X: z.number().describe('A decimal number to scale the body width. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                    Y: z.number().describe('A decimal number to scale the body height. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                }).optional(),
                angle: z.int().describe('A integer number to rotate the body clockwise. Optional.').optional(),
                offset: z.object({
                    X: z.int().describe('A integer to offset the body from its default X position. Increasing will move it towards the right of the screen and decreasing is left. You may use negative integers as well as positive. Optional.').optional(),
                    Y: z.int().describe('A integer to offset the body from its default Y position. Increasing will move it towards the bottom of the screen and decreasing to the top. You may use negative integers as well as positive. Optional.').optional(),
                }).optional()
            }).optional().describe('Allows the use of a number of optional arguments to further alter the monster body if needed.'),


        }),
    },
    async ({ color, shape, other }) => {
        try {
            const reply = await sendToGame('create_body', { color, shape, other });
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

            other: z.object({
                tint: z.string().describe('A hex color string to tint the arms to. Optional.').optional(),
                scale: z.object({
                    X: z.number().describe('A decimal number to scale the arms width. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                    Y: z.number().describe('A decimal number to scale the arms height. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                }).optional(),
                angle: z.int().describe('A integer number to rotate the arms clockwise. Optional.').optional(),
                offset: z.object({
                    X: z.int().describe('A integer to offset the arms from its default X position. Increasing will move it towards the right of the screen and decreasing is left. You may use negative integers as well as positive. Optional.').optional(),
                    Y: z.int().describe('A integer to offset the arms from its default Y position. Increasing will move it towards the bottom of the screen and decreasing to the top. You may use negative integers as well as positive. Optional.').optional(),
                }).optional()
            }).optional().describe('Allows the use of a number of optional arguments to further alter the monster arms if needed.'),
        }),
    },
    async ({ color, pose, other }) => {
        try {
            const reply = await sendToGame('add_arms', { color, pose, other });
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
            
            other: z.object({
                tint: z.string().describe('A hex color string to tint the legs to. Optional.').optional(),
                scale: z.object({
                    X: z.number().describe('A decimal number to scale the legs width. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                    Y: z.number().describe('A decimal number to scale the legs height. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                }).optional(),
                angle: z.int().describe('A integer number to rotate the legs clockwise. Optional.').optional(),
                offset: z.object({
                    X: z.int().describe('A integer to offset the legs from its default X position. Increasing will move it towards the right of the screen and decreasing is left. You may use negative integers as well as positive. Optional.').optional(),
                    Y: z.int().describe('A integer to offset the legs from its default Y position. Increasing will move it towards the bottom of the screen and decreasing to the top. You may use negative integers as well as positive. Optional.').optional(),
                }).optional()
            }).optional().describe('Allows the use of a number of optional arguments to further alter the monster legs if needed.'),

        }),
    },
    async ({ color, pose, other }) => {
        try {
            const reply = await sendToGame('add_legs', { color, pose, other });
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
            

            other: z.object({
                tint: z.string().describe('A hex color string to tint the eyes to. Optional.').optional(),
                scale: z.object({
                    X: z.number().describe('A decimal number to scale the eyes width. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                    Y: z.number().describe('A decimal number to scale the eyes height. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                }).optional(),
                angle: z.int().describe('A integer number to rotate the eyes clockwise. Optional.').optional(),
                offset: z.object({
                    X: z.int().describe('A integer to offset the eyes from its default X position. Increasing will move it towards the right of the screen and decreasing is left. You may use negative integers as well as positive. Optional.').optional(),
                    Y: z.int().describe('A integer to offset the eyes from its default Y position. Increasing will move it towards the bottom of the screen and decreasing to the top. You may use negative integers as well as positive. Optional.').optional(),
                }).optional()
            }).optional().describe('Allows the use of a number of optional arguments to further alter the monster eyes if needed.'),
        }),
    },
    async ({ type, count, other }) => {
        try {
            const reply = await sendToGame('add_eyes', { type, count, other });
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



            other: z.object({
                tint: z.string().describe('A hex color string to tint the mouth to. Optional.').optional(),
                scale: z.object({
                    X: z.number().describe('A decimal number to scale the mouth width. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                    Y: z.number().describe('A decimal number to scale the mouth height. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                }).optional(),
                angle: z.int().describe('A integer number to rotate the mouth clockwise. Optional.').optional(),
                offset: z.object({
                    X: z.int().describe('A integer to offset the mouth from its default X position. Increasing will move it towards the right of the screen and decreasing is left. You may use negative integers as well as positive. Optional.').optional(),
                    Y: z.int().describe('A integer to offset the mouth from its default Y position. Increasing will move it towards the bottom of the screen and decreasing to the top. You may use negative integers as well as positive. Optional.').optional(),
                }).optional()
            }).optional().describe('Allows the use of a number of optional arguments to further alter the monster mouth if needed.'),


        }),
    },
    async ({ type, other }) => {
        try {
            const reply = await sendToGame('add_mouth', { type, other });
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


            other: z.object({
                tint: z.string().describe('A hex color string to tint the mouth to. Optional.').optional(),
                scale: z.object({
                    X: z.number().describe('A decimal number to scale the mouth width. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                    Y: z.number().describe('A decimal number to scale the mouth height. Examples are .235 to shrink and 1.6. IMPORTANT: 1 is the base size. Optional.').optional(),
                }).optional(),
                angle: z.int().describe('A integer number to rotate the mouth clockwise. Optional.').optional(),
                offset: z.object({
                    X: z.int().describe('A integer to offset the mouth from its default X position. Increasing will move it towards the right of the screen and decreasing is left. You may use negative integers as well as positive. Optional.').optional(),
                    Y: z.int().describe('A integer to offset the mouth from its default Y position. Increasing will move it towards the bottom of the screen and decreasing to the top. You may use negative integers as well as positive. Optional.').optional(),
                }).optional()
            }).optional().describe('Allows the use of a number of optional arguments to further alter the monster mouth if needed.'),


        }),
    },
    async ({ color, type, count, other }) => {
        try {
            const reply = await sendToGame('add_antennas', { color, type, count, other });
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


// --- Tool: remember ---
server.registerTool(
    'remember',
    {
        description:
            'Store a design lesson you have learned, so future design sessions can benefit from it. ' +
            'Lessons should be specific and actionable, e.g. "tints below #444444 make parts hard to ' +
            'distinguish against the dark background", not vague, e.g. "use good colors".',
        inputSchema: z.object({
            lesson: z.string().describe('The design lesson to store'),
        }),
    },
    async ({ lesson }) => {
        // Read-modify-write: load what's there, add the new entry, save it all back.
        const notes = loadNotes();
        notes.push({
            timestamp: new Date().toISOString(),
            lesson: lesson,
        });
        // JSON.stringify turns the array back into text.
        // The (notes, null, 2) arguments mean "indent by 2 spaces" —
        // purely cosmetic, but it keeps the file human-readable,
        // which matters since you'll be reading it for your writeup.
        fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

        console.error(`[memory] stored lesson #${notes.length}`);
        return {
            content: [{ type: 'text', text: `Lesson stored. You now have ${notes.length} lessons.` }],
        };
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