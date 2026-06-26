import { describe, it, expect, beforeEach } from 'vitest';
import { createHistoryStore, TemporalStoreActions } from './history.js';

describe('TemporalHistory Middleware', () => {
    let store: TemporalStoreActions<string>;

    // We initialize a fresh store tracking a simple string before every single test
    beforeEach(() => {
        store = createHistoryStore('State 1');
    });

    it('initializes with the correct baseline state', () => {
        const history = store.getHistory();
        expect(store.present).toBe('State 1');
        expect(history.past).toEqual([]);
        expect(history.future).toEqual([]);
    });

    it('pushes to past and updates present on set()', () => {
        store.set('State 2');
        const history = store.getHistory();
        
        expect(store.present).toBe('State 2');
        expect(history.past).toEqual(['State 1']);
        expect(history.future).toEqual([]);
    });

    it('ignores identical consecutive state updates', () => {
        store.set('State 1');
        const history = store.getHistory();
        
        // The past stack shouldn't grow if the state didn't actually change
        expect(history.past.length).toBe(0);
    });

    it('performs undo() correctly', () => {
        store.set('State 2');
        store.set('State 3');
        
        store.undo();
        
        const history = store.getHistory();
        expect(store.present).toBe('State 2');
        expect(history.past).toEqual(['State 1']);
        expect(history.future).toEqual(['State 3']); // 3 is moved to the future
    });

    it('performs redo() correctly', () => {
        store.set('State 2');
        store.set('State 3');
        
        store.undo(); // present is 'State 2', future is ['State 3']
        store.redo();
        
        const history = store.getHistory();
        expect(store.present).toBe('State 3');
        expect(history.past).toEqual(['State 1', 'State 2']);
        expect(history.future).toEqual([]);
    });

    it('does nothing when undoing at the beginning of time (Boundary Check)', () => {
        store.undo(); // Try to undo the initial state
        const history = store.getHistory();
        
        expect(store.present).toBe('State 1');
        expect(history.past).toEqual([]);
    });

    it('does nothing when redoing at the end of time (Boundary Check)', () => {
        store.set('State 2');
        store.redo(); // Try to redo when nothing has been undone
        
        const history = store.getHistory();
        expect(store.present).toBe('State 2');
        expect(history.future).toEqual([]);
    });

    it('clears the future timeline when branching time', () => {
        store.set('State 2');
        store.set('State 3'); 
        
        // Timeline: [1, 2] -> present(3) -> future[]
        store.undo();   
        // Timeline: [1] -> present(2) -> future[3]
        
        store.set('State 4'); // The user makes a new change, destroying the old future
        
        const history = store.getHistory();
        expect(store.present).toBe('State 4');
        expect(history.past).toEqual(['State 1', 'State 2']);
        expect(history.future).toEqual([]); // 'State 3' is erased forever
    });

    // ── Object state deduplication ──────────────────────────────────────

    it('does not push duplicate entries for structurally equal object states', () => {
        const objectStore = createHistoryStore({ count: 0 });

        objectStore.set({ count: 0 }); // different reference, identical content
        objectStore.set({ count: 0 }); // again

        const history = objectStore.getHistory();
        expect(history.past.length).toBe(0); // was 2 before the fix
    });

    it('does push an entry when object content actually changes', () => {
        const objectStore = createHistoryStore({ count: 0 });

        objectStore.set({ count: 1 }); // genuinely different content

        const history = objectStore.getHistory();
        expect(history.past.length).toBe(1);
        expect(objectStore.present).toEqual({ count: 1 });
    });

    it('does not push duplicate entries for structurally equal array states', () => {
        const arrayStore = createHistoryStore([1, 2, 3]);

        arrayStore.set([1, 2, 3]); // new array reference, same content

        const history = arrayStore.getHistory();
        expect(history.past.length).toBe(0);
    });

    it('accepts a custom equals function for non-serialisable types', () => {
        const mapStore = createHistoryStore(
            new Map([['x', 1]]),
            {
                equals: (a, b) =>
                    a.size === b.size &&
                    [...a.entries()].every(([k, v]) => b.get(k) === v),
            }
        );

        mapStore.set(new Map([['x', 1]])); // same content, different reference

        const history = mapStore.getHistory();
        expect(history.past.length).toBe(0);
    });
});
describe('TemporalHistory — canUndo / canRedo', () => {
    it('canUndo is false on a fresh store', () => {
        const store = createHistoryStore('init');
        expect(store.canUndo).toBe(false);
    });

    it('canRedo is false on a fresh store', () => {
        const store = createHistoryStore('init');
        expect(store.canRedo).toBe(false);
    });

    it('canUndo is true after set()', () => {
        const store = createHistoryStore('a');
        store.set('b');
        expect(store.canUndo).toBe(true);
    });

    it('canRedo is true after undo()', () => {
        const store = createHistoryStore('a');
        store.set('b');
        store.undo();
        expect(store.canRedo).toBe(true);
    });

    it('canUndo is false after undoing all the way back', () => {
        const store = createHistoryStore('a');
        store.set('b');
        store.undo();
        expect(store.canUndo).toBe(false);
    });

    it('canRedo is false after redo() reaches the end', () => {
        const store = createHistoryStore('a');
        store.set('b');
        store.undo();
        store.redo();
        expect(store.canRedo).toBe(false);
    });
});

describe('TemporalHistory — maxLength', () => {
    it('past[] does not exceed maxLength', () => {
        const store = createHistoryStore('s0', { maxLength: 3 });
        store.set('s1');
        store.set('s2');
        store.set('s3');
        store.set('s4'); // 4th push — oldest should be evicted

        const h = store.getHistory();
        expect(h.past.length).toBe(3);
    });

    it('evicts the oldest entry when maxLength is exceeded', () => {
        const store = createHistoryStore('s0', { maxLength: 3 });
        store.set('s1');
        store.set('s2');
        store.set('s3');
        store.set('s4');

        const h = store.getHistory();
        // s0 evicted — past keeps the 3 most recent entries before present
        // past: ['s1','s2','s3'], present: 's4'
        expect(h.past).toEqual(['s1', 's2', 's3']);
        expect(store.present).toBe('s4');
    });

    it('undo() still works correctly after eviction', () => {
        const store = createHistoryStore('s0', { maxLength: 2 });
        store.set('s1');
        store.set('s2');
        store.set('s3'); // s0 evicted — past is [s1, s2], present is s3

        store.undo();
        expect(store.present).toBe('s2');

        store.undo();
        expect(store.present).toBe('s1');

        // s0 is gone — can't undo further
        expect(store.canUndo).toBe(false);
    });

    it('without maxLength, past[] grows unbounded', () => {
        const store = createHistoryStore('s0'); // no maxLength
        for (let i = 1; i <= 10; i++) store.set(`s${i}`);
        expect(store.getHistory().past.length).toBe(10);
    });

    it('maxLength of 1 keeps only the single most recent past state', () => {
        const store = createHistoryStore('s0', { maxLength: 1 });
        store.set('s1');
        store.set('s2');
        store.set('s3');

        const h = store.getHistory();
        expect(h.past.length).toBe(1);
        expect(h.past[0]).toBe('s2');
        expect(store.present).toBe('s3');
    });
});