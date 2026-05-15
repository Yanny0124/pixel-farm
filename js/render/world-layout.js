// Central visual placement for world-rendered assets.
// Farm tile placement uses js/config.js as the single source of truth so
// rendering, hit tests, and crop sprites stay aligned.
(function () {
    const farmW = gridWidth + (typeof FARM_PLOT_GAP !== 'undefined' ? FARM_PLOT_GAP : 0);
    const farmH = gridHeight + (typeof FARM_PLOT_GAP !== 'undefined' ? FARM_PLOT_GAP : 0);
    const bgRatio = 1417 / 1110;
    const bgH = 900;
    const bgW = bgH * bgRatio;
    const bgX = (1600 - bgW) / 2;
    const bottomRoadY = farmStartY + farmH + 64;
    const roadStartX = farmStartX + 32;
    const roadEndX = Math.max(ranchStartX + ranchWidth + 74, farmStartX + farmW + 270);
    const farmGateX = farmStartX + farmW / 2 - 17;
    const ranchGateX = ranchStartX + ranchWidth / 2 - 17;
    const processingGateX = farmStartX + Math.round(farmW * 0.70) - 17;
    const visitorBaseX = ranchStartX + 26;
    const visitorBaseY = ranchStartY + ranchHeight + 54;

    function visualFromConfig(config) {
        return {
            x: config.x,
            y: config.y,
            w: config.w,
            h: config.h,
            anchor: 'top-left'
        };
    }

    function mapObject(source, mapper) {
        return Object.keys(source || {}).reduce((result, key, index) => {
            result[key] = mapper(source[key], key, index);
            return result;
        }, {});
    }

    function mergeLayout(target, source) {
        Object.entries(source || {}).forEach(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                mergeLayout(target[key], value);
            } else {
                target[key] = value;
            }
        });
        return target;
    }

    const WORLD_LAYOUT_OVERRIDES = {
        miracles: {
            irrigation: {
                canal: {
                    visual: {
                        x: 410,
                        y: 102,
                        w: 484,
                        h: 452,
                        anchor: 'top-left'
                    }
                }
            },
            barn: {
                building: {
                    visual: {
                        x: 1113,
                        y: 575,
                        w: 163,
                        h: 147,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                }
            }
        },
        zones: {
            farmland: {
                visual: {
                    x: 376,
                    y: 130,
                    w: 396,
                    h: 396,
                    anchor: 'top-left'
                }
            }
        },
        buildings: {
            processing: {
                mill: {
                    visual: {
                        x: 364,
                        y: 539,
                        w: 172,
                        h: 132,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                },
                ketchupFactory: {
                    visual: {
                        x: 536,
                        y: 541,
                        w: 172,
                        h: 132,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                },
                bakery: {
                    visual: {
                        x: 676,
                        y: 566,
                        w: 172,
                        h: 132,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                },
                dairy: {
                    visual: {
                        x: 838,
                        y: 585,
                        w: 172,
                        h: 132,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                }
            },
            ranch: {
                apiary: {
                    visual: {
                        x: 789,
                        y: 270,
                        w: 98,
                        h: 70,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                },
                pigpen: {
                    visual: {
                        x: 871,
                        y: 363,
                        w: 124,
                        h: 84,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                },
                cowshed: {
                    visual: {
                        x: 1068,
                        y: 368,
                        w: 124,
                        h: 78,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                },
                coop: {
                    visual: {
                        x: 869,
                        y: 123,
                        w: 128,
                        h: 92,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                },
                sheepfold: {
                    visual: {
                        x: 1057,
                        y: 123,
                        w: 132,
                        h: 92,
                        anchor: 'top-left'
                    },
                    visualOffset: {
                        x: 0,
                        y: 0
                    }
                }
            }
        }
    };

    window.WORLD_LAYOUT = {
        background: {
            image: 'assets/generated/environment/clean_farm_base_background_v2.png',
            visual: {
                x: Math.round(bgX),
                y: 0,
                w: Math.round(bgW),
                h: bgH,
                anchor: 'top-left'
            }
        },
        zones: {
            farmland: {
                visual: {
                    x: farmStartX,
                    y: farmStartY,
                    w: farmW,
                    h: farmH,
                    anchor: 'top-left'
                }
            },
            pasture: {
                visual: {
                    x: ranchStartX,
                    y: ranchStartY,
                    w: ranchWidth,
                    h: ranchHeight,
                    anchor: 'top-left'
                }
            },
            road: {
                visual: {
                    x: roadStartX,
                    y: ranchStartY + 116,
                    w: roadEndX - roadStartX,
                    h: bottomRoadY + 114 - (ranchStartY + 116),
                    anchor: 'top-left'
                }
            }
        },
        roads: {
            main: {
                visual: { x: roadStartX, y: bottomRoadY, w: roadEndX - roadStartX, h: 34, anchor: 'top-left' }
            },
            farmGate: {
                visual: { x: farmGateX, y: farmStartY + farmH - 4, w: 34, h: bottomRoadY - (farmStartY + farmH) + 38, anchor: 'top-left' }
            },
            ranchGate: {
                visual: { x: ranchGateX, y: ranchStartY + ranchHeight - 4, w: 34, h: bottomRoadY - (ranchStartY + ranchHeight) + 38, anchor: 'top-left' }
            },
            processingGate: {
                visual: { x: processingGateX, y: bottomRoadY - 12, w: 34, h: 78, anchor: 'top-left' }
            },
            ranchSide: {
                visual: { x: ranchStartX + ranchWidth + 24, y: ranchStartY + 116, w: 34, h: ranchHeight - 18, anchor: 'top-left' }
            },
            ranchBottom: {
                visual: { x: ranchStartX + ranchWidth - 12, y: ranchStartY + ranchHeight - 38, w: 70, h: 34, anchor: 'top-left' }
            },
            ranchConnector: {
                visual: { x: ranchStartX + ranchWidth + 24, y: bottomRoadY - 4, w: 34, h: 118, anchor: 'top-left' }
            }
        },
        buildings: {
            processing: mapObject(PROCESSING_BUILDING_CONFIG, config => ({
                visual: visualFromConfig(config),
                visualOffset: { x: 0, y: 0 }
            })),
            ranch: mapObject(RANCH_BUILDING_CONFIG, config => ({
                visual: visualFromConfig(config),
                visualOffset: { x: 0, y: 0 }
            }))
        },
        miracles: {
            irrigation: {
                canal: {
                    visual: {
                        x: farmStartX - 36,
                        y: farmStartY - 20,
                        w: farmW + 72,
                        h: farmH + 40,
                        anchor: 'top-left'
                    }
                },
                building: {
                    visual: {
                        x: farmStartX + 108,
                        y: farmStartY - 6,
                        w: 178,
                        h: 108,
                        anchor: 'bottom-center'
                    },
                    visualOffset: { x: 0, y: 0 }
                }
            },
            barn: {
                building: {
                    visual: {
                        x: ranchStartX + ranchWidth - 134,
                        y: ranchStartY + ranchHeight + 64,
                        w: 150,
                        h: 134,
                        anchor: 'top-left'
                    },
                    visualOffset: { x: 0, y: 0 }
                }
            }
        },
        npcs: mapObject(VISITOR_CONFIG, (config, id, index) => ({
            mapAvatar: {
                visual: {
                    x: visitorBaseX + (index % 4) * 66 - 10,
                    y: visitorBaseY + 14 + Math.floor(index / 4) * 48 - 20,
                    w: 38,
                    h: 48,
                    anchor: 'top-left'
                },
                visualOffset: { x: 0, y: 0 }
            }
        }))
    };

    mergeLayout(window.WORLD_LAYOUT, WORLD_LAYOUT_OVERRIDES);
})();
