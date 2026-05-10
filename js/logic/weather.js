// ==========================================
// Logic/Weather: 天气状态机与昼夜辅助
// ==========================================
function chooseWeatherType() {
    const roll = Math.random() * 100;
    let acc = 0;
    for (const key of Object.keys(WEATHER_CONFIG)) {
        acc += WEATHER_CONFIG[key].weight;
        if (roll <= acc) return key;
    }
    return 'sunny';
}

function setWeather(type, durationMs = 0) {
    weather.type = type;
    weather.changedAt = Date.now();
    weather.forcedUntil = durationMs > 0 ? Date.now() + durationMs : 0;
    if (!stats.weatherSeen) stats.weatherSeen = {};
    stats.weatherSeen[type] = true;
    effectText = `${WEATHER_CONFIG[type].icon} 天气变为${WEATHER_CONFIG[type].name}`;
    effectAlpha = 1.0;
    checkStoryUnlocks(false);
    if (typeof updateUI === 'function') updateUI();
}

function updateWeather(now) {
    if (weather.forcedUntil && now < weather.forcedUntil) return;
    if (weather.forcedUntil && now >= weather.forcedUntil) weather.forcedUntil = 0;
    if (now - weather.changedAt >= WEATHER_CHANGE_INTERVAL) {
        setWeather(chooseWeatherType());
    }
}

function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 6;
}

function getClockLabel() {
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${hour}:${minute} ${isNightTime() ? '夜晚' : '白天'}`;
}
