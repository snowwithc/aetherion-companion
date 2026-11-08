/** Asset paths. Drop new files into /public/assets to replace any art - no code changes. */
export const cardImage = (cardId: string) => `/assets/cards/${cardId}.png`;
export const cardThumb = (cardId: string) => `/assets/cards/thumbs/${cardId}.webp`;
export const CARD_BACK = '/assets/card_back.png';
export const CARD_BACK_THUMB = '/assets/cards/thumbs/card_back.webp';
export const characterArt = (characterId: string) => `/assets/characters/${characterId}.png`;
export const characterModel = (characterId: string) => `/assets/models/${characterId}.glb`;
export const enemyArt = (enemyId: string) => `/assets/enemies/${enemyId}.png`;
