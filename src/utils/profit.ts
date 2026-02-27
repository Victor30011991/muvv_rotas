export const calculateNetProfit = (grossValue: number, category: 'heavy' | 'light' | 'zpe') => {
  const rates = {
    heavy: 0.12,
    light: 0.08,
    zpe: 0.15
  };
  
  const tax = grossValue * rates[category];
  return grossValue - tax;
};