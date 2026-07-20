class MonsterScene extends Phaser.Scene {
    constructor() {
        super('MonsterScene');
        this.commandQueue = [];
        this.monster = {};       // holds references to current parts
        this.ws = null;
        this.connected = false;
    }

    preload() {
        // Load every body variant
        for (const color of PARTS.body.colors) {
            for (const shape of PARTS.body.shapes) {
                const key = `body_${color}${shape}`;
                this.load.image(key, `assets/${key}.png`);
            }
        }
        // TODO(instructor): extend preload for arms, legs, eyes,
        // mouths, antennas following the same pattern, matching
        // the filenames in the Kenney pack.
    }

    create() {
        this.statusText = this.add.text(10, 10, 'waiting for bridge connection...',
            { color: '#888', fontSize: '14px' });
        this.connectToBridge();
    }

    connectToBridge() {
        this.ws = new WebSocket('ws://localhost:8081');

        this.ws.onopen = () => {
            this.connected = true;
            this.statusText.setText('bridge connected');
            this.statusText.setColor('#6f6');
        };

        // IMPORTANT: this handler never touches game objects.
        // It only enqueues. update() applies changes on Phaser's schedule.
        this.ws.onmessage = (event) => {
            this.commandQueue.push(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
            this.connected = false;
            this.statusText.setText('bridge disconnected — retrying...');
            this.statusText.setColor('#f66');
            setTimeout(() => this.connectToBridge(), 1000);
        };
        this.ws.onerror = () => { /* onclose fires next; retry happens there */ };
    }

    update() {
        // Handle tool requests coming from the MCP server
        while (this.commandQueue.length > 0) {
    const msg = this.commandQueue.shift();

    try {
        const result = this.executeCommand(msg.command, msg.params);

        if (result instanceof Promise) {
            result.then((res) => {
                this.ws.send(JSON.stringify({
                    id: msg.id,
                    result: res
                }));
            });
        } else {
            this.ws.send(JSON.stringify({
                id: msg.id,
                result
            }));
        }

    } catch (err) {
        console.error(err);

        this.ws.send(JSON.stringify({
            id: msg.id,
            result: `Error: ${err.message}`
        }));
    }
}
    }

    clearMonster() {
        for (const part of Object.values(this.monster).flat()) {
            if (part && part.destroy) part.destroy();
        }
        this.monster = {};
    }

    removePart(part) {
        if(Array.isArray(part)){
            for(let x of part){
                x.destroy();
            }
        } else{
            part.destroy();
        }
    }

    executeOptional(part, other) {
        if(Array.isArray(part)){
            for(let x of part){

                if(Object.hasOwn(other, "tint")) x.setTint(parseInt(other.tint.slice(1), 16));

                if(Object.hasOwn(other, "angle")) x.angle += other.angle;


                if(Object.hasOwn(other, "scale")){
                    if(Object.hasOwn(other.scale, "X")) x.scaleX = other.scale.X;
                    if(Object.hasOwn(other.scale, "Y")) x.scaleY = other.scale.Y;
                }

                if(Object.hasOwn(other, "offset")){
                    if(Object.hasOwn(other.offset, "X")) x.x += other.offset.X;
                    if(Object.hasOwn(other.offset, "Y")) x.y += other.offset.Y;
                }
            }
        } else{
            if(Object.hasOwn(other, "tint")) part.setTint(parseInt(other.tint.slice(1), 16));

            if(Object.hasOwn(other, "angle")) part.angle += other.angle;


            if(Object.hasOwn(other, "scale")){
                if(Object.hasOwn(other.scale, "X")) part.scaleX = other.scale.X;
                if(Object.hasOwn(other.scale, "Y")) part.scaleY = other.scale.Y;
            }

            if(Object.hasOwn(other, "offset")){                
                if(Object.hasOwn(other.offset, "X")) part.x += other.offset.X;
                if(Object.hasOwn(other.offset, "Y")) part.y += other.offset.Y;
            }
        }
    }

    // {
    //     "tint": "#ae1cff",
    //     "scale": {
    //         "X": 2,
    //         "Y": 2
    //     },
    //     "angle": 90,
    //     "offset": {
    //         "X": 10,
    //         "Y": -10
    //     }
    // }

    // ============================================================
    // TODO: implement this. Each case applies one command and
    // returns a string describing what happened (or an error).
    // ============================================================
    executeCommand(command, params) {
        switch (command) {
            case 'take_screenshot': {
                return new Promise((resolve) => {
                    this.game.renderer.snapshot((image) => {
                        // image.src is "data:image/png;base64,AAAA..."
                        resolve(image.src.split(',')[1]);   // just the base64 part
                    });
                });
            }
            case 'clear_monster':
                this.clearMonster();
                return 'Monster cleared.';

            case 'create_body': {
                this.clearMonster();  // provided in starter code
                const key = `body_${params.color}${params.shape}`;
                this.monster.body = this.add.image(CENTER_X, CENTER_Y, key);

                if(Object.hasOwn(params, "other")) this.executeOptional(this.monster.body, params.other);
                
                return `Created a ${params.color} type-${params.shape} body.`;
            }
            // case 'add_arms':    ...
            case 'add_arms': {
                if (!this.monster.body) return 'Error: no body exists yet. Call create_body first.';

                if(Object.hasOwn(this.monster, "arms")){
                    this.removePart(this.monster.arms);
                }

                const key = `arm_${params.color}${params.pose}`;
                const off = PARTS.arm.offset;  // from the manifest

                const rightArm = this.add.image(CENTER_X + off.x, CENTER_Y + off.y, key);
                const leftArm  = this.add.image(CENTER_X - off.x, CENTER_Y + off.y, key).setFlipX(true);

                this.monster.arms = [leftArm, rightArm];

                if(Object.hasOwn(params, "other")) this.executeOptional(this.monster.arms, params.other);

                return `Added a mirrored pair of ${params.color} arms.`;
            }
            // case 'add_legs':    ...
            case 'add_legs': {
                if (!this.monster.body) return 'Error: no body exists yet. Call create_body first.';

                if(Object.hasOwn(this.monster, "legs")){
                    this.removePart(this.monster.legs);
                }

                const key = `leg_${params.color}${params.pose}`;
                const off = PARTS.leg.offset;  // from the manifest

                const rightLeg = this.add.image(CENTER_X + off.x, CENTER_Y + off.y, key);
                const leftLeg  = this.add.image(CENTER_X - off.x, CENTER_Y + off.y, key)
                    .setFlipX(true);

                this.monster.legs = [leftLeg, rightLeg];

                if(Object.hasOwn(params, "other")) this.executeOptional(this.monster.legs, params.other);

                return `Added a mirrored pair of ${params.color} legs.`;
            }

            // case 'add_eyes':    ...
            case 'add_eyes': {
                if (!this.monster.body) return 'Error: no body exists yet. Call create_body first.';
                
                if(Object.hasOwn(this.monster, "eyes")){
                    this.removePart(this.monster.eyes);
                }

                const key = `eye_${params.type}`;
                const off = PARTS.eye.offset;
                const spacing = PARTS.eye.spacing;

                const count = Number(params.count);
                this.monster.eyes = [];
                
                if(count === 1){
                    const eyeOne = this.add.image(CENTER_X + off.x, CENTER_Y + off.y, key);
                    this.monster.eyes.push(eyeOne);
                } else{
                    const eyeOne = this.add.image(CENTER_X + off.x - spacing, CENTER_Y + off.y, key).setFlipX(true);
                    const eyeTwo = this.add.image(CENTER_X + off.x + spacing, CENTER_Y + off.y, key);
                    this.monster.eyes.push(eyeOne);
                    this.monster.eyes.push(eyeTwo);
                }

                if(count === 3){
                    const eyeThree = this.add.image(CENTER_X + off.x, CENTER_Y + off.y, key);
                    this.monster.eyes.push(eyeThree);
                }
                
                if(Object.hasOwn(params, "other")) this.executeOptional(this.monster.eyes, params.other);

                return `Added ${count} eyes of type ${params.type} to the body.`;
            }
            
            // case 'add_mouth':   ...
            case 'add_mouth': {
                if (!this.monster.body) return 'Error: no body exists yet. Call create_body first.';
                if (!params || !params.type) return 'Error: mouth type is missing.';

                if(Object.hasOwn(this.monster, "mouth")){                    
                    this.removePart(this.monster.mouth);
                }


                const key = params.type.length === 1 ? `mouth${params.type}` : `mouth_${params.type}`;
                const off = PARTS.mouth.offset;  // from the manifest

                const mouth = this.add.image(CENTER_X + off.x, CENTER_Y + off.y, key);
                this.monster.mouth = mouth;

                if(Object.hasOwn(params, "other")) this.executeOptional(this.monster.mouth, params.other);

                return `Added a mouth of type ${params.type}.`;
            }
            // case 'add_antennas': ...
            case 'add_antennas': {
                if (!this.monster.body) return 'Error: no body exists yet. Call create_body first.';

                if(Object.hasOwn(this.monster, "antennas")){
                    this.removePart(this.monster.antennas);
                }

                const key = `detail_${params.color}_${params.type}`;
                const off = PARTS.antenna.offset;
                const spacing = PARTS.antenna.spacing;

                const count = Number(params.count);
                this.monster.antennas = [];
                
                if(count === 1){
                    const antennaOne = this.add.image(CENTER_X + off.x, CENTER_Y + off.y, key);
                    this.monster.antennas.push(antennaOne);
                } else{
                    const antennaOne = this.add.image(CENTER_X + off.x - spacing, CENTER_Y + off.y, key).setFlipX(true);
                    const antennaTwo = this.add.image(CENTER_X + off.x + spacing, CENTER_Y + off.y, key);
                    this.monster.antennas.push(antennaOne);
                    this.monster.antennas.push(antennaTwo);
                }

                if(count === 3){
                    const antennaThree = this.add.image(CENTER_X + off.x, CENTER_Y + off.y, key);
                    this.monster.antennas.push(antennaThree);
                }
                
                if(Object.hasOwn(params, "other")) this.executeOptional(this.monster.antennas, params.other);

                return `Added ${count} antennas of type ${params.type} to the body.`;
            }
            // case 'get_monster_state': ...
            // case 'build_monster': ...
            case 'build_monster': {
                
                if(Object.hasOwn(params, "body_color") && Object.hasOwn(params, "body_shape")){
                    this.executeCommand('create_body', { color: params.body_color, shape: params.body_shape });

                    if(Object.hasOwn(params, "arm_color") && Object.hasOwn(params, "arm_pose")){
                        this.executeCommand('add_arms', { color: params.arm_color, pose: params.arm_pose });
                    }
                    if(Object.hasOwn(params, "leg_color") && Object.hasOwn(params, "leg_pose")){
                        this.executeCommand('add_legs', { color: params.leg_color, pose: params.leg_pose });
                    }
                    if(Object.hasOwn(params, "eye_type") && Object.hasOwn(params, "eye_count")){
                        this.executeCommand('add_eyes', { type: params.eye_type, count: params.eye_count });
                    }
                    if(Object.hasOwn(params, "mouth_type")){
                        this.executeCommand('add_mouth', { type: params.mouth_type });
                    }
                    if(Object.hasOwn(params, "antenna_color") && Object.hasOwn(params, "antenna_type") && Object.hasOwn(params, "antenna_count")){
                        this.executeCommand('add_antennas', { color: params.antenna_color, type: params.antenna_type, count: params.antenna_count });
                    }
                    
                    const state = this.executeCommand('get_monster_state');
                    
                    return `Created a full monster composed of a ${params.body_color} ${params.body_shape} body,
                        two ${params.arm_color} ${params.arm_pose} arms, two ${params.leg_color} ${params.leg_pose} legs,
                        ${params.eye_count} eyes of type ${params.eye_type}, a ${params.mouth_type} style mouth,
                        ${params.antenna_count} ${params.antenna_color} antennas of type ${params.antenna_type}.
                        ${state}`;
                }

                return 'ERROR: Could not create a monster because there is no base body selected to go off of.'
                
            }

            



            default:
                return `Unknown command: ${command}`;
        }
    }
}