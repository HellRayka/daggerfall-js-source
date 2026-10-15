import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeapon } from '../src/combat/enemyEquipment.js';
import { itemWeight, totalWeight, goldStack } from '../src/systems/inventory.js';
import { planStore, planTake } from '../src/systems/itemTransfer.js';
import { itemStacks, stackTransferItem, applyItemStackTransfer } from '../src/systems/itemStacks.js';
import { NativeInventoryWindow } from '../src/ui/nativeInventory.js';
import { mountEnhancedInventory } from '../src/ui/enhancedInventory.js';
import { withDom } from './invdrag.mjs';

const dagger = () => ({ group: 'Weapons', ...createWeapon(113, 0, () => 0.5) });
const copies = (n, item = dagger()) => Array.from({ length: n }, () => structuredClone(item));
const entity = (items = []) => ({ name: 'Hero', stats: { strength: 50 }, items });
const icons = { getTexture: async () => ({ recordCount: 0 }), uploadRecord: () => {}, textures: new Map() };
const native = (e, extra = {}) => new NativeInventoryWindow({ entity: e, items: () => e.items, icons, ...extra });

function pack(items, extra, run) {
  withDom((dom) => {
    const host = dom.mk('div'); dom.body.append(host);
    const e = entity(items);
    const view = mountEnhancedInventory(host, { entity: e, items: () => e.items, onExit: () => {}, ...extra });
    try { run({ dom, host, e, view }); } finally { view.unmount(); }
  });
}
const button = (host, text) => host.querySelectorAll('button').find((b) => b.textContent === text);
const quantity = (host) => host.querySelectorAll('input').find((n) => n.attrs?.['aria-label']?.startsWith('Pick how many'));

test('identical items: a thousand producer-minted weapons share one row, including after a save round trip', () => {
  const list = copies(1000), saved = JSON.stringify(list), weight = totalWeight(list);
  for (const items of [list, JSON.parse(saved)]) {
    const view = itemStacks(items);
    assert.equal(view.items.length, 1);
    assert.equal(view.items[0], items[0]);
    assert.equal(view.count(items[0]), 1000);
    assert.equal(view.members(items[0]).length, 1000);
    assert.equal(totalWeight(items), weight);
    assert.equal(JSON.stringify(items), saved, 'a view never rewrites an item or save');
  }
});

test('identical items: every item field participates, including nested enchantments and future mod state', () => {
  const original = { ...dagger(), enchantments: [{ type: 1, param: 5 }], sockets: [{ gem: 'ruby', rank: 1 }] };
  const changes = {
    group: 'Armor', templateIndex: 114, name: 'Renamed', material: 1, currentCondition: 1, maxCondition: 99,
    variant: 2, dyeColor: 1, flags: 8, value: 999, weightInKg: 3, message: 1, potionRecipeKey: 2,
    timeForItemToDisappear: 30, locked: true, bound: true, identified: false, patronCounterPiece: true,
    enchantments: [{ type: 1, param: 6 }], customEnchantments: [{ type: 2, param: 9 }],
    sockets: [{ gem: 'ruby', rank: 2 }], futureModState: { charges: 7 },
  };
  for (const [key, value] of Object.entries(changes)) {
    assert.equal(itemStacks([original, { ...structuredClone(original), [key]: value }]).items.length, 2, key);
  }
  const reversedKeys = Object.fromEntries(Object.entries(structuredClone(original)).reverse());
  assert.equal(itemStacks([original, reversedKeys]).items.length, 1, 'field order has no meaning');
  assert.equal(itemStacks([original, { ...structuredClone(original), stackCount: 12 }]).count(original), 13);
});

test('identical items: equipped, quest, held and reward items stay individual; live objects never merge', () => {
  const held = dagger(), a = dagger(), b = dagger();
  const list = [held, a, b];
  assert.deepEqual(itemStacks(list, { separate: [held] }).items, [held, a]);
  assert.deepEqual(itemStacks(list, { enabled: false }).items, list);
  for (const field of [{ equipSlot: 4 }, { questItem: true }]) assert.equal(itemStacks(copies(2, { ...a, ...field })).items.length, 2);
  const cycle = dagger(); cycle.owner = cycle;
  assert.equal(itemStacks([cycle, cycle]).items.length, 2);
  assert.equal(itemStacks([{ ...a, mod: new Map() }, { ...a, mod: new Map() }]).items.length, 2);
});

test('identical items: a partial group transfer preserves the originals, enchantments, quantity and total weight', () => {
  const from = copies(3, { ...dagger(), enchantments: [{ type: 1, param: 5 }], sockets: [{ gem: 'ruby' }] });
  const originals = [...from], to = [], weight = totalWeight(from);
  const plan = planStore(stackTransferItem(from, from[0]), { remote: to });
  assert.equal(plan.amount, 3);
  const first = applyItemStackTransfer(from[0], { ...plan, amount: 2 }, from, to);
  assert.equal(first, originals[0]);
  assert.deepEqual(to, originals.slice(0, 2));
  assert.deepEqual(from, originals.slice(2));
  assert.equal(totalWeight(from) + totalWeight(to), weight);
  to[0].enchantments[0].param = 99;
  assert.equal(to[1].enchantments[0].param, 5);
  assert.equal(from[0].enchantments[0].param, 5);
  assert.equal(applyItemStackTransfer(originals[0], { amount: 1 }, from, to), null, 'a stale row never duplicates an item');
});

