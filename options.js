document.getElementById("save").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const subdomain = document.getElementById("subdomain").value;
  const viewId = document.getElementById("viewSelect").value;

  await browser.storage.local.set({ email, password, subdomain, viewId });
  alert("Settings saved.");
});

document.getElementById("subdomain").addEventListener("blur", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const subdomain = document.getElementById("subdomain").value;

  if (email && password && subdomain) {
    fetchViews(email, password, subdomain);
  }
});

async function fetchViews(email, password, subdomain) {
  try {
    const result = await browser.runtime.sendMessage({
      type: "fetchViews",
      email,
      password,
      subdomain
    });

    if (!result.success) {
      alert("Failed to fetch views: " + result.error);
      return;
    }

    const viewSelect = document.getElementById("viewSelect");
    viewSelect.innerHTML = "";

    result.views.forEach(view => {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = view.title;
      viewSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Messaging failed:", err);
    alert("Extension error: could not contact background script.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await browser.storage.local.get(["email", "password", "subdomain", "viewId"]);

  if (stored.email) document.getElementById("email").value = stored.email;
  if (stored.password) document.getElementById("password").value = stored.password;
  if (stored.subdomain) {
    document.getElementById("subdomain").value = stored.subdomain;

    if (stored.email && stored.password) {
      const result = await browser.runtime.sendMessage({
        type: "fetchViews",
        email: stored.email,
        password: stored.password,
        subdomain: stored.subdomain
      });

      if (result.success) {
        const viewSelect = document.getElementById("viewSelect");
        viewSelect.innerHTML = "";

        result.views.forEach(view => {
          const option = document.createElement("option");
          option.value = view.id;
          option.textContent = view.title;
          if (view.id == stored.viewId) {
            option.selected = true;
          }
          viewSelect.appendChild(option);
        });
      }
    }
  }
});


document.addEventListener("DOMContentLoaded", async () => {
  const stored = await browser.storage.local.get(["notifications"]);
  if (stored.notifications) {
    document.getElementById("notifications").checked = true;
  }
});

document.getElementById("save").addEventListener("click", async () => {
  const notifications = document.getElementById("notifications").checked;
  await browser.storage.local.set({ notifications });
});