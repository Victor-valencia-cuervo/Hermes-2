// Compat: la app importaba de './music'. Ahora la lógica vive en './audius'.
// Se mantiene este módulo como re-export para no romper imports existentes.
export {
  searchTracks,
  trendingTracks,
  searchArtists,
  searchPlaylists,
  searchAll,
  getArtist,
  getArtistTracks,
  getPlaylist,
  streamUrl,
  AUDIUS_GENRES,
  TRENDING_TIMES,
  searchItunes,
} from './audius';
