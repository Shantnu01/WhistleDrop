const crypto = require('crypto');

class CryptoService {
  /**
   * Generates a secure, readable random case code.
   * Format: XXXX-XXXX-XXXX
   */
  static generateCaseCode() {
    const bytes = crypto.randomBytes(6);
    const hex = bytes.toString('hex').toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  }
}

module.exports = CryptoService;
