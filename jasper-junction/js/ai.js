/**
 * Jasper Junction - AI Manager
 * Handles behavior for sheep, cows, and goats.
 */

'use strict';

JJ.AI = (function () {
    function update(dt, animals, jasper, behaviorModifiers) {
        if (!jasper) return;
        const mods = behaviorModifiers || {};

        animals.forEach(animal => {
            if (animal.state === JJ.AnimalState.Corralled || animal.state === JJ.AnimalState.Queued) return;

            switch (animal.type) {
                case JJ.EntityType.Sheep:
                    updateSheep(dt, animal, jasper, animals, mods);
                    break;
                case JJ.EntityType.Cow:
                    updateCow(dt, animal, jasper, mods);
                    break;
                case JJ.EntityType.Goat:
                    updateGoat(dt, animal, jasper, mods);
                    break;
            }
        });
    }

    // === SHEEP AI ===
    function updateSheep(dt, sheep, jasper, allAnimals, mods) {
        const dx = sheep.position.x - jasper.position.x;
        const dy = sheep.position.y - jasper.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const effectiveRadius = jasper.herdRadius * 1.5; // Sheep have 1.5x detection

        if (dist < effectiveRadius) {
            // Flee from Jasper
            sheep.state = JJ.AnimalState.Fleeing;
            const fleeSpeed = sheep.baseSpeed * sheep.speedMultiplier;
            let vx = (dx / dist) * fleeSpeed;
            let vy = (dy / dist) * fleeSpeed;

            // Flock cohesion - adjust toward nearby sheep
            const nearbySheep = allAnimals.filter(a =>
                a.type === JJ.EntityType.Sheep &&
                a.id !== sheep.id &&
                a.state !== JJ.AnimalState.Corralled
            );

            const cohesionRadius = effectiveRadius * 2 * (mods.sheepCohesionMultiplier || 1);
            let cohesionX = 0, cohesionY = 0, cohesionCount = 0;
            let alignX = 0, alignY = 0;

            nearbySheep.forEach(other => {
                const odx = other.position.x - sheep.position.x;
                const ody = other.position.y - sheep.position.y;
                const odist = Math.sqrt(odx * odx + ody * ody);

                if (odist < cohesionRadius && odist > 0) {
                    cohesionX += odx;
                    cohesionY += ody;
                    alignX += other.velocity.x;
                    alignY += other.velocity.y;
                    cohesionCount++;
                }
            });

            if (cohesionCount >= 2) {
                // Cohesion: steer toward center of nearby flock
                cohesionX /= cohesionCount;
                cohesionY /= cohesionCount;
                const cohesionStrength = 0.2;
                vx += cohesionX * cohesionStrength;
                vy += cohesionY * cohesionStrength;

                // Alignment: match heading of nearby sheep
                alignX /= cohesionCount;
                alignY /= cohesionCount;
                const alignStrength = 0.15;
                vx += alignX * alignStrength;
                vy += alignY * alignStrength;
            }

            // Normalize to flee speed
            const mag = Math.sqrt(vx * vx + vy * vy);
            if (mag > 0) {
                sheep.velocity.x = (vx / mag) * fleeSpeed;
                sheep.velocity.y = (vy / mag) * fleeSpeed;
            }
        } else {
            // Idle drift
            sheep.state = JJ.AnimalState.Idle;
            sheep.behaviorData.driftTimer -= dt;

            if (sheep.behaviorData.driftTimer <= 0) {
                sheep.behaviorData.driftTimer = 3 + Math.random() * 4;
                const angle = Math.random() * Math.PI * 2;
                sheep.behaviorData.driftDirection = {
                    x: Math.cos(angle),
                    y: Math.sin(angle),
                };
            }

            const driftSpeed = 15 * sheep.speedMultiplier; // 10% of Jasper's speed
            sheep.velocity.x = sheep.behaviorData.driftDirection.x * driftSpeed;
            sheep.velocity.y = sheep.behaviorData.driftDirection.y * driftSpeed;
        }
    }

    // === COW AI ===
    function updateCow(dt, cow, jasper, mods) {
        const dx = cow.position.x - jasper.position.x;
        const dy = cow.position.y - jasper.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const stubbornChance = mods.cowStubbornnessChance || 0.4;

        if (dist < jasper.herdRadius) {
            if (cow.state !== JJ.AnimalState.Fleeing && cow.state !== JJ.AnimalState.Stubborn) {
                // Decide: flee or stubborn
                if (Math.random() < stubbornChance) {
                    cow.state = JJ.AnimalState.Stubborn;
                    cow.behaviorData.isStubborn = true;
                    cow.behaviorData.stubbornFacingAngle = Math.atan2(
                        jasper.position.y - cow.position.y,
                        jasper.position.x - cow.position.x
                    );
                } else {
                    cow.state = JJ.AnimalState.Fleeing;
                }
            }

            if (cow.state === JJ.AnimalState.Stubborn) {
                // Check if Jasper has moved 45+ degrees
                const currentAngle = Math.atan2(
                    jasper.position.y - cow.position.y,
                    jasper.position.x - cow.position.x
                );
                let angleDiff = Math.abs(currentAngle - cow.behaviorData.stubbornFacingAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                if (angleDiff >= Math.PI / 4) { // 45 degrees
                    cow.state = JJ.AnimalState.Fleeing;
                    cow.behaviorData.isStubborn = false;
                } else {
                    cow.velocity.x = 0;
                    cow.velocity.y = 0;
                }
            }

            if (cow.state === JJ.AnimalState.Fleeing) {
                const fleeSpeed = cow.baseSpeed * cow.speedMultiplier;
                cow.velocity.x = (dx / dist) * fleeSpeed;
                cow.velocity.y = (dy / dist) * fleeSpeed;
            }
        } else {
            // Decelerate if was fleeing
            if (cow.state === JJ.AnimalState.Fleeing) {
                cow.behaviorData.decelerationTimer += dt;
                if (cow.behaviorData.decelerationTimer >= 1) {
                    cow.state = JJ.AnimalState.Wandering;
                    cow.behaviorData.decelerationTimer = 0;
                } else {
                    const factor = 1 - cow.behaviorData.decelerationTimer;
                    cow.velocity.x *= factor;
                    cow.velocity.y *= factor;
                    return;
                }
            } else {
                cow.state = JJ.AnimalState.Wandering;
            }

            cow.behaviorData.isStubborn = false;

            // Wander
            cow.behaviorData.wanderChangeTimer -= dt;
            if (cow.behaviorData.wanderChangeTimer <= 0) {
                cow.behaviorData.wanderChangeTimer = 2 + Math.random() * 3;
                const angle = Math.random() * Math.PI * 2;
                cow.behaviorData.wanderDirection = {
                    x: Math.cos(angle),
                    y: Math.sin(angle),
                };
            }

            const wanderSpeed = 30 * cow.speedMultiplier * (mods.cowWanderSpeedMultiplier || 1);
            cow.velocity.x = cow.behaviorData.wanderDirection.x * wanderSpeed;
            cow.velocity.y = cow.behaviorData.wanderDirection.y * wanderSpeed;
        }
    }

    // === GOAT AI ===
    function updateGoat(dt, goat, jasper, mods) {
        const dx = goat.position.x - jasper.position.x;
        const dy = goat.position.y - jasper.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ignoreChance = mods.goatIgnoreChance || 0.3;

        // Handle ignore state
        if (goat.behaviorData.isIgnoring) {
            goat.behaviorData.ignoreTimer -= dt;
            if (goat.behaviorData.ignoreTimer <= 0) {
                goat.behaviorData.isIgnoring = false;
            } else {
                goat.state = JJ.AnimalState.Ignoring;
                // Continue wandering while ignoring
                wanderGoat(dt, goat, mods);
                return;
            }
        }

        // Handle charging
        if (goat.state === JJ.AnimalState.Charging) {
            const cdx = jasper.position.x - goat.position.x;
            const cdy = jasper.position.y - goat.position.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

            if (cdist < 30) {
                // Hit Jasper!
                performHeadButt(goat, jasper);
                goat.state = JJ.AnimalState.Wandering;
                goat.behaviorData.chargeTarget = null;
            } else {
                const chargeSpeed = goat.baseSpeed * 1.5 * goat.speedMultiplier * (mods.goatChargeSpeedMultiplier || 1);
                goat.velocity.x = (cdx / cdist) * chargeSpeed;
                goat.velocity.y = (cdy / cdist) * chargeSpeed;
            }
            return;
        }

        if (dist < jasper.herdRadius) {
            if (goat.state !== JJ.AnimalState.Fleeing && goat.state !== JJ.AnimalState.Charging) {
                // Decide: ignore?
                if (Math.random() < ignoreChance) {
                    goat.behaviorData.isIgnoring = true;
                    goat.behaviorData.ignoreTimer = 2 + Math.random() * 2;
                    goat.state = JJ.AnimalState.Ignoring;
                    return;
                }

                // Speed-dependent response
                const jasperSpeed = Math.sqrt(
                    jasper.velocity.x * jasper.velocity.x +
                    jasper.velocity.y * jasper.velocity.y
                );

                if (jasperSpeed > 75) {
                    // Flee
                    goat.state = JJ.AnimalState.Fleeing;
                } else {
                    // Charge!
                    goat.state = JJ.AnimalState.Charging;
                    goat.behaviorData.chargeTarget = { ...jasper.position };
                }
            }

            if (goat.state === JJ.AnimalState.Fleeing) {
                const fleeSpeed = goat.baseSpeed * goat.speedMultiplier;
                goat.velocity.x = (dx / dist) * fleeSpeed;
                goat.velocity.y = (dy / dist) * fleeSpeed;
            }
        } else {
            goat.state = JJ.AnimalState.Wandering;
            wanderGoat(dt, goat, mods);
        }
    }

    function wanderGoat(dt, goat, mods) {
        goat.behaviorData.wanderChangeTimer -= dt;
        if (goat.behaviorData.wanderChangeTimer <= 0) {
            goat.behaviorData.wanderChangeTimer = 0.5 + Math.random();
            const angle = Math.random() * Math.PI * 2;
            goat.behaviorData.wanderDirection = {
                x: Math.cos(angle),
                y: Math.sin(angle),
            };
        }

        const wanderSpeed = 60 * goat.speedMultiplier; // 2x cow wander
        goat.velocity.x = goat.behaviorData.wanderDirection.x * wanderSpeed;
        goat.velocity.y = goat.behaviorData.wanderDirection.y * wanderSpeed;
    }

    function performHeadButt(goat, jasper) {
        // Push Jasper back
        const dx = jasper.position.x - goat.position.x;
        const dy = jasper.position.y - goat.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pushDist = jasper.herdRadius * 2;
        const pushSpeed = pushDist / 0.3; // cover distance in 0.3s

        jasper.velocity.x = (dx / dist) * pushSpeed;
        jasper.velocity.y = (dy / dist) * pushSpeed;
        jasper.isStunned = true;
        jasper.stunTimer = 1 + Math.random(); // 1-2 seconds

        // Effects
        if (JJ.Effects) {
            JJ.Effects.setScreenShake(5, 0.3);
        }
        if (JJ.Audio) {
            JJ.Audio.playSFX('goat_scream');
            setTimeout(() => JJ.Audio.playSFX('impact'), 150);
        }
    }

    return { update };
})();
