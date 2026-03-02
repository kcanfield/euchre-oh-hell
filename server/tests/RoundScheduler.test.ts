import {
  getMaxHandSize,
  buildRoundSchedule,
  getTotalRounds,
} from '../src/game/RoundScheduler';

describe('getMaxHandSize()', () => {
  it('returns 10 for 3 players (floor(51/3)=17, capped at 10)', () => {
    expect(getMaxHandSize(3)).toBe(10);
  });

  it('returns 10 for 4 players (floor(51/4)=12, capped at 10)', () => {
    expect(getMaxHandSize(4)).toBe(10);
  });

  it('returns 10 for 5 players (floor(51/5)=10, exactly 10)', () => {
    expect(getMaxHandSize(5)).toBe(10);
  });

  it('returns 8 for 6 players (floor(51/6)=8)', () => {
    expect(getMaxHandSize(6)).toBe(8);
  });

  it('returns 7 for 7 players (floor(51/7)=7)', () => {
    expect(getMaxHandSize(7)).toBe(7);
  });

  it('returns 10 for 2 players (floor(51/2)=25, capped at 10)', () => {
    // min(10, 25) = 10
    expect(getMaxHandSize(2)).toBe(10);
  });

  it('throws an error for fewer than 2 players', () => {
    expect(() => getMaxHandSize(1)).toThrow('At least 2 players are required');
    expect(() => getMaxHandSize(0)).toThrow('At least 2 players are required');
  });
});

describe('buildRoundSchedule()', () => {
  it('builds correct schedule for 3 players: [10,9,...,1,...,9,10] (19 rounds)', () => {
    const schedule = buildRoundSchedule(3);
    const expected = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(schedule).toEqual(expected);
    expect(schedule).toHaveLength(19);
  });

  it('starts at max and ends at max for 3 players', () => {
    const schedule = buildRoundSchedule(3);
    expect(schedule[0]).toBe(10);
    expect(schedule[schedule.length - 1]).toBe(10);
  });

  it('has a minimum of 1 at the midpoint for 3 players', () => {
    const schedule = buildRoundSchedule(3);
    const mid = Math.floor(schedule.length / 2);
    expect(schedule[mid]).toBe(1);
  });

  it('builds correct schedule for 6 players: starts at 8, ends at 8 (15 rounds)', () => {
    const schedule = buildRoundSchedule(6);
    expect(schedule[0]).toBe(8);
    expect(schedule[schedule.length - 1]).toBe(8);
    expect(schedule).toHaveLength(15);
  });

  it('builds correct schedule for 7 players: starts at 7, ends at 7 (13 rounds)', () => {
    const schedule = buildRoundSchedule(7);
    expect(schedule[0]).toBe(7);
    expect(schedule[schedule.length - 1]).toBe(7);
    expect(schedule).toHaveLength(13);
  });

  it('schedule for 6 players descends from 8 to 1 then ascends back to 8', () => {
    const schedule = buildRoundSchedule(6);
    const expected = [8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(schedule).toEqual(expected);
  });

  it('schedule for 7 players descends from 7 to 1 then ascends back to 7', () => {
    const schedule = buildRoundSchedule(7);
    const expected = [7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7];
    expect(schedule).toEqual(expected);
  });

  it('contains 1 card round at the midpoint for any player count', () => {
    for (const playerCount of [3, 4, 5, 6, 7]) {
      const schedule = buildRoundSchedule(playerCount);
      const mid = Math.floor(schedule.length / 2);
      expect(schedule[mid]).toBe(1);
    }
  });

  it('schedule is symmetric around the midpoint', () => {
    const schedule = buildRoundSchedule(4);
    const mid = Math.floor(schedule.length / 2);
    for (let i = 0; i < mid; i++) {
      expect(schedule[i]).toBe(schedule[schedule.length - 1 - i]);
    }
  });
});

describe('getTotalRounds()', () => {
  it('returns 19 for 3 players', () => {
    expect(getTotalRounds(3)).toBe(19);
  });

  it('returns 19 for 4 players (maxHandSize=10, same as 3 players)', () => {
    expect(getTotalRounds(4)).toBe(19);
  });

  it('returns 19 for 5 players (maxHandSize=10)', () => {
    expect(getTotalRounds(5)).toBe(19);
  });

  it('returns 15 for 6 players (maxHandSize=8)', () => {
    expect(getTotalRounds(6)).toBe(15);
  });

  it('returns 13 for 7 players (maxHandSize=7)', () => {
    expect(getTotalRounds(7)).toBe(13);
  });

  it('matches buildRoundSchedule().length for all valid player counts', () => {
    for (const n of [3, 4, 5, 6, 7]) {
      expect(getTotalRounds(n)).toBe(buildRoundSchedule(n).length);
    }
  });
});
