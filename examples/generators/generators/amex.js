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
  name: "amex",
  description: "Generates a Luhn-valid 15-digit Amex number (34 or 37 prefix)",
  generate() {
    const chars = "0123456789";
    // Amex: starts with 34 or 37, 15 digits total
    const prefix = Math.random() < 0.5 ? "34" : "37";
    let partial = prefix;
    for (let i = 0; i < 12; i++) {
      partial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return partial + getLuhnCheckDigit(partial);
  },
};
