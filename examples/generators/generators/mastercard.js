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
  name: "mastercard",
  description:
    "Generates a Luhn-valid 16-digit Mastercard number (51-55 prefix)",
  generate() {
    const chars = "0123456789";
    // Mastercard: starts with 51-55, 16 digits total
    const prefix = "5" + (Math.floor(Math.random() * 5) + 1);
    let partial = prefix;
    for (let i = 0; i < 13; i++) {
      partial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return partial + getLuhnCheckDigit(partial);
  },
};
