import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CompanyDraftScopeContext } from "./companyDraftScopeContext";
import useScopedDraft from "./useScopedDraft";
import { getTrustedDraftScope, getUserScope } from "../utils/userScope";
import { getApiStatus } from "../utils/apiError";

export const saveOutcomeIsUnknown = error => { const status = getApiStatus(error); return !status || status === 408 || status >= 500; };
const storageWarning = "Save recovery storage is unavailable. Keep this window open and review saved history before retrying.";
const markerOf = value => value?.attemptId && value?.startedAt ? value : null;
const sameWork = (left, right) => left && left.account === right.account && left.entity === right.entity && left.context === right.context && left.recordId === right.recordId;
const compatible = (left, right) => sameWork(left, right) && (left.scope === right.scope || !right.scope || (!left.scope && Boolean(left.account)));
const readJournal = work => {
  if (!work.scope) return { available: false, value: null };
  const key = `cosmos:draft:${work.scope}:${encodeURIComponent(`${work.entity}:save-outcome`)}:${encodeURIComponent(work.context)}`;
  try { return { available: true, value: JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null") }; }
  catch { return { available: false, value: null }; }
};

/** Reconciliation evidence only. A local attempt ID is never sent as invented server idempotency. */
export default function useUncertainSave({ entity, context = "new", recordId = null }) {
  const verified = useContext(CompanyDraftScopeContext);
  const scope = verified ?? getTrustedDraftScope();
  const account = getUserScope();
  const work = { scope, account, entity, context: String(context), recordId: recordId == null ? null : String(recordId) };
  const identity = JSON.stringify([scope, account, entity, String(context), recordId == null ? null : String(recordId)]);
  const journal = useScopedDraft({ entity: `${entity}:save-outcome`, context, version: 1, values: null, enabled: false, scope });
  const [local, setLocal] = useState(null);
  const [warning, setWarning] = useState(null);
  const attempt = useRef(null);
  const active = useRef(work);
  const recovered = markerOf(journal.recoveredDraft?.values?.marker);
  const visible = compatible(local, work) ? local : null;
  const marker = visible?.marker ?? recovered;
  const inFlight = Boolean(visible?.running);
  // Submit callbacks bind one attempt without relying on a batched React state update.
  const bindings = useRef(new WeakMap());
  const operations = useRef(null);
  const markerId = marker?.attemptId ?? null;
  const publish = value => setLocal(value ? { ...value.work, marker: value.marker, running: value.running } : null);

  useLayoutEffect(() => { active.current = { scope, account, entity, context: String(context), recordId: recordId == null ? null : String(recordId) }; }, [identity, scope, account, entity, context, recordId]);
  useEffect(() => {
    const current = attempt.current;
    if (!current) return;
    const nextWork = { scope, account, entity, context: String(context), recordId: recordId == null ? null : String(recordId) };
    if (!compatible(current.work, nextWork)) { attempt.current = null; return; }
    // A verified company may arrive after Begin. Bind only the same known account/work, never a different verified company.
    if (!current.work.scope && scope && account) {
      current.work = nextWork;
      current.identity = identity;
      current.api = journal;
      const stored = readJournal(nextWork);
      const existing = markerOf(stored.value?.values?.marker);
      const conflict = existing && existing.attemptId !== current.marker.attemptId;
      current.persisted = !conflict && journal.saveDraft({ marker: current.marker });
      let alive = true;
      queueMicrotask(() => {
        if (!alive || attempt.current !== current) return;
        publish(current);
        setWarning(current.persisted ? null : { ...nextWork, message: conflict ? "An earlier saved attempt also needs review. Its journal has been retained; keep this window open for the current request." : storageWarning });
      });
      return () => { alive = false; };
    }
  }, [identity, scope, account, entity, context, recordId, journal]);

  const currentAttempt = (expectedAttemptId, expectedIdentity) => {
    const current = attempt.current;
    return current && current.marker.attemptId === expectedAttemptId && (current.originIdentity === expectedIdentity || current.identity === expectedIdentity) && compatible(current.work, active.current) ? current : null;
  };
  const persist = current => {
    const existing = markerOf(readJournal(current.work).value?.values?.marker);
    if (existing && existing.attemptId !== current.marker.attemptId) {
      setWarning({ ...current.work, message: "A newer saved attempt exists and has been retained. Review saved history before retrying." });
      return false;
    }
    const saved = current.api.saveDraft({ marker: current.marker });
    current.persisted = current.persisted || saved;
    if (!saved) setWarning({ ...current.work, message: storageWarning });
    return saved;
  };
  const clear = (current, reviewed = false) => {
    const target = current?.work ?? work;
    const expected = current?.marker ?? marker;
    const stored = readJournal(target);
    const existing = markerOf(stored.value?.values?.marker);
    if (existing && expected && existing.attemptId !== expected.attemptId) {
      attempt.current = null;
      setLocal({ ...target, marker: existing, running: false });
      setWarning({ ...target, message: "A newer saved attempt exists and has been retained. Review it before allowing another save." });
      return false;
    }
    try {
      if (current?.persisted || (reviewed && existing)) (current?.api ?? journal).clearDraft();
    } catch {
      setWarning({ ...target, message: storageWarning });
      return false;
    }
    const remaining = markerOf(readJournal(target).value?.values?.marker);
    if (remaining && (current?.persisted || reviewed)) {
      setLocal({ ...target, marker: remaining, running: false });
      setWarning({ ...target, message: "The saved attempt journal could not be cleared safely. It is still retained." });
      return false;
    }
    attempt.current = null; setLocal(null); setWarning(null);
    return true;
  };
  const begin = (binding, expectedIdentity) => {
    if (expectedIdentity !== identity) return false;
    if (!compatible(work, active.current)) return false;
    const existingAttempt = attempt.current;
    const stored = markerOf(readJournal(work).value?.values?.marker);
    if (marker || stored || (existingAttempt && compatible(existingAttempt.work, work))) {
      if (stored && !marker) setLocal({ ...work, marker: stored, running: false });
      return false;
    }
    const next = { attemptId: crypto.randomUUID(), startedAt: new Date().toISOString(), recordId: work.recordId, phase: "AwaitingResponse" };
    bindings.current.set(binding, next.attemptId);
    const current = { work, originIdentity: identity, identity, marker: next, running: true, persisted: false, api: journal };
    attempt.current = current;
    persist(current); publish(current);
    return true;
  };
  const fail = (error, expectedAttemptId, expectedIdentity) => {
    const unknown = saveOutcomeIsUnknown(error);
    const current = currentAttempt(expectedAttemptId, expectedIdentity);
    if (!current) return unknown;
    if (!unknown) { clear(current); return false; }
    current.marker = { ...current.marker, phase: "OutcomeUnknown" }; current.running = false;
    persist(current); publish(current);
    return true;
  };
  const finish = (expectedAttemptId, expectedIdentity) => { const current = currentAttempt(expectedAttemptId, expectedIdentity); if (current) { current.running = false; publish(current); } };
  const succeed = (expectedAttemptId, expectedIdentity) => { const current = currentAttempt(expectedAttemptId, expectedIdentity); return current ? clear(current) : false; };
  const allowReviewedRetry = (expectedIdentity, expectedAttemptId) => {
    if (expectedIdentity !== identity || expectedAttemptId !== markerId) return false;
    const current = attempt.current;
    if (current && compatible(current.work, active.current) && current.running) return false;
    if (!compatible(work, active.current)) return false;
    return clear(current && compatible(current.work, work) ? current : null, true);
  };
  useLayoutEffect(() => { operations.current = { begin, fail, finish, succeed, allowReviewedRetry }; });
  const onFail = useCallback(function boundFailure(error) { return operations.current.fail(error, bindings.current.get(boundFailure) ?? markerId, identity); }, [identity, markerId]);
  const onBegin = useCallback(() => operations.current.begin(onFail, identity), [identity, onFail]);
  const onFinish = useCallback(() => operations.current.finish(bindings.current.get(onFail) ?? markerId, identity), [identity, onFail, markerId]);
  const onSucceed = useCallback(() => operations.current.succeed(bindings.current.get(onFail) ?? markerId, identity), [identity, onFail, markerId]);
  const onReviewedRetry = useCallback(() => operations.current.allowReviewedRetry(identity, markerId), [identity, markerId]);
  const storageError = compatible(warning, work) ? warning.message : journal.storageError;
  return { marker, blocked: Boolean(marker) || inFlight, inFlight, uncertain: Boolean(marker) && !inFlight, available: journal.available, storageError: storageError || (marker && !scope ? storageWarning : ""), begin: onBegin, fail: onFail, finish: onFinish, succeed: onSucceed, allowReviewedRetry: onReviewedRetry };
}
