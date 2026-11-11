// Atlas Wanderer — what the engine can do for a mod's game description (game.json): the closed lists of names a mod may use.
// A mod chooses among these; a new name means new code in the engine (never code in a mod). Spec: documentation/mecaniques/flux-de-jeu.md.
// Used by the validators (site/editor-core.js, tools/check-mods.js) and, later, by the flow interpreter.
(function (root) {
  const GAME_SCHEMA = {
    version: 1,
    // Field types a card category may use (what the editor and the validation know how to check).
    fieldTypes: ['int>=0', 'int>=1', 'type', 'types', 'types:one-per-group', 'sockets', 'socketColor', 'keywords', 'powers', 'power', 'boss'],
    // Effects of actions, steps and choices. Power bricks (pouvoirs-modulaires.md) can be used too, under the name "power".
    effects: ['gainResource', 'spendResource', 'incrementResource', 'levelUpIfFull', 'openChoice', 'closeChoice', 'moveCard', 'placeCard', 'discardCard',
      'draw', 'endStep', 'goPhase', 'endGame', 'run', 'setTypes', 'createSides', 'usePower', 'power'],
    // Predicates of conditions: { zone, is } · { resource, lt|le|eq|ge|gt } · { query, lt|le|eq|ge|gt } · { choiceOpen: any|other } · { not } · { any } · { all }.
    // choiceOpen "any" = any choice is open; "other" = a choice other than a reinforcement offer is open (an offer can be replaced by another).
    predicates: ['zone', 'resource', 'query', 'choiceOpen', 'not', 'any', 'all'],
    choiceStates: ['any', 'other'],
    comparisons: ['lt', 'le', 'eq', 'ge', 'gt'],
    zoneStates: ['full', 'empty'],
    // Values a predicate can read from the game (the engine computes them).
    queries: ['bossHp', 'heroesAlive', 'room'],
    // Automatic phases of the engine's core that a step can run.
    runners: ['bossReinforcement', 'combat', 'settlement', 'aftermath'],
    // Events a step can emit when it starts (enter) or ends (exit): the engine and the interface react to them.
    flowEvents: ['roomStart', 'startMission', 'beforeIncome', 'startReinforcement', 'endReinforcement'],
    // Active powers of heroes: what they do, which servants they can target.
    heroEffects: ['grantKeywordTemporarily', 'completeFusion', 'replayBattlecry'],
    targetFilters: ['companion', 'lacksKeyword', 'hasTrigger', 'copies'],
    // Animations that show a draw from a bag (diceRoll: a six-sided die, so a bag of six faces).
    bagAnimations: ['diceRoll'],
    // Where a choice takes its cards or options from.
    draws: ['reinforcement', 'rank', 'options'],
    // Kinds of options a choice can offer: a bonus drawn among stats, a power taken from the other survivors.
    optionKinds: ['statBoost', 'borrowPower'],
    // How a choice is shown.
    views: ['cardRow', 'optionList'],
    layouts: ['stack', 'columns'],
    widgets: ['catalogGrid', 'detail', 'zone', 'sideSummary', 'heroSlots', 'console', 'choiceOverlay', 'log', 'playbackControls', 'result', 'stats', 'typeChips', 'button'],
    // Names of animations the mod can attach to events.
    animations: ['pop', 'slide', 'shake', 'diceRoll', 'flash'],
    events: ['cardPlaced', 'resourceGained', 'choiceOpened', 'cardDiscarded', 'levelUp'],
    zoneLayouts: ['row', 'tray'],
    // Theme: the mod's CSS may only declare custom properties on these selectors.
    themeSelectors: [':root', ':root[data-theme]']
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = GAME_SCHEMA; else root.GAME_SCHEMA = GAME_SCHEMA;
})(typeof window !== 'undefined' ? window : globalThis);
