import * as API from "./api.js"
import { the } from "./util.js"
import { CID } from "multiformats"
import * as Digest from "multiformats/hashes/digest"

export class Failure extends Error {
  get error() {
    return this
  }
  describe() {
    return this.name
  }
  get message() {
    return this.describe()
  }
}
/**
 * @template C
 * @implements {API.EscalationError<C>}
 */
export class EscalationError extends Failure {
  /**
   *
   * @param {C} claimed
   * @param {C} escalated
   * @param {API.ConstraintViolationError<C>[]} violations
   */
  constructor(claimed, escalated, violations) {
    super()
    this.name = the("EscalationError")
    this.claimed = claimed
    this.escalated = escalated
    this.violations = violations
  }
  describe() {
    return [
      `Claimed capability ${format(
        this.claimed
      )} violates imposed constrainsts:`,
      ...[...this.violations].map($ => li(`${$.message}`)),
    ].join("\n")
  }
}

/**
 * @template {API.Capability} C
 * @implements {API.ConstraintViolationError<C>}
 */
export class ConstraintViolationError extends Failure {
  /**
   * @param {API.Constraint<C>} claimed
   * @param {API.Constraint<C>} violated
   */
  constructor(claimed, violated) {
    super()
    this.name = the("ConstraintViolationError")
    this.claimed = claimed
    this.violated = violated
  }

  describe() {
    const { claimed, violated } = this
    return `constraint ${format({
      [violated.name]: violated.value,
    })} is violated by ${format({ [claimed.name]: claimed.value })}`
  }
  get message() {
    return this.describe()
  }
}

/**
 * @template C
 * @implements {API.EscalatedClaim<C>}
 */
export class EscalatedClaim extends Failure {
  /**
   * @param {API.EscalationError<C>[]} esclacations
   */
  constructor(esclacations) {
    super()
    this.name = the("EscalatedClaim")
    this.esclacations = esclacations
  }
  describe() {
    return [
      `Capability escalates constraints`,
      ...this.esclacations.map($ => li($.message)),
    ].join("\n")
  }
}

/**
 * @template C
 * @implements {API.InvalidClaim<C>}
 */
export class InvalidClaim extends Failure {
  /**
   * @param {C} capability
   * @param {API.Delegation} delegation
   * @param {API.ProofError<C>[]} proofs
   */
  constructor(capability, delegation, proofs) {
    super()
    this.name = the("InvalidClaim")
    this.ok = the(false)
    this.capability = capability
    this.delegation = delegation
    this.proofs = proofs
  }
  describe() {
    const capability = format(this.capability)
    const did = this.delegation.issuer.did()
    const proofs =
      this.proofs.length > 0
        ? this.proofs.map((proof, n) => li(`prf:${n} ${proof.message}`))
        : [li(`There are no delegated proofs`)]

    return [
      `Claimed capability ${capability} is invalid`,
      li(`Capability can not be (self) issued by '${did}'`),
      ...proofs,
    ].join("\n")
  }
}

/**
 * @template C
 * @implements {API.InvalidClaim<C>}
 */
export class NoEvidence extends Failure {
  /**
   * @param {C} capability
   * @param {API.Delegation} delegation
   * @param {API.InvalidCapability[]} errors
   * @param {API.ProofError<C>[]} proofs
   */
  constructor(capability, delegation, errors, proofs = []) {
    super()
    this.name = the("InvalidClaim")
    this.capability = capability
    this.delegation = delegation
    this.errors = errors
    this.proofs = proofs
  }
  describe() {
    const capability = format(this.capability)

    return [
      `Does not delegate matching capability ${capability}`,
      ...this.errors.map(error => li(`${error.message}`)),
    ].join("\n")
  }
}

/**
 * @template C
 * @implements {API.InvalidEvidence<C>}
 */
export class InvalidEvidence extends Failure {
  /**
   * @param {API.Evidence<C>} evidence
   * @param {API.Delegation} delegation
   * @param {API.InvalidClaim<C>[]} proofs
   */
  constructor(evidence, delegation, proofs) {
    super()
    this.name = the("InvalidEvidence")
    this.evidence = evidence
    this.delegation = delegation
    this.proofs = proofs
  }
  describe() {
    return [
      `Claimed capability requires delegated capabilites:`,
      ...this.evidence.capabilities.map($ => li(format($))),
      `Which could not be satifised because:`,
      ...this.proofs.map($ => li($.message)),
    ].join("\n")
  }
}
/**
 * @implements {API.InvalidSignature}
 */
