import * as API from "@gobengo/ucanto-interface"
import * as UCAN from "@ipld/dag-ucan"

/**
 * Represents view over the UCAN DAG. Can be instantiated with a `root` block
 * and a map of optional proof blocks.
 *
 * @template {UCAN.Capability} Capability
 * @implements {API.Delegation<Capability>}
 */
export class Delegation {
  /**
   * @param {object} root
   * @param {UCAN.Proof<Capability>} root.cid
   * @param {UCAN.ByteView<UCAN.UCAN<Capability>>} root.bytes
   * @param {UCAN.View<Capability>} root.data
   * @param {Map<string, API.Block<Capability>>} blocks
   * @param {{authority: API.AuthorityParser}} config
   */
  constructor(root, blocks = new Map(), config) {
    this.root = root
    this.blocks = blocks
    this.config = config
    Object.defineProperties(this, {
      blocks: {
        enumerable: false,
      },
    })
  }

  get version() {
    return this.root.data.version
  }
  get signature() {
    return this.root.data.signature
  }
  get cid() {
    return this.root.cid
  }
  get bytes() {
    return this.root.bytes
  }
  get data() {
    return this.root.data
  }
  /**
   * @returns {IterableIterator<API.Block>}
   */
  export() {
    return exportDelegation(/** @type {API.Delegation<Capability>} */ (this))
  }

  get proofs() {
    /** @type {API.Proof<Capability>[]} */
    const proofs = []
    const { blocks, data } = this
    for (const proof of data.proofs) {
      const block = blocks.get(proof.toString())
      if (block) {
        proofs.push(new Delegation(block, this.blocks, this.config))
      } else {
        proofs.push(/** @type {UCAN.Proof<Capability>} */ (proof))
      }
    }

    Object.defineProperty(this, "proofs", { value: proofs })
    return proofs
  }

  /**
   * @type {API.Authority}
   */
  get issuer() {
    const issuer = this.config.authority.parse(this.data.issuer.did())
    Object.defineProperties(this, { issuer: { value: issuer } })
    return issuer
  }

  /**
   * @type {API.Authority}
   */
  get audience() {
    const audience = this.config.authority.parse(this.data.audience.did())
    Object.defineProperties(this, { audience: { value: audience } })
    return audience
  }

  /**
   * @returns {Capability[]}
   */
  get capabilities() {
    return this.data.capabilities
  }

  /**
   * @returns {number}
   */
  get expiration() {
    return this.data.expiration
  }

  /**
   * @returns {undefined|number}
   */
  get notBefore() {
    return this.data.notBefore
  }

  /**
   * @returns {undefined|string}
   */

  get nonce() {
    return this.data.nonce
  }

  /**
   * @returns {UCAN.Fact[]}
   */
  get facts() {
    return this.data.facts
  }
}

/**
 * @template {UCAN.Capability} C
 * @param {API.Delegation<C>} delegation
 * @returns {IterableIterator<API.Block>}
 */
export const exportDelegation = function* ({ cid, bytes, data, proofs = [] }) {
  for (const proof of proofs) {
    if (!isLink(proof)) {
      yield* exportDelegation(proof)
    }
  }
  yield { cid, bytes, data }
}

/**
 * Type predicate returns true if value is the link.
 *
 * @param {unknown} value
 * @returns {value is UCAN.Link}
 */

export const isLink = value =>
  value != null && /** @type {{asCID: unknown}} */ (value).asCID === value
