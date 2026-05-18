/**
 * Jasper Junction - Level Manager
 * Difficulty matrix, spawning, and level configuration.
 */

'use strict';

JJ.Levels = (function () {
    // Difficulty matrix
    const LEVEL_CONFIGS = [
        { // Level 1
            levelNumber: 1,
            sheepCount: 3, cowCount: 3, goatCount: 3,
            speedMultiplier: 1.0,
            maxTime: 120,
            behaviorModifiers: {
                cowStubbornnessChance: 0.40,
                goatIgnoreChance: 0.30,
                sheepCohesionMultiplier: 1.0,
                goatChargeSpeedMultiplier: 1.0,
                cowWanderSpeedMultiplier: 1.0,
            },
        },
        { // Level 2
            levelNumber: 2,
            sheepCount: 5, cowCount: 5, goatCount: 5,
            speedMultiplier: 1.05,
            maxTime: 120,
            behaviorModifiers: {
                cowStubbornnessChance: 0.45,
                goatIgnoreChance: 0.30,
                sheepCohesionMultiplier: 1.0,
                goatChargeSpeedMultiplier: 1.0,
                cowWanderSpeedMultiplier: 1.0,
            },
        },
        { // Level 3
            levelNumber: 3,
            sheepCount: 7, cowCount: 7, goatCount: 7,
            speedMultiplier: 1.10,
            maxTime: 130,
            behaviorModifiers: {
                cowStubbornnessChance: 0.45,
                goatIgnoreChance: 0.35,
                sheepCohesionMultiplier: 1.0,
                goatChargeSpeedMultiplier: 1.0,
                cowWanderSpeedMultiplier: 1.0,
            },
        },
        { // Level 4
            levelNumber: 4,
            sheepCount: 10, cowCount: 10, goatCount: 10,
            speedMultiplier: 1.15,
            maxTime: 140,
            behaviorModifiers: {
                cowStubbornnessChance: 0.45,
                goatIgnoreChance: 0.35,
                sheepCohesionMultiplier: 0.9,
                goatChargeSpeedMultiplier: 1.0,
                cowWanderSpeedMultiplier: 1.0,
            },
        },
        { // Level 5
            levelNumber: 5,
            sheepCount: 14, cowCount: 14, goatCount: 14,
            speedMultiplier: 1.20,
            maxTime: 150,
            behaviorModifiers: {
                cowStubbornnessChance: 0.45,
                goatIgnoreChance: 0.35,
                sheepCohesionMultiplier: 0.9,
                goatChargeSpeedMultiplier: 1.10,
                cowWanderSpeedMultiplier: 1.10,
            },
        },
        { // Level 6 (Final)
            levelNumber: 6,
            sheepCount: 20, cowCount: 20, goatCount: 20,
            speedMultiplier: 1.25,
            maxTime: 180,
            behaviorModifiers: {
                cowStubbornnessChance: 0.50,
                goatIgnoreChance: 0.40,
                sheepCohesionMultiplier: 0.8,
                goatChargeSpeedMultiplier: 1.15,
                cowWanderSpeedMultiplier: 1.15,
            },
        },
    ];

    // Tutorial config
    const TUTORIAL_CONFIG = {
        levelNumber: 0,
        sheepCount: 3, cowCount: 0, goatCount: 0,
        speedMultiplier: 1.0,
        maxTime: Infinity,
        behaviorModifiers: {
            cowStubbornnessChance: 0.40,
            goatIgnoreChance: 0.30,
            sheepCohesionMultiplier: 1.0,
            goatChargeSpeedMultiplier: 1.0,
            cowWanderSpeedMultiplier: 1.0,
        },
    };

    // Pen definitions - matched to background image zones
    // Gate positions measured from background image in Photoshop
    const PENS = [
        { type: JJ.EntityType.Sheep, label: 'Sheep', x: 182, y: 34, width: 357, height: 197, gateX: 292, gateY: 231, gateWidth: 126, closed: false },
        { type: JJ.EntityType.Cow, label: 'Cows', x: 635, y: 31, width: 394, height: 198, gateX: 724, gateY: 231, gateWidth: 179, closed: false },
        { type: JJ.EntityType.Goat, label: 'Goats', x: 1127, y: 31, width: 379, height: 196, gateX: 1227, gateY: 231, gateWidth: 172, closed: false },
    ];

    // Play field bounds (where animals can roam) - multiple rectangles
    // Reduced lower extent to keep entities away from HUD (y:680) and BARK button (y:769)
    const FIELD_RECTS = [
        { x: 174, y: 265, width: 1325, height: 289 },   // Main upper field (y: 265-554) - buffer below pen walls
        { x: 132, y: 520, width: 1181, height: 130 },   // Lower field (y: 520-650) - stops well above HUD
        { x: 1482, y: 420, width: 55, height: 130 },    // Right extension (capped at 550)
        { x: 140, y: 350, width: 50, height: 200 },     // Left edge taper (capped at 550)
    ];

    // Combined bounding box (used for simple checks)
    const FIELD_BOUNDS = {
        x: 132,
        y: 265,
        width: 1405,
        height: 385, // y: 265 to 650
    };

    function isInField(x, y, radius) {
        // Check if center point is in any field rect (ignore radius for containment check)
        for (const rect of FIELD_RECTS) {
            if (x >= rect.x &&
                x <= rect.x + rect.width &&
                y >= rect.y &&
                y <= rect.y + rect.height) {
                return true;
            }
        }
        return false;
    }

    function constrainToField(x, y, radius) {
        // If center is in a valid rect, no constraint needed
        if (isInField(x, y, 0)) return { x, y };

        // Find the nearest valid position in any rect (using radius for edge padding)
        let bestX = x, bestY = y;
        let bestDist = Infinity;

        for (const rect of FIELD_RECTS) {
            const cx = Math.max(rect.x + radius, Math.min(rect.x + rect.width - radius, x));
            const cy = Math.max(rect.y + radius, Math.min(rect.y + rect.height - radius, y));
            const dx = cx - x;
            const dy = cy - y;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                bestX = cx;
                bestY = cy;
            }
        }

        return { x: bestX, y: bestY };
    }

    const MAX_SPEED = 135; // Speed cap in px/s

    function getConfig(levelNumber) {
        if (levelNumber === 0) return { ...TUTORIAL_CONFIG };
        if (levelNumber >= 1 && levelNumber <= 6) {
            return { ...LEVEL_CONFIGS[levelNumber - 1] };
        }
        return { ...LEVEL_CONFIGS[5] }; // Default to max
    }

    function getPens() {
        return PENS.map(p => ({ ...p, closed: false }));
    }

    function getFieldBounds() {
        return { ...FIELD_BOUNDS };
    }

    function spawnAnimals(config) {
        const animals = [];
        // Spawn within the main upper field rect
        const upperRect = FIELD_RECTS[0];
        const spawnRegion = {
            x: upperRect.x + upperRect.width * 0.1,
            y: upperRect.y + upperRect.height * 0.15,
            width: upperRect.width * 0.8,
            height: upperRect.height * 0.7,
        };

        const types = [
            { type: JJ.EntityType.Sheep, count: config.sheepCount },
            { type: JJ.EntityType.Cow, count: config.cowCount },
            { type: JJ.EntityType.Goat, count: config.goatCount },
        ];

        let expansionAttempts = 0;
        const maxExpansion = 5;

        types.forEach(({ type, count }) => {
            for (let i = 0; i < count; i++) {
                let placed = false;
                let attempts = 0;

                while (!placed && attempts < 100) {
                    const x = spawnRegion.x + Math.random() * spawnRegion.width;
                    const y = spawnRegion.y + Math.random() * spawnRegion.height;

                    // Check overlap with existing animals
                    const animal = JJ.Entities.createAnimal(type, x, y);
                    let overlaps = false;

                    for (const other of animals) {
                        const dx = animal.position.x - other.position.x;
                        const dy = animal.position.y - other.position.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const minDist = animal.collisionRadius + other.collisionRadius + 10;

                        if (dist < minDist) {
                            overlaps = true;
                            break;
                        }
                    }

                    if (!overlaps) {
                        // Apply speed multiplier (capped)
                        const effectiveSpeed = Math.min(
                            animal.baseSpeed * config.speedMultiplier,
                            MAX_SPEED
                        );
                        animal.speedMultiplier = config.speedMultiplier;
                        animals.push(animal);
                        placed = true;
                    }

                    attempts++;
                }

                // Expand region if can't place
                if (!placed && expansionAttempts < maxExpansion) {
                    expansionAttempts++;
                    spawnRegion.x -= JJ.CANVAS_WIDTH * 0.05;
                    spawnRegion.y -= JJ.CANVAS_HEIGHT * 0.05;
                    spawnRegion.width += JJ.CANVAS_WIDTH * 0.1;
                    spawnRegion.height += JJ.CANVAS_HEIGHT * 0.1;
                    i--; // Retry this animal
                }
            }
        });

        return animals;
    }

    function calculateScore(corralledCounts, totalCounts, elapsedTime, maxTime) {
        const sheepPoints = (corralledCounts.sheep || 0) * 100;
        const cowPoints = (corralledCounts.cow || 0) * 200;
        const goatPoints = (corralledCounts.goat || 0) * 300;

        const totalAnimals = (totalCounts.sheep || 0) + (totalCounts.cow || 0) + (totalCounts.goat || 0);
        const totalCorralled = (corralledCounts.sheep || 0) + (corralledCounts.cow || 0) + (corralledCounts.goat || 0);
        const allCorralled = totalCorralled === totalAnimals;

        let timeBonus = 0;
        let speedMultiplier = 1;

        if (allCorralled && elapsedTime < maxTime) {
            timeBonus = Math.max(0, maxTime - elapsedTime);
            if (elapsedTime < maxTime / 2) {
                speedMultiplier = 1.5;
            }
            timeBonus = Math.floor(timeBonus * speedMultiplier);
        }

        const totalScore = sheepPoints + cowPoints + goatPoints + timeBonus;

        // Star rating
        let stars = 1;
        const corralPercent = totalAnimals > 0 ? totalCorralled / totalAnimals : 0;

        if (allCorralled && timeBonus > 0) {
            stars = 3;
        } else if (allCorralled || corralPercent >= 0.6) {
            stars = 2;
        }

        return {
            sheepPoints,
            cowPoints,
            goatPoints,
            timeBonus,
            speedMultiplier,
            totalScore,
            stars,
            corralPercent,
        };
    }

    function isLastLevel(levelNumber) {
        return levelNumber >= 6;
    }

    return {
        getConfig,
        getPens,
        getFieldBounds,
        isInField,
        constrainToField,
        spawnAnimals,
        calculateScore,
        isLastLevel,
        LEVEL_CONFIGS,
        TUTORIAL_CONFIG,
    };
})();