test('identical items: existing physical stacks split normally and gold still enters the counter', () => {
  const from = [goldStack(20), goldStack(30)], e = entity(), to = e.items;
  const plan = planTake(stackTransferItem(from, from[0]), { bag: to, entity: e, mode: 'remove' });
  assert.equal(plan.amount, 50);
  assert.equal(applyItemStackTransfer(from[0], { ...plan, amount: 25 }, from, to, { entity: e, toPlayer: true }), null);
  assert.equal(e.goldPieces, 25);
  assert.equal(from.length, 1);
  assert.equal(from[0].stackCount, 25);
  assert.deepEqual(to, []);
});

test('identical items: classic pack and container rows, capacity and Control quantity operate on the same group', () => {
  const e = entity(copies(3)), stored = [], originals = [...e.items];
  const w = native(e, { wagonItems: () => stored });
  w.usingWagon = true;
  assert.equal(w._filtered().length, 1);
  w.input('ControlLeft');
  w._pick(0, 'remove');
  assert.equal(w.inputBox.label, 'Pick how many items (max 3)?');
  w.inputBox.onSubmit('2');
  assert.deepEqual(stored, originals.slice(0, 2));
  assert.deepEqual(e.items, originals.slice(2));
  assert.equal(w._remoteRows().length, 1);
  const preview = planStore(stackTransferItem(stored, stored[0]), { remote: [], usingWagon: true, wagonKg: itemWeight(stored[0]) });
  assert.equal(preview.amount, 1, 'weight limits count individual units, not rows');
  w._controlDown = false;
  w._pickRemote(0, 'remove');
  assert.equal(e.items.length, 3);
  assert.equal(stored.length, 0);
});

test('identical items: classic equip changes one original, and a changed condition separates its row', () => {
  const e = entity(copies(3)), w = native(e);
  w._pick(0, 'equip');
  assert.equal(e.items.filter((it) => it.equipSlot != null).length, 1);
  assert.equal(e.items.length, 3);
  assert.equal(w._filtered().length, 1);
  const unworn = e.items.filter((it) => it.equipSlot == null);
  unworn[0].currentCondition--;
  assert.equal(w._filtered().length, 2);
});

test('identical items: enhanced pack renders one tile for a thousand originals and wearing isolates one', () => {
  pack(copies(1000), {}, ({ host, e }) => {
    const rows = host.querySelectorAll('.itemrow');
    assert.equal(rows.length, 1, 'the expensive DOM rows, not just the badge, are reduced');
    assert.equal(rows[0].querySelector('.count').textContent, '1000');
    rows[0].onclick({ timeStamp: 1 });
    button(host, 'Wear').onclick();
    assert.equal(e.items.length, 1000);
    assert.equal(e.items.filter((it) => it.equipSlot != null).length, 1);
    assert.equal(host.querySelector('.itemrow').querySelector('.count').textContent, '999');
  });
});

test('identical items: enhanced quantity moves selected originals and a loot row takes its whole group', () => {
  const originals = copies(3);
  pack(originals, {}, ({ host, view, e }) => {
    host.querySelector('.itemrow').onclick({ timeStamp: 1 });
    const field = quantity(host);
    assert.equal(field.value, '3');
    field.value = '2'; field.oninput();
    button(host, 'Drop').onclick();
    assert.equal(e.items.length, 1);
    assert.equal(view.dropped().length, 2);
    assert.equal(host.querySelectorAll('.itemrow').length, 2, 'one pack row, one ground row');
  });
  const loot = copies(4);
  pack([], { loot: { items: () => loot } }, ({ host, e }) => {
    assert.equal(host.querySelectorAll('.itemrow').length, 1);
    host.querySelector('.itemrow').onclick({ timeStamp: 1 });
    assert.equal(loot.length, 0);
    assert.equal(e.items.length, 4);
  });
});

test('identical items: both skins physically drop the whole displayed group in one batch', () => {
  const e = entity(copies(3)), drops = [], w = native(e, { physicalDrop: (items) => drops.push(items) });
  w._physicalDrop(0);
  assert.equal(e.items.length, 0);
  assert.equal(drops.length, 1);
  assert.equal(drops[0].length, 3);
  pack(copies(3), { physicalDropOn: () => true, physicalDrop: (items) => drops.push(items) }, ({ host, e: player }) => {
    host.querySelector('.itemrow').onclick({ shiftKey: true });
    assert.equal(player.items.length, 0);
    assert.equal(drops.length, 2);
    assert.equal(drops[1].length, 3);
  });
});
