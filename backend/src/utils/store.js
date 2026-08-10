// ============================================================
// ALMACENAMIENTO CENTRALIZADO (para desarrollo)
// ============================================================

// Usuarios registrados
const users = new Map(); // email -> { id, email, passwordHash, plan, createdAt }

// Uso de conversiones por usuario/día
const usageStore = new Map(); // key: userId-YYYY-MM-DD -> count

// ============================================================
// FUNCIONES PARA USO
// ============================================================

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getUsageKey(identifier) {
    return `${identifier}-${getToday()}`;
}

function getUsage(identifier) {
    const key = getUsageKey(identifier);
    return usageStore.get(key) || 0;
}

function incrementUsage(identifier) {
    const key = getUsageKey(identifier);
    const current = usageStore.get(key) || 0;
    usageStore.set(key, current + 1);
    return current + 1;
}

function resetUsage(identifier) {
    const key = getUsageKey(identifier);
    usageStore.delete(key);
}

// ============================================================
// EXPORTAR
// ============================================================
module.exports = {
    users,
    usageStore,
    getToday,
    getUsageKey,
    getUsage,
    incrementUsage,
    resetUsage
};