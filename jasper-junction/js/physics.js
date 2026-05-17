/**
 * Jasper Junction - Physics Manager
 * Collision detection/resolution, boundary constraints, spatial grid.
 */

'use strict';

JJ.Physics = (function () {
    const CELL_SIZE = 128;
    const COLS = Math.ceil(JJ.CANVAS_WIDTH / CELL_SIZE);
    const ROWS = Math.ceil(JJ.CANVAS_HEIGHT / CELL_SIZE);
    const MIN_SEPARATION = 10;
    const ANTI_JITTER_THRESHOLD = 2;
    const CORNER_DISTANCE = 20;
    const CORNER_FORCE_FACTOR = 0.3;
    const MAX_RESOLUTION_ITERATIONS = 3;
    const LOCAL_AVOIDANCE_RADIUS_MULTIPLIER = 2;
    const LOCAL_AVOIDANCE_FORCE = 0.25;

    let grid = new Map();

    function cellKey(col, row) {
        return col + ',' + row;
    }

    function getCell(x, y) {
        return {
            col: Math.floor(x / CELL_SIZE),
            row: Math.floor(y / CELL_SIZE),
        };
    }

    function rebuildGrid(entities) {
        grid.clear();
        entities.forEach(e => {
            const cell = getCell(e.position.x, e.position.y);
            const key = cellKey(cell.col, cell.row);
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(e);
        });
    }

    function queryNearby(position, radius) {
        const results = [];
        const minCell = getCell(position.x - radius, position.y - radius);
        const maxCell = getCell(position.x + radius, position.y + radius);

        for (let col = minCell.col; col <= maxCell.col; col++) {
            for (let row = minCell.row; row <= maxCell.row; row++) {
                const key = cellKey(col, row);
                const cell = grid.get(key);
                if (cell) {
                    cell.forEach(e => results.push(e));
                }
            }
        }
        return results;
    }

    function update(dt, entities) {
        // Apply velocity to animals (skip corralled)
        entities.forEach(e => {
            if (e.type === JJ.EntityType.Jasper) return; // Jasper handled in entities.js
            if (e.state === JJ.AnimalState.Corralled) return; // Skip corralled

            // Anti-jitter: snap if movement too small
            const moveMag = Math.sqrt(e.velocity.x * e.velocity.x + e.velocity.y * e.velocity.y) * dt;
            if (moveMag < ANTI_JITTER_THRESHOLD * dt && moveMag > 0) {
                e.velocity.x = 0;
                e.velocity.y = 0;
                return;
            }

            e.position.x += e.velocity.x * dt;
            e.position.y += e.velocity.y * dt;
        });

        // Filter out corralled animals for physics processing
        const activeEntities = entities.filter(e => e.state !== JJ.AnimalState.Corralled);

        // Rebuild spatial grid
        rebuildGrid(activeEntities);

        // Local avoidance
        applyLocalAvoidance(activeEntities, dt);

        // Resolve collisions
        resolveCollisions(activeEntities);

        // Boundary constraints
        activeEntities.forEach(e => constrainToBounds(e));

        // Corner escape
        activeEntities.forEach(e => applyCornerEscape(e, dt));
    }

    function applyLocalAvoidance(entities, dt) {
        entities.forEach(e => {
            if (e.type === JJ.EntityType.Jasper) return;
            if (e.state === JJ.AnimalState.Corralled) return;

            const nearby = queryNearby(e.position, e.collisionRadius * LOCAL_AVOIDANCE_RADIUS_MULTIPLIER);
            let avoidX = 0, avoidY = 0;
            let count = 0;

            nearby.forEach(other => {
                if (other.id === e.id) return;
                if (other.type === JJ.EntityType.Jasper) return;
                if (other.state === JJ.AnimalState.Corralled) return;
                if (count >= 3) return;

                const dx = e.position.x - other.position.x;
                const dy = e.position.y - other.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = e.collisionRadius + other.collisionRadius + MIN_SEPARATION;

                if (dist < minDist && dist > 0) {
                    avoidX += (dx / dist);
                    avoidY += (dy / dist);
                    count++;
                }
            });

            if (count > 0) {
                const speed = Math.sqrt(e.velocity.x * e.velocity.x + e.velocity.y * e.velocity.y) || e.baseSpeed;
                e.velocity.x += avoidX * speed * LOCAL_AVOIDANCE_FORCE * dt;
                e.velocity.y += avoidY * speed * LOCAL_AVOIDANCE_FORCE * dt;
            }
        });
    }

    function resolveCollisions(entities) {
        for (let iter = 0; iter < MAX_RESOLUTION_ITERATIONS; iter++) {
            let resolved = true;

            for (let i = 0; i < entities.length; i++) {
                for (let j = i + 1; j < entities.length; j++) {
                    const a = entities[i];
                    const b = entities[j];

                    if (a.state === JJ.AnimalState.Corralled || b.state === JJ.AnimalState.Corralled) continue;

                    const dx = b.position.x - a.position.x;
                    const dy = b.position.y - a.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = a.collisionRadius + b.collisionRadius + MIN_SEPARATION;

                    if (dist < minDist && dist > 0) {
                        resolved = false;
                        const overlap = (minDist - dist) / 2;
                        const nx = dx / dist;
                        const ny = dy / dist;

                        // Limit push to avoid large teleport-like jumps
                        const maxPush = 3;
                        const pushAmount = Math.min(overlap, maxPush);

                        if (a.type === JJ.EntityType.Jasper) {
                            b.position.x += nx * pushAmount * 2;
                            b.position.y += ny * pushAmount * 2;
                        } else if (b.type === JJ.EntityType.Jasper) {
                            a.position.x -= nx * pushAmount * 2;
                            a.position.y -= ny * pushAmount * 2;
                        } else {
                            a.position.x -= nx * pushAmount;
                            a.position.y -= ny * pushAmount;
                            b.position.x += nx * pushAmount;
                            b.position.y += ny * pushAmount;
                        }
                    }
                }
            }

            if (resolved) break;
        }
    }

    function constrainToBounds(entity) {
        const r = entity.collisionRadius;

        // Allow animals to move up into gate zones when horizontally aligned
        let allowGate = false;
        let gateMinY = 0;
        if (JJ.Levels) {
            const pens = JJ.Levels.getPens();
            const fieldTop = 251; // top of upper field rect
            for (const pen of pens) {
                // Only allow through the actual gate opening, not the whole pen
                if (entity.position.x >= pen.gateX &&
                    entity.position.x <= pen.gateX + pen.gateWidth &&
                    entity.position.y < fieldTop + 50) {
                    allowGate = true;
                    gateMinY = pen.gateY - 30;
                    break;
                }
            }
        }

        // If near gate, override the top boundary to let animal pass through
        if (allowGate) {
            const r = entity.collisionRadius;
            entity.position.y = Math.max(gateMinY + r, entity.position.y);
        }

        // Constrain to field rectangles
        if (JJ.Levels && JJ.Levels.constrainToField) {
            const constrained = JJ.Levels.constrainToField(entity.position.x, entity.position.y, r);

            if (allowGate) {
                // Only constrain X, let Y pass through to gate
                if (entity.type !== JJ.EntityType.Jasper && constrained.x !== entity.position.x) {
                    entity.velocity.x = 0;
                }
                entity.position.x = constrained.x;
            } else {
                if (entity.type !== JJ.EntityType.Jasper) {
                    // Hit boundary - stop velocity in that direction and dampen
                    if (constrained.x !== entity.position.x) {
                        entity.velocity.x = 0;
                    }
                    if (constrained.y !== entity.position.y) {
                        entity.velocity.y = 0;
                    }
                    // General damping near boundaries to prevent jitter
                    entity.velocity.x *= 0.9;
                    entity.velocity.y *= 0.9;
                }
                entity.position.x = constrained.x;
                entity.position.y = constrained.y;
            }
        }
    }

    function applyCornerEscape(entity, dt) {
        if (entity.type === JJ.EntityType.Jasper) return;
        const r = entity.collisionRadius;
        const x = entity.position.x;
        const y = entity.position.y;

        const nearLeft = x - r < CORNER_DISTANCE;
        const nearRight = x + r > JJ.CANVAS_WIDTH - CORNER_DISTANCE;
        const nearTop = y - r < CORNER_DISTANCE;
        const nearBottom = y + r > JJ.CANVAS_HEIGHT - CORNER_DISTANCE;

        if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
            // In a corner - push toward center
            const centerX = JJ.CANVAS_WIDTH / 2;
            const centerY = JJ.CANVAS_HEIGHT / 2;
            const dx = centerX - x;
            const dy = centerY - y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = entity.baseSpeed * CORNER_FORCE_FACTOR;

            entity.velocity.x += (dx / dist) * force;
            entity.velocity.y += (dy / dist) * force;
        }
    }

    return { update, queryNearby, rebuildGrid };
})();
