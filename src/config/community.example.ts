import type { Community, Emotes } from '../types/index.js';

/**
 * Configuración de la comunidad del canal
 * Copia este archivo a community.ts y personaliza con tu comunidad
 */

export const COMMUNITY: Community = {
  // Usuarios VIP especiales (tratamiento de "realeza")
  reina: ['tu_usuario_especial'],

  // Moderadores del canal
  mods: ['mod1', 'mod2', 'mod3'],

  // VIPs del canal
  vips: ['vip1', 'vip2', 'vip3'],

  // Suscriptores destacados
  subs: ['sub1', 'sub2', 'sub3'],

  // Usuarios que han regalado subs { username: cantidad }
  gifters: { 'gifter1': 5, 'gifter2': 2 },

  // Bots conocidos (para ignorar o tratar diferente)
  bots: ['streamelements', 'streamlabs', 'nightbot', 'tu_bot'],
};

/**
 * Emotes del canal organizados por categoría
 */
export const EMOTES: Emotes = {
  happy: ['canalFeliz', 'canalHappy'],
  love: ['canalCorazon', 'canalLove'],
  clap: ['canalClap', 'canalGG'],
  sad: ['canalSad', 'canalCry'],
  funny: ['canalLOL', 'canalJaja'],
  rock: ['canalRock', 'canalMetal'],
};

/**
 * Usuarios VIP especiales (sin límites, piropos automáticos)
 */
export const VIP_USERS: string[] = ['usuario_especial_1', 'usuario_especial_2'];

/**
 * Usuarios bajo vigilancia especial
 */
export const WATCHED_USERS: string[] = [];
