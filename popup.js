async function loadTickets(sortOrder = "newest") {
  const { email, password, subdomain, viewId } = await browser.storage.local.get([
    "email", "password", "subdomain", "viewId"
  ]);

  if (!email || !password || !subdomain || !viewId) {
    document.getElementById("ticketList").innerText = "Please set up your credentials in options.";
    return;
  }

  const credentials = btoa(`${email}:${password}`);
  try {
    const [ticketsRes, usersRes] = await Promise.all([
      fetch(`https://${subdomain}.zendesk.com/api/v2/views/${viewId}/tickets.json`, {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      }),
      fetch(`https://${subdomain}.zendesk.com/api/v2/users.json`, {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      })
    ]);

    if (!ticketsRes.ok || !usersRes.ok) throw new Error("Failed to load data");

    const ticketsData = await ticketsRes.json();
    const usersData = await usersRes.json();
    const usersMap = Object.fromEntries(usersData.users.map(u => [u.id, u.name]));

    const list = document.getElementById("ticketList");
    list.innerHTML = "";

    if (ticketsData.tickets.length === 0) {
      list.innerText = "No tickets in this view.";
      return;
    }

    ticketsData.tickets
      .sort((a, b) => {
        const aDate = new Date(a.updated_at);
        const bDate = new Date(b.updated_at);
        return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
      })
      .forEach(ticket => {
        const requester = usersMap[ticket.requester_id] || "Unknown";
        const updated = new Date(ticket.updated_at).toLocaleString();

        const link = document.createElement("a");
        link.href = `https://${subdomain}.zendesk.com/agent/tickets/${ticket.id}`;
        link.target = "_blank";
        link.style.display = "block";
        link.style.marginBottom = "8px";
        link.innerHTML = `
          <strong>#${ticket.id}</strong>: ${ticket.subject}<br>
          <small>Status: ${ticket.status} | Requester: ${requester} | Updated: ${updated}</small>
        `;
        list.appendChild(link);
      });
  } catch (e) {
    document.getElementById("ticketList").innerText = "Error loading ticket data.";
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const sortSelect = document.getElementById("sortSelect");

  const storedSort = await browser.storage.local.get("sortOrder");
  const sortOrder = storedSort.sortOrder || "newest";
  sortSelect.value = sortOrder;
  loadTickets(sortOrder);

  sortSelect.addEventListener("change", async () => {
    const newSortOrder = sortSelect.value;
    await browser.storage.local.set({ sortOrder: newSortOrder });
    loadTickets(newSortOrder);
  });
});