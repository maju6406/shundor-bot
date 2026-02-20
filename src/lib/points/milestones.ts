function isPrime(num: number): boolean {
  if (num < 2) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;
  for (let i = 3; i <= Math.floor(Math.sqrt(num)); i += 2) {
    if (num % i === 0) return false;
  }
  return true;
}

function isPowerOfTwo(num: number): boolean {
  if (num < 1) return false;
  return (num & (num - 1)) === 0;
}

function isPerfectSquare(num: number): boolean {
  if (num < 0) return false;
  const root = Math.floor(Math.sqrt(num));
  return root * root === num;
}

function isFibonacci(num: number): boolean {
  if (num === 0 || num === 1) return true;
  return isPerfectSquare(5 * num * num + 4) || isPerfectSquare(5 * num * num - 4);
}

function roundNumberMessage(total: number): string | null {
  switch (total) {
    case 5:
      return '🌱 Great start! Five points! 🌱';
    case 10:
      return '⭐ Nice! Ten points! ⭐';
    case 25:
      return '🎈 Awesome! Twenty-five points! 🎈';
    case 50:
      return '🔥 Fantastic! Fifty points! 🔥';
    case 75:
      return '💫 Amazing! Seventy-five points! 💫';
    case 100:
      return '🎊 OMGOMG century!! 🎊';
    case 500:
      return '🌟 WOW! Half a thousand! 🌟';
    case 1000:
      return '🚀 INCREDIBLE! One thousand points! 🚀';
    case 2500:
      return '💎 AMAZING! Twenty-five hundred! 💎';
    case 5000:
      return '🏆 LEGENDARY! Five thousand points! 🏆';
    case 10000:
      return '🎆 EPIC! TEN THOUSAND POINTS! 🎆';
    default:
      if (total >= 100 && total % 1000 === 0) return `🎯 Woohoo! ${total} points! 🎯`;
      if (total >= 500 && total % 500 === 0) return `✨ Fantastic! ${total} points! ✨`;
      if (total >= 100 && total % 100 === 0) return `🎉 Nice! ${total} points! 🎉`;
      return null;
  }
}

export function specialPointsTotalMessage(total: number): string | null {
  const round = roundNumberMessage(total);
  if (round) return round;

  if (total > 20 && isPowerOfTwo(total)) {
    return `💪 Power of two! ${total} is mathematically awesome and so are you! 💪`;
  }

  if (total > 20 && isFibonacci(total)) {
    return `🌀 Fibonacci number! ${total} is mathematically awesome and so are you! 🌀`;
  }

  if (total > 100 && isPrime(total)) {
    return `🔢 Sweet prime number! ${total} is mathematically awesome and so are you! 🔢`;
  }

  return null;
}
