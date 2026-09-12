/** Volatile references only. No persistence/telemetry/transport API in this module.
 * clear() releases application references; JavaScript cannot guarantee secure RAM erasure.
 */
export class PrivateMemory {
  #packet = null;
  #epoch = 0;
  get epoch() { return this.#epoch; }
  get packet() { return this.#packet; }
  clear() { this.#packet=null; this.#epoch++; }
  set(packet,epoch) {
    if (epoch!==this.#epoch) return false;
    this.#packet=packet; return true;
  }
}
