/**
 * Jasper Junction - Entity System
 * Entity manager and entity definitions (Jasper + Animals).
 */

'use strict';

JJ.EntityType = {
    Jasper: 'jasper',
    Sheep: 'sheep',
    Cow: 'cow',
    Goat: 'goat',
};

JJ.AnimalState = {
    Idle: 'idle',
    Wandering: 'wandering',
    Fleeing: 'fleeing',
    Stubborn: 'stubborn',
    Charging: 'charging',
    Ignoring: 'ignoring',
    Corralled: 'corralled',
    Queued: 'queued',
};

// Entity ID counter
let entityIdCounter = 0;

function createEntity(type, x, y, width, height) {
    return {
        id: 'e_' + (entityIdCounter++),
        type: type,
        position: { x: x, y: y },
        velocity: { x: 0, y: 0 },
        width: width,
        height: height,
        collisionRadius: Math.max(width, height) / 2,
        facing: 'right',
        animationState: {
            currentAnimation: 'idle',
            currentFrame: 0,
            frameTimer: 0,
            frameRate: 12,
        },
        zOrder: 0,
        creationOrder: entityIdCounter,
    };
}

function createJasper(x, y) {
    const e = createEntity(JJ.EntityType.Jasper, x, y, 64, 48);
    e.baseSpeed = 150;
    e.herdRadius = 120;
    e.isBarkActive = false;
    e.barkTimer = 0;
    e.barkDuration = 2;
    e.isStunned = false;
    e.stunTimer = 0;
    e.targetPosition = null;
    e.idleTimer = 0; // Track idle time for AFK detection
    return e;
}

function createAnimal(type, x, y) {
    let width, height, baseSpeed, herdRadius;

    switch (type) {
        case JJ.EntityType.Sheep:
            width = 48; height = 40;
            baseSpeed = 60; // 40% of Jasper's 150
            herdRadius = 180; // 1.5x base
            break;
        case JJ.EntityType.Cow:
            width = 56; height = 48;
            baseSpeed = 60; // flee speed; wander is 30
            herdRadius = 120;
            break;
        case JJ.EntityType.Goat:
            width = 44; height = 44;
            baseSpeed = 90; // fast
            herdRadius = 120;
            break;
    }

    const e = createEntity(type, x, y, width, height);
    e.baseSpeed = baseSpeed;
    e.herdRadius = herdRadius;
    e.state = JJ.AnimalState.Idle;
    e.stuckTimer = 0;
    e.stuckPosition = { x: x, y: y };
    e.lastUnstuckTime = 0;
    e.speedMultiplier = 1;

    // Type-specific behavior data
    switch (type) {
        case JJ.EntityType.Sheep:
            e.behaviorData = {
                flockmates: [],
                driftDirection: { x: 0, y: 0 },
                driftTimer: 0,
            };
            break;
        case JJ.EntityType.Cow:
            e.behaviorData = {
                wanderDirection: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
                wanderChangeTimer: 2 + Math.random() * 3,
                stubbornFacingAngle: 0,
                isStubborn: false,
                decelerationTimer: 0,
            };
            break;
        case JJ.EntityType.Goat:
            e.behaviorData = {
                wanderDirection: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
                wanderChangeTimer: 0.5 + Math.random(),
                ignoreTimer: 0,
                isIgnoring: false,
                chargeTarget: null,
                chargeSpeed: 0,
            };
            break;
    }

    return e;
}

