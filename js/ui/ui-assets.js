// Centralized UI image paths. This file only declares paths and does not load
// or mutate game state.
(function initUiAssets() {
    const generatedRoot = 'assets/generated';

    window.UI_ASSETS = {
        ranch: {
            coop: level => `${generatedRoot}/ranch/coop_l${level}.png`,
            sheepfold: level => `${generatedRoot}/ranch/sheepfold_l${level}.png`,
            cowshed: level => `${generatedRoot}/ranch/cowshed_l${level}.png`,
            apiary: level => `${generatedRoot}/ranch/apiary_l${level}.png`,
            pigpen: level => `${generatedRoot}/ranch/pigpen_l${level}.png`
        },
        processing: {
            mill: level => `${generatedRoot}/processing/mill_l${level}.png`,
            bakery: level => `${generatedRoot}/processing/bakery_l${level}.png`,
            dairy: level => `${generatedRoot}/processing/dairy_l${level}.png`,
            ketchupFactory: level => `${generatedRoot}/processing/ketchup_factory_l${level}.png`
        },
        miracles: {
            barn: stage => `${generatedRoot}/miracles/barn_s${stage}.png`,
            irrigation: stage => `${generatedRoot}/miracles/irrigation_s${stage}.png`
        },
        visitors: {
            amir: 'assets/npc/amir.png',
            bruno: 'assets/npc/bruno.png',
            leo: 'assets/npc/leo.png',
            lia: 'assets/npc/lia.png'
        },
        workers: {
            human: {
                idle: `${generatedRoot}/workers/worker_idle.png`,
                walkL: `${generatedRoot}/workers/worker_walk_l.png`,
                walkR: `${generatedRoot}/workers/worker_walk_r.png`,
                tool: `${generatedRoot}/workers/worker_tool.png`
            },
            drone: {
                idle: `${generatedRoot}/workers/drone_idle.png`,
                spray: `${generatedRoot}/workers/drone_spray.png`,
                tiltL: `${generatedRoot}/workers/drone_tilt_l.png`,
                tiltR: `${generatedRoot}/workers/drone_tilt_r.png`
            }
        }
    };
})();
