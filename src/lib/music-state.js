export const MUSIC_AVAILABILITY = Object.freeze({
  STREAMING: 'streaming',
  DOWNLOADED: 'downloaded',
  OFFLINE_UNAVAILABLE: 'offline_unavailable',
  UNAVAILABLE: 'unavailable',
});

export function getAvailabilityLabel(availability) {
  switch (availability) {
    case MUSIC_AVAILABILITY.DOWNLOADED:
      return 'Descargada';
    case MUSIC_AVAILABILITY.STREAMING:
      return 'En streaming';
    case MUSIC_AVAILABILITY.OFFLINE_UNAVAILABLE:
      return 'No disponible sin conexión';
    case MUSIC_AVAILABILITY.UNAVAILABLE:
      return 'No disponible';
    default:
      return 'Sin estado';
  }
}

export function resolveTrackAvailability(track) {
  if (!track) return MUSIC_AVAILABILITY.UNAVAILABLE;

  if (track.source === 'Local') {
    if (track.downloaded || track.localAvailable || track.available === true) return MUSIC_AVAILABILITY.DOWNLOADED;
    if (track.available === false) return MUSIC_AVAILABILITY.OFFLINE_UNAVAILABLE;
    return MUSIC_AVAILABILITY.DOWNLOADED;
  }

  if (track.source === 'YouTube') {
    if (track.downloaded || track.localAvailable) return MUSIC_AVAILABILITY.DOWNLOADED;
    if (track.unavailable || track.videoBlocked || track.available === false) return MUSIC_AVAILABILITY.UNAVAILABLE;
    return MUSIC_AVAILABILITY.STREAMING;
  }

  if (track.source === 'Audius') {
    if (track.downloaded || track.localAvailable) return MUSIC_AVAILABILITY.DOWNLOADED;
    if (track.streamable === false || track.unavailable || track.available === false) return MUSIC_AVAILABILITY.UNAVAILABLE;
    return MUSIC_AVAILABILITY.STREAMING;
  }

  if (track.downloaded || track.localAvailable) return MUSIC_AVAILABILITY.DOWNLOADED;
  if (track.available === false) return MUSIC_AVAILABILITY.OFFLINE_UNAVAILABLE;
  return MUSIC_AVAILABILITY.STREAMING;
}

export function normalizeTrackState(track) {
  if (!track) return null;

  const availability = track.availability || resolveTrackAvailability(track);
  const source = track.source || 'YouTube';

  return {
    ...track,
    source,
    availability,
    availabilityLabel: getAvailabilityLabel(availability),
    libraryState: track.libraryState || (source === 'Local' ? 'downloaded' : 'saved'),
    downloaded: Boolean(track.downloaded || track.localAvailable || source === 'Local'),
    localAvailable: Boolean(track.localAvailable || source === 'Local'),
  };
}
