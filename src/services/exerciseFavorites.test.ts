// jest.mock wordt door babel-jest boven de imports gehesen.
import { getFavoriteExerciseIds, toggleFavoriteExercise } from './exerciseFavorites';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null),
    setItem: async (k: string, v: string) => { mockStore.set(k, v); },
    removeItem: async (k: string) => { mockStore.delete(k); },
  },
}));

beforeEach(() => mockStore.clear());

describe('exerciseFavorites', () => {
  it('zet de oude gedeelde lijst eenmalig over naar de eerste gebruiker en ruimt hem op', async () => {
    mockStore.set('exercise_favorites', JSON.stringify(['bench']));
    expect(await getFavoriteExerciseIds('a')).toEqual(['bench']);
    expect(mockStore.has('exercise_favorites')).toBe(false);
    // Een tweede account op hetzelfde toestel ziet die lijst niet.
    expect(await getFavoriteExerciseIds('b')).toEqual([]);
    expect(await getFavoriteExerciseIds('a')).toEqual(['bench']);
  });

  it('houdt favorieten per gebruiker gescheiden', async () => {
    await toggleFavoriteExercise('a', 'squat');
    expect(await getFavoriteExerciseIds('a')).toEqual(['squat']);
    expect(await getFavoriteExerciseIds('b')).toEqual([]);
    expect(await toggleFavoriteExercise('a', 'squat')).toEqual([]);
  });
});
