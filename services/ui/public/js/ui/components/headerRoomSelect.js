import { roomApi } from "/js/api/roomApi.js";
import { getEffectiveRoomId, setSelectedRoomId } from "/js/ui/utils/roomSelection.js";

async function initHeaderRoomSelect() {
  const select = document.getElementById("room-select");
  if (!select) return;

  const apiUrl = document.documentElement.dataset.apiUrl || "/api";

  let currentRoomId = getEffectiveRoomId();

  try {
    const rooms = await roomApi.getMyRooms(apiUrl);

    select.innerHTML = "";
    (rooms || []).forEach((r) => {
      const opt = document.createElement("option");
      opt.value = String(r.id);
      opt.textContent = r && r.name ? String(r.name) : String(r.id);
      select.appendChild(opt);
    });

    if (!currentRoomId && rooms && rooms.length) {
      const arena = (rooms || []).find((r) => r && String(r.name || "").toLowerCase() === "arena");
      if (arena && arena.id) currentRoomId = String(arena.id);
      else if (rooms[0] && rooms[0].id) currentRoomId = String(rooms[0].id);
    }

    if (currentRoomId) {
      select.value = String(currentRoomId);
      setSelectedRoomId(String(currentRoomId));
    }

    select.addEventListener("change", () => {
      const next = select.value ? String(select.value) : "";
      setSelectedRoomId(next);
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("room_id", next);
      else url.searchParams.delete("room_id");
      window.location.href = url.toString();
    });
  } catch (e) {
    // ignore
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initHeaderRoomSelect();
});
