import { useEffect } from 'react';
import useStore from './useStore';
import { saveProfileCloud } from '../services/social';

/**
 * Perfil propio: bio, handle, visibilidad y toggles.
 * - Local primero (h_bio, h_handle, h_visibility, ...), nube con debounce si hay login.
 * - Avatar: foto de Google salvo que pongas URL propia (h_avatar).
 */
export default function useProfile(name, auth) {
  const [bio, setBio] = useStore('h_bio', '');
  const [handle, setHandle] = useStore('h_handle', '');
  const [avatarUrl, setAvatarUrl] = useStore('h_avatar', '');
  const [visibility, setVisibility] = useStore('h_visibility', 'public'); // public | friends | private
  const [showStats, setShowStats] = useStore('h_show_stats', true);
  const [showNow, setShowNow] = useStore('h_show_now', true);

  const uid = auth?.user?.id || null;
  const googleAvatar = auth?.user?.user_metadata?.avatar_url || '';
  const avatar = avatarUrl || googleAvatar;
  const displayHandle = handle
    || (name ? `@${name.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 30)}` : (auth?.user?.email ? `@${auth.user.email.split('@')[0]}` : '@hermes'));

  useEffect(() => {
    if (!uid) return undefined;
    const t = setTimeout(() => {
      saveProfileCloud({
        handle: displayHandle,
        name,
        bio,
        avatar,
        visibility,
        showStats,
        showNowplaying: showNow,
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [uid, displayHandle, name, bio, avatar, visibility, showStats, showNow]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    bio, setBio,
    handle: displayHandle, setHandle,
    avatar, setAvatarUrl, googleAvatar,
    visibility, setVisibility,
    showStats, setShowStats,
    showNow, setShowNow,
  };
}
