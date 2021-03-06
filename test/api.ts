export * from "../src/api.js"
import * as API from "../src/api.js"
import type { DID, Link, Await } from "@ipld/dag-ucan"

import type { Result as SyncResult } from "../src/api.js"
export type { DID, Link, SyncResult }
export type Result<
  T extends unknown = unknown,
  X extends Error = Error
> = Await<API.Result<T, X>>

export interface StorageProvider {
  /**
   * Service will call this once it verified the UCAN to associate link with a
   * given DID. Service is unaware if given `DID` is associated with some account
   * or not, if it is not `StoreProvider` MUST return `UnknownDIDError`.
   *
   * @param group - DID of the group to which car will be added, should be
   * linked with some account.
   * @param link - CID of the CAR that user wants to add.
   * @param proof - CID of the invocation UCAN.
   */
  add(
    group: DID,
    link: Link,
    proof: Link
  ): Result<AddStatus, UnknownDIDError | QuotaViolationError>
  /**
   *
   * @param group - DID we received an invocation request from.
   * @param link - CID of the CAR that user wants to remove.
   * @param proof - CID of the invocation UCAN.
   */
  remove(
    group: DID,
    link: Link,
    proof: Link
  ): Result<null, UnknownDIDError | DoesNotHasError>
}

export interface TokenStore {
  /**
   * Revokes set of UCANS. CID corresponds to the link been revoked and
   * proof is the CID of the revocation.
   */
  revoke(token: Link, revocation: TokenEntry): Result<null, Error>

  /**
   * Adds bunch of proofs for later queries.
   */
  insert(tokens: IterableIterator<TokenEntry>): Result<null, Error>

  /**
   * You give it named set of CIDs and it gives you back named set of
   * corresponding UCANs or an error describing it.
   */
  select<Query extends Record<string, Link>>(
    query: Query
  ): Await<SelectResult<Query>>

  gc(): Await<void>
}

export type SelectResult<Q> = {
  [Key in keyof Q]: Found | NotFoundError | RevokedError | ExpiredError
}

export interface TokenEntry {
  cid: Link
  bytes: Uint8Array
  ttl: number
}

export interface Found {
  status: "ok"
  ok: true

  ttl: number
  cid: Link
  bytes: Uint8Array
}

export interface NotFoundError extends Error {
  ok: false
  status: "not-found"
  cid: Link
}

/**
 * UCAN with given cid has been revoked
 */
export interface RevokedError extends Error {
  ok: false
  status: "revoked"

  // revocation CID
  proof: Link

  // TTL of the UCAN that was revoked
  ttl: number | null
  cid: Link

  // maybe be revoked even before we have seen it.
  bytes: Uint8Array | null
}

/**
 * UCAN has expired.
 */
export interface ExpiredError extends Error {
  ok: false
  status: "expired"
  cid: Link

  // when did token expire
  expiry: number
}

export interface AccessProvider {
  /**
   * Associates a DID with another DID in the system. If there is no account
   * associated with a `to` DID will produce an error.
   */
  link(member: DID, group: DID, proof: Link): Result<null, UnknownDIDError>

  unlink(member: DID, group: DID, proof: Link): Result<null, UnknownDIDError>

  /**
   * Associates new child DID with an accound of the parent DID. If there is no
   * account associated with a parent it creates account with `parent` did first
   * and then associates child DID with it.
   */
  register(member: DID, group: DID, proof: Link): Result<null, never>

  /**
   * Resolves account DID associated with a given DID. Returns either account
   * did (which will have form of `did:cid:bafy...hash`) or null if no account
   * is associated.
   * @param member
   */
  resolve(member: DID): Await<DID | null>
}

export interface AddStatus {
  /**
   * Should be `ok` if we already have car and we don't need to perform upload.
   * Otherwise should be `pending`.
   */
  status: "in-s3" | "not-in-s3"
}

export interface ProofNotFoundError extends Error {
  readonly name: "ProofNotFoundError"
  cid: Link
}

export interface QuotaViolationError extends Error {
  readonly name: "QuotaViolationError"
  group: DID
  link: Link
}

export interface DoesNotHasError extends RangeError {
  readonly name: "DoesNotHasError"
}

export interface UnknownDIDError extends RangeError {
  readonly name: "UnknownDIDError"
  did: DID | null
}

export interface InvalidInvocation extends Error {
  readonly name: "InvalidInvocation"
  link: Link
}
