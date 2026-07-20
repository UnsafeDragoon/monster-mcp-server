// Attachment offsets are relative to the body center, in pixels.
// These are starting points — students are expected to tune them.
const PARTS = {
    body:   {
        colors: ['blue', 'green', 'red', 'yellow', 'dark', 'white'],
        shapes: ['A', 'B', 'C', 'D', 'E', 'F'],
        // texture key pattern: body_{color}{shape}
        offset: { x: 0,   y: 0 }
    },
    arm:     { 
        colors: ['blue', 'green', 'red', 'yellow', 'dark', 'white'],
        shapes: ['A', 'B', 'C', 'D', 'E'],
        // arm_{color}{A|B|C|D|E}
        offset: { x: 90,  y: 10  } 
    },  
    // TODO: need to add colors and shapes (or alternate) to the below 
    leg:     { 
        colors: ['blue', 'green', 'red', 'yellow', 'dark', 'white'],
        shapes: ['A', 'B', 'C', 'D', 'E'],
        offset: { x: 45,  y: 100 } 
    },
    eye:     { 
        styles: ['angry_blue', 'angry_green', 'angry_red', 'blue', 'closed_feminine', 'closed_happy', 'cute_dark', 'cute_light', 'dead', 'human', 'human_blue', 'human_green', 'human_red', 'psycho_dark', 'psycho_light', 'red', 'yellow'],
        offset: { x: 0,   y: -30 }, spacing: 40 
    },
    mouth:   { 
        types: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'closed_fangs', 'closed_happy', 'closed_sad', 'closed_teeth'],
        offset: { x: 0,   y: 30  } 
    },
    antenna: { 
        colors: ['blue', 'green', 'red', 'yellow', 'dark', 'white'],
        types: ['antenna_large', 'antenna_small', 'ear', 'ear_round', 'eye', 'horn_large', 'horn_small'],
        offset: { x: 0,   y: -95 }, spacing: 50 
    },
};
const CENTER_X = 400;
const CENTER_Y = 300;