// Entity Manager
JJ.Entities = (function () {
    let entities = [];
    let jasper = null;

    function reset() {
        entities = [];
        jasper = null;
        entityIdCounter = 0;
    }

    function addEntity(entity) {
        entities.push(entity);
        if (entity.type === JJ.EntityType.Jasper) {
            jasper = entity;
        }
    }

    function removeEntity(id) {
        entities = entities.filter(e => e.id !== id);
    }

    function getJasper() { return jasper; }

    function getAllAnimals() {
        return entities.filter(e => e.type !== JJ.EntityType.Jasper);
    }

    function getEntitiesByType(type) {
        return entities.filter(e => e.type === type);
    }

    function getAllEntities() { return entities; }

    function getUncorralledAnimals() {
        return entities.filter(e =>
            e.type !== JJ.EntityType.Jasper &&
            e.state !== JJ.AnimalState.Corralled
        );
    }

    function getUncorralledByType(type) {
        return entities.filter(e => e.type === type && e.state !== JJ.AnimalState.Corralled);
    }

    function update(dt) {
        if (!jasper) return;

        // Update Jasper
        updateJasper(dt);

        // Update animation states
        entities.forEach(e => {
            e.animationState.frameTimer += dt;
            if (e.animationState.frameTimer >= 1 / e.animationState.frameRate) {
                e.animationState.frameTimer = 0;
                e.animationState.currentFrame++;
            }

            // Update facing based on velocity
            if (e.velocity.x > 5) e.facing = 'right';
            else if (e.velocity.x < -5) e.facing = 'left';

            // Z-order based on Y position
            e.zOrder = e.position.y;
        });
    }

    function updateJasper(dt) {
        if (jasper.isStunned) {
            jasper.stunTimer -= dt;
            if (jasper.stunTimer <= 0) {
                jasper.isStunned = false;
                jasper.stunTimer = 0;
            }
            // Apply stun velocity decay
            jasper.velocity.x *= 0.9;
            jasper.velocity.y *= 0.9;
            jasper.position.x += jasper.velocity.x * dt;
            jasper.position.y += jasper.velocity.y * dt;
            jasper.animationState.currentAnimation = 'stunned';
            return;
        }

        // Bark update
        if (jasper.isBarkActive) {
            jasper.barkTimer -= dt;
            if (jasper.barkTimer <= 0) {
                jasper.isBarkActive = false;
                jasper.herdRadius = 120;
            }
        }

        // Check for bark input
        if (JJ.Input.isBarkTriggered()) {
            jasper.isBarkActive = true;
            jasper.barkTimer = jasper.barkDuration;
            jasper.herdRadius = 240; // doubled
            jasper.animationState.currentAnimation = 'bark';
            jasper.animationState.currentFrame = 0;
            if (JJ.Audio) JJ.Audio.playSFX('bark');
            if (JJ.Effects) JJ.Effects.spawnBarkWave(jasper.position, 240);
        }

        // Movement
        const target = JJ.Input.getTargetPosition();
        const inputActive = JJ.Input.isInputActive();

        if (target && inputActive) {
            const dx = target.x - jasper.position.x;
            const dy = target.y - jasper.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                // Normalize and apply speed
                jasper.velocity.x = (dx / dist) * jasper.baseSpeed;
                jasper.velocity.y = (dy / dist) * jasper.baseSpeed;
                jasper.animationState.currentAnimation = 'run';
                jasper.idleTimer = 0;
            } else {
                jasper.velocity.x = 0;
                jasper.velocity.y = 0;
                if (!jasper.isBarkActive) {
                    jasper.animationState.currentAnimation = 'idle';
                }
            }
        } else {
            jasper.velocity.x = 0;
            jasper.velocity.y = 0;
            if (!jasper.isBarkActive) {
                jasper.animationState.currentAnimation = 'idle';
            }
            jasper.idleTimer += dt;
        }

        // Apply velocity
        jasper.position.x += jasper.velocity.x * dt;
        jasper.position.y += jasper.velocity.y * dt;

        // Boundary constraint
        const r = jasper.collisionRadius;
        jasper.position.x = Math.max(r, Math.min(JJ.CANVAS_WIDTH - r, jasper.position.x));
        jasper.position.y = Math.max(r, Math.min(JJ.CANVAS_HEIGHT - r, jasper.position.y));

        // Dust trail
        if (Math.abs(jasper.velocity.x) > 10 || Math.abs(jasper.velocity.y) > 10) {
            if (JJ.Effects && Math.random() < 0.3) {
                JJ.Effects.spawnDustTrail(jasper.position);
            }
        }
    }

    return {
        reset,
        addEntity,
        removeEntity,
        getJasper,
        getAllAnimals,
        getEntitiesByType,
        getAllEntities,
        getUncorralledAnimals,
        getUncorralledByType,
        update,
        createJasper,
        createAnimal,
    };
})();

// Expose factory functions
JJ.Entities.createJasper = createJasper;
JJ.Entities.createAnimal = createAnimal;
