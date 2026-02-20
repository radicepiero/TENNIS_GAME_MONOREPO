const STORAGE_KEY = "selected_room_id";

export function getSelectedRoomId() {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v ? String(v) : "";
  } catch (e) {
    return "";
  }
}

export function setSelectedRoomId(roomId) {
  try {
    if (!roomId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, String(roomId));
  } catch (e) {}
}

export function getRoomIdFromQueryString() {
  try {
    const qs = new URLSearchParams(window.location.search || "");
    return String(qs.get("room_id") || qs.get("roomId") || "");
  } catch (e) {
    return "";
  }
}

export function getEffectiveRoomId() {
  return getRoomIdFromQueryString() || getSelectedRoomId();
}
