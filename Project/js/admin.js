const destName = document.getElementById("destName");
const pointCount = document.getElementById("pointCount");
const undoPointBtn = document.getElementById("undoPointBtn");
const savePointBtn = document.getElementById("savePointBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const destList = document.getElementById("destList");

let recorded = [];
let editingId = null;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderPoints() {
  pointCount.textContent = `${recorded.length} point${recorded.length === 1 ? "" : "s"} recorded`;
  const entrance = window.campus.getEntrance();
  if (recorded.length && entrance) {
    window.campus.showRoute([entrance, ...recorded]);
  } else {
    window.campus.clearRouteElements();
  }
}

function resetForm() {
  recorded = [];
  editingId = null;
  destName.value = "";
  savePointBtn.textContent = "💾 Save destination";
  renderPoints();
}

async function api(body) {
  const res = await fetch("api/destination.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function renderList() {
  destList.innerHTML = "";
  Object.entries(window.campus.getDestinations()).forEach(([id, d]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span></span><div><button type="button" class="mini" data-act="edit">Edit</button><button type="button" class="mini danger" data-act="delete">Delete</button></div>`;
    li.querySelector("span").textContent = d.label;
    li.querySelector('[data-act="edit"]').onclick = () => {
      editingId = id;
      destName.value = d.label;
      recorded = d.route.map((p) => [...p]);
      savePointBtn.textContent = "💾 Update destination";
      renderPoints();
    };
    li.querySelector('[data-act="delete"]').onclick = async () => {
      if (!confirm(`Delete "${d.label}"?`)) return;
      try {
        await api({ action: "delete", id });
        await window.campus.loadDestinations();
        renderList();
        if (editingId === id) resetForm();
      } catch (e) {
        alert(e.message);
      }
    };
    destList.appendChild(li);
  });
}

window.onModelPick = (point) => {
  recorded.push(point);
  renderPoints();
};

undoPointBtn.addEventListener("click", () => {
  recorded.pop();
  renderPoints();
});

resetFormBtn.addEventListener("click", resetForm);

savePointBtn.addEventListener("click", async () => {
  const label = destName.value.trim();
  if (!label) return alert("Enter a building name.");
  if (recorded.length < 1)
    return alert("Click the model to record at least one point.");

  try {
    await api({
      action: "save",
      id: editingId || slugify(label),
      label,
      route: recorded,
    });
    await window.campus.loadDestinations();
    renderList();
    resetForm();
  } catch (e) {
    alert(e.message);
  }
});

// Wait for the first load, then show the existing list
(async function init() {
  await window.campus.loadDestinations();
  renderList();
  renderPoints();
})();
