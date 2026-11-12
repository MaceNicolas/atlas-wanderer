// Atlas Wanderer — the visual journal: what happened, line by line, built from the events (spec documentation/mecaniques/evenements-et-effets.md).
// Nothing is written by hand for a new power: the mod says how each kind of event reads (game.json, ui.journal: rules { on, if?, text, color?, noCause? }, the first rule that
// fits wins; an event with no rule is not in the journal), and the cause of the event (the power that did it) is added at the end of the line.
const JOURNAL = (() => {
  const rules = () => ((GAME.def().ui || {}).journal || []);
  const has = key => I18N.has(key);
  // The words of a line: the numbers of the event (and their positive and negative parts), the names of the cards, the name of a keyword, the cause.
  function vars(ev, nameOf) {
    const v = { ...ev };
    for (const [k, x] of Object.entries(ev)) if (typeof x === 'number') { v['pos_' + k] = Math.max(x, 0); v['neg_' + k] = Math.max(-x, 0); }
    for (const role of ['target', 'source', 'attacker', 'card', 'replaced']) if (ev[role] != null) v[role + 'Name'] = nameOf(ev[role]) || '';
    if (ev.keyword) v.keywordName = has('keyword.' + ev.keyword) ? I18N.t('keyword.' + ev.keyword) : ev.keyword;
    if (ev.type === 'powerTriggered') v.triggerLabel = has('fx.trigger.' + ev.trigger) ? I18N.t('fx.trigger.' + ev.trigger) : ev.trigger;
    if (ev.cause) { v.causeName = nameOf(ev.cause.card) || ''; v.causeLabel = has('fx.trigger.' + ev.cause.trigger) ? I18N.t('fx.trigger.' + ev.cause.trigger) : ev.cause.trigger; }
    return v;
  }
  // The lines of a list of events: [{ type, text, cause, color, uids }]. nameOf(uid) gives the name of a card.
  function entries(events, nameOf) {
    const out = [], all = (events || []).map(ev => ({ ...ev, caused: ev.cause ? 1 : 0, causeCard: ev.cause ? ev.cause.card : null }));
    for (const ev of FX.merge(all)) {
      const r = rules().find(x => x.on === ev.type && (x.if == null || POWERS.value(x.if, { evt: ev, params: {}, vars: {}, carrier: {}, refs: {}, extra: {}, target: null })));
      if (!r) continue;
      const v = vars(ev, nameOf);
      out.push({ type: ev.type, text: I18N.t(r.text, v), cause: ev.cause && !r.noCause ? I18N.t('journal.cause', v) : '', color: r.color || '#cbd5e1',
        uids: [ev.target, ev.source, ev.attacker, ev.card, ev.replaced, ev.cause && ev.cause.card].filter(x => typeof x === 'number') });
    }
    return out;
  }
  // The journal of a combat up to frame `upTo`: [{ frame, ...entry }]. The names of the cards come from every frame so far (a card that died keeps its name).
  function ofCombat(frames, upTo) {
    const names = new Map(), out = [];
    for (let i = 0; i <= upTo && i < frames.length; i++) {
      [...frames[i].p, ...frames[i].e].forEach(s => names.set(s.uid, s.name));
      entries(frames[i].events, uid => names.get(uid)).forEach(e => out.push({ frame: i, ...e }));
    }
    return out;
  }
  return { entries, ofCombat, rules };
})();
