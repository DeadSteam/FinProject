export const calculateDeviationPercent = (plan, fact) => {
  if (!plan || plan === 0) return 0;
  return ((fact - plan) / plan * 100).toFixed(1);
};

export const calculateVariance = (plan, fact) => {
  return plan - fact;
};

export const getDeviationCssClass = (variance, classes = {}) => {
  const value = parseFloat(variance);
  if (value < 0) return classes.negative || 'negative';
  if (value > 0) return classes.positive || 'positive';
  return '';
}; 