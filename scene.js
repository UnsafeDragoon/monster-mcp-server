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

        // Load every arm variant
        for (const color of PARTS.arm.colors) {
            for (const shape of PARTS.arm.shapes) {
                const key = `arm_${color}${shape}`;
                this.load.image(key, `assets/${key}.png`);
            }
        }

        // Load every leg variant
        for (const color of PARTS.leg.colors) {
            for (const shape of PARTS.leg.shapes) {
                const key = `leg_${color}${shape}`;
                this.load.image(key, `assets/${key}.png`);
            }
        }

        // Load every eye variant
        for (const style of PARTS.eye.styles) {
            const key = `eye_${style}`;
            this.load.image(key, `assets/${key}.png`);
        }

        // Load every mouth variant
        for (const type of PARTS.mouth.types) {
            const key = type.length === 1 ? `mouth${type}` : `mouth_${type}`;
            this.load.image(key, `assets/${key}.png`);
        }

        // Load every antenna variant
        for (const color of PARTS.antenna.colors) {
            for (const type of PARTS.antenna.types) {
                const key = `detail_${color}_${type}`;
                this.load.image(key, `assets/${key}.png`);
            }
        }
    }

    create() {
        this.statusText = this.add.text(10, 10, 'waiting for bridge connection...',
            { color: '#888', fontSize: '14px' });
        this.connectToBridge();
    }

    connectToBridge() {
        this.ws = new WebSocket('ws://localhost:5500');

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
            let result;
            try {
                result = this.executeCommand(msg.command, msg.params);
            } catch (err) {
                result = `Error executing ${msg.command}: ${err.message}`;
            }
            this.ws.send(JSON.stringify({ id: msg.id, result }));
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

    // ============================================================
    // TODO: implement this. Each case applies one command and
    // returns a string describing what happened (or an error).
    // ============================================================
    executeCommand(command, params) {
        switch (command) {
            case 'clear_monster':
                this.clearMonster();
                return 'Monster cleared.';

            case 'create_body': {
                this.clearMonster();  // provided in starter code
                const key = `body_${params.color}${params.shape}`;
                this.monster.body = this.add.image(CENTER_X, CENTER_Y, key);
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
                
                return `Added ${count} antennas of type ${params.type} to the body.`;
            }
            // case 'get_monster_state': ...
            case 'get_monster_state': {
                const state = JSON.stringify(this.monster);
                return `Current monster state: ${state}`;
            }
            
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