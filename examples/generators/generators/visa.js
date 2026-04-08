function getLuhnCheckDigit(input) {
  let value = input + "",
    s = 0,
    p = 2;
  for (let x = value.length; x--; ) {
    let d = Math.max(p, 1) * +value[x];
    s += d > 9 ? [...(d + "")].reduce((a, b) => a + +b, 0) : d;
    p *= -1;
  }
  return ((10 - (s % 10)) % 10) + "";
}

module.exports = {
  name: "visa",
  description: "Generates a Luhn-valid 16-digit Visa card number (4xxx prefix)",
  generate() {
    const chars = "0123456789";
    // Start with "4" (Visa-style prefix) + 14 random digits
    let partial = "4";
    for (let i = 0; i < 14; i++) {
      partial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return partial + getLuhnCheckDigit(partial);
  },
};
