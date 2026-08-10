const { usageCounts } = require('../utils/store');

const LIMITS = {
  anonymous: {
    pdf: 5,
    screenshot: 5
  },
  registered: {
    pdf: 10,
    screenshot: 10
  },
  premium: {
    pdf: 100,
    screenshot: 100
  }
};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getUsageKey(identifier, mode) {
  return `${identifier}-${mode}-${getToday()}`;
}

function getUsage(identifier, mode) {
  const key = getUsageKey(identifier, mode);
  return usageCounts.get(key) || 0;
}

function incrementUsage(identifier, mode) {
  const key = getUsageKey(identifier, mode);
  const current = usageCounts.get(key) || 0;
  usageCounts.set(key, current + 1);
  return current + 1;
}

function incrementUsageAfter(req) {
  if (req.usageIdentifier && req.usageMode) {
    incrementUsage(req.usageIdentifier, req.usageMode);
  }
}

module.exports = {
  LIMITS,
  getUsage,
  incrementUsage,
  incrementUsageAfter,
  getUsageKey,
  getToday
};