export class InvalidSignature extends Failure {
  /**
   * @param {API.Delegation} delegation
   */
  constructor(delegation) {
    super()
    this.name = the("InvalidSignature")
    this.delegation = delegation
  }
  get issuer() {
    return this.delegation.issuer
  }
  get audience() {
    return this.delegation.audience
  }
  describe() {
    return [`Signature is invalid`].join("\n")
  }
}

/**
 * @implements {API.UnavailableProof}
 */
export class UnavailableProof extends Failure {
  /**
   * @param {API.UCAN.Proof} link
   */
  constructor(link) {
    super()
    this.name = the("UnavailableProof")
    this.link = link
  }
  describe() {
    return `Linked proof '${this.link}' is not included nor available locally`
  }
}

/**
 * @implements {API.InvalidAudience}
 */
export class InvalidAudience extends Failure {
  /**
   * @param {API.UCAN.Audience} audience
   * @param {API.Delegation} delegation
   */
  constructor(audience, delegation) {
    super()
    this.name = the("InvalidAudience")
    this.audience = audience
    this.delegation = delegation
  }
  describe() {
    return `Delegates to '${this.delegation.audience.did()}' instead of '${this.audience.did()}'`
  }
}

/**
 * @implements {API.MalformedCapability}
 */
export class MalformedCapability extends Failure {
  /**
   * @param {API.Capability} capability
   * @param {Failure[]} problems
   */
  constructor(capability, problems = []) {
    super()
    this.name = the("MalformedCapability")
    this.capability = capability
    this.problems = problems
  }
  describe() {
    return [
      `Encountered malformed capability: ${format(this.capability)}`,
      ...this.problems.map($ => li($.message)),
    ].join("\n")
  }
}

export class UnknownCapability extends Failure {
  /**
   * @param {API.Capability} capability
   */
  constructor(capability) {
    super()
    this.name = the("UnknownCapability")
    this.capability = capability
  }
  describe() {
    return `Encountered unkown capability: ${format(this.capability)}`
  }
}

export class Expired extends Failure {
  /**
   * @param {API.Delegation & { expiration: number }} delegation
   */
  constructor(delegation) {
    super()
    this.name = the("Expired")
    this.delegation = delegation
  }
  describe() {
    return `Expired on ${new Date(this.delegation.expiration * 1000)}`
  }
  get expiredAt() {
    return this.delegation.expiration
  }
}

export class NotValidBefore extends Failure {
  /**
   * @param {API.Delegation & { notBefore: number }} delegation
   */
  constructor(delegation) {
    super()
    this.name = the("NotValidBefore")
    this.delegation = delegation
  }
  describe() {
    return `Not valid before ${new Date(this.delegation.notBefore * 1000)}`
  }
  get validAt() {
    return this.delegation.notBefore
  }
}

/**
 * @template C
 */
export class ClaimError extends Failure {
  /**
   * @param {API.EscalationError<C>[]} esclacations
   * @param {API.UCAN.Capability[]} unknownCapabilities
   */
  constructor(esclacations, unknownCapabilities) {
    super()
    this.name = the("ClaimError")
    this.esclacations = esclacations
    this.unknownCapabilities = unknownCapabilities
  }
}

/**
 * @param {unknown} capability
 * @param {string|number} [space]
 */

const format = (capability, space) =>
  JSON.stringify(
    capability,
    (key, value) => {
      if (
        value &&
        value.hash instanceof Uint8Array &&
        typeof value.code === "number" &&
        typeof value.version === "number"
      ) {
        return CID.create(
          value.version,
          value.code,
          Digest.decode(value.hash)
        ).toString()
      } else {
        return value
      }
    },
    space
  )

/**
 * @param {string} message
 */
const indent = (message, indent = "  ") =>
  `${indent}${message.split("\n").join(`\n${indent}`)}`

/**
 * @param {string} message
 */
const li = message => indent(`- ${message}`)
