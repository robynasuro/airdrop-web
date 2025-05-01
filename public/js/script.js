let editingAirdropId = null;

// Handle upload/edit form
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    const password = document.getElementById("password").value;
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const tier = document.getElementById("tier").value;
    const label = document.getElementById("label").value;
    const image = document.getElementById("image").files[0];

    const formData = new FormData();
    formData.append("password", password);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("tier", tier);
    formData.append("label", label);
    if (image) {
      formData.append("image", image);
    }

    try {
      const url = editingAirdropId ? `/api/airdrop/${editingAirdropId}` : "/api/airdrop/upload";
      const method = editingAirdropId ? "PUT" : "POST";
      console.log(`Sending ${method} request to ${url}`);
      const res = await fetch(url, {
        method: method,
        body: formData,
        signal: AbortSignal.timeout(10000),
      });
      console.log("Response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        const errorData = JSON.parse(errorText);
        if (res.status === 401) {
          throw new Error("Unauthorized: Incorrect admin password");
        }
        throw new Error(`HTTP error! Status: ${res.status} - ${errorData.error || errorText}`);
      }
      const data = await res.json();
      console.log("Response data:", data);
      const messageDiv = document.getElementById("uploadMessage");
      messageDiv.style.color = res.ok ? "green" : "red";
      messageDiv.textContent = data.message || data.error;
      if (res.ok) {
        loadAirdrops();
        resetForm();
      }
    } catch (err) {
      console.error("Error uploading/editing airdrop:", err);
      document.getElementById("uploadMessage").textContent = err.message;
      document.getElementById("uploadMessage").style.color = "red";
    }
});

// Function untuk load dan render daftar airdrop di Manage Airdrops
async function loadAirdrops() {
    try {
      const res = await fetch("/api/airdrop", { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      const manageList = document.getElementById("manageList");
      manageList.innerHTML = "";
      if (data.length === 0) {
        manageList.innerHTML = "<p>No airdrops available.</p>";
        return;
      }
      data.forEach(airdrop => {
        const dotClass = airdrop.status === "active" ? "dot-green" : "dot-red";
        const statusText = airdrop.status === "active" ? "Active" : "Ended";
        const div = document.createElement("div");
        div.className = "airdrop-item";
        div.innerHTML = `
          ${airdrop.image ? `<img src="${airdrop.image}" alt="${airdrop.title}" class="airdrop-image">` : ""}
          <h3>${airdrop.title} <span class="${dotClass}"></span> ${statusText}</h3>
          <p class="description">${airdrop.description}</p>
          <p><strong>Tier:</strong> ${airdrop.tier}</p>
          ${airdrop.label ? `<p><strong>Label:</strong> ${airdrop.label}</p>` : ""}
          <p><strong>Created:</strong> ${new Date(airdrop.createdAt).toLocaleString()}</p>
          <button class="toggle-status-btn" onclick="toggleStatus('${airdrop._id}', '${airdrop.status}')">
            ${airdrop.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <button class="edit-btn" onclick="editAirdrop('${airdrop._id}', '${airdrop.title}', \`${airdrop.description}\`, '${airdrop.tier}', '${airdrop.label || ''}')">Edit</button>
          <button class="delete-btn" onclick="deleteAirdrop('${airdrop._id}')">Delete</button>
        `;
        manageList.appendChild(div);
      });
    } catch (err) {
      console.error("Error fetching airdrops for manage:", err);
      document.getElementById("manageList").innerHTML = "<p>Error loading airdrops: " + err.message + "</p>";
    }
}

// Function untuk toggle status (active/inactive)
async function toggleStatus(id, currentStatus) {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await fetch(`/api/airdrop/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      if (res.ok) {
        console.log("Status updated:", data);
        loadAirdrops();
      } else {
        console.error("Error updating status:", data.error);
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
}

// Function untuk edit airdrop
function editAirdrop(id, title, description, tier, label) {
    editingAirdropId = id;
    document.getElementById("title").value = title;
    document.getElementById("description").value = description;
    document.getElementById("tier").value = tier;
    document.getElementById("label").value = label;
    document.getElementById("uploadForm").querySelector("button").textContent = "Update";
    document.querySelector("h2").textContent = "Edit Airdrop";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Function untuk reset form setelah edit/upload
function resetForm() {
    editingAirdropId = null;
    document.getElementById("uploadForm").reset();
    document.getElementById("uploadForm").querySelector("button").textContent = "Upload";
    document.getElementById("uploadMessage").textContent = "";
    document.querySelector("h2").textContent = "Upload Airdrop";
}

// Function untuk delete airdrop
async function deleteAirdrop(id) {
    if (!confirm("Are you sure you want to delete this airdrop?")) return;
    try {
      const res = await fetch(`/api/airdrop/${id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      if (res.ok) {
        console.log("Airdrop deleted:", data);
        loadAirdrops();
      } else {
        console.error("Error deleting airdrop:", data.error);
      }
    } catch (err) {
      console.error("Error deleting airdrop:", err);
    }
}

// Function untuk handle logout
async function handleLogout() {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      console.log("Logout successful:", data);
      window.location.href = "/index.html";
    } catch (err) {
      console.error("Error logging out:", err);
      alert("Error logging out: " + err.message);
    }
}

// Dark Mode Toggle
const darkModeToggle = document.getElementById("darkModeToggle");
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = darkModeToggle.querySelector("i");
    if (document.body.classList.contains("dark-mode")) {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
      localStorage.setItem("theme", "dark");
    } else {
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
      localStorage.setItem("theme", "light");
    }
});

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    darkModeToggle.querySelector("i").classList.remove("fa-moon");
    darkModeToggle.querySelector("i").classList.add("fa-sun");
}

loadAirdrops();