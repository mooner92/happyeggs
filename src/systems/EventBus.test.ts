import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './EventBus';

interface TestEvents {
  ping: { n: number };
  empty: undefined;
}

describe('EventBus', () => {
  it('on/emit — 페이로드가 모든 리스너에 전달된다', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('ping', a);
    bus.on('ping', b);
    bus.emit('ping', { n: 7 });
    expect(a).toHaveBeenCalledExactlyOnceWith({ n: 7 });
    expect(b).toHaveBeenCalledExactlyOnceWith({ n: 7 });
  });

  it('off 이후에는 호출되지 않는다', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    bus.on('ping', fn);
    bus.off('ping', fn);
    bus.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('on이 반환한 unsubscribe로도 해제된다', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    const unsub = bus.on('ping', fn);
    unsub();
    bus.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('emit 중 off가 일어나도 안전하다 (스냅샷 순회)', () => {
    const bus = new EventBus<TestEvents>();
    const b = vi.fn();
    const a = vi.fn(() => bus.off('ping', b));
    bus.on('ping', a);
    bus.on('ping', b);
    // 첫 emit: a가 b를 해제하지만, 이번 회차 스냅샷의 b는 그대로 호출된다
    bus.emit('ping', { n: 1 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    // 다음 emit부터 b는 빠진다
    bus.emit('ping', { n: 2 });
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('리스너 없는 이벤트 emit은 no-op이다', () => {
    const bus = new EventBus<TestEvents>();
    expect(() => bus.emit('empty', undefined)).not.toThrow();
  });

  it('clear로 전부 해제된다', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    bus.on('ping', fn);
    bus.clear();
    bus.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
  });
});
