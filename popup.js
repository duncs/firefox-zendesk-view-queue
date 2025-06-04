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
    const [ticketsRes] = await Promise.all([
      fetch(`https://${subdomain}.zendesk.com/api/v2/views/${viewId}/tickets.json`, {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      }),
    ]);

    if (!ticketsRes.ok ) throw new Error("Failed to load data");

    const ticketsData = await ticketsRes.json();

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
      .forEach(async (ticket) => {

        const [userInfoRes] = await Promise.all([
            fetch(`https://${subdomain}.zendesk.com/api/v2/users/${ticket.requester_id}`, {
                headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json"
                }
            })
        ]);
        userInfo = await userInfoRes.json()

        const requester = userInfo.user.name || "Unknown";
        const updated = new Date(ticket.updated_at).toLocaleString();

        // Add in a DIV, put a link inside the div and the additional info without an url on it
        const table_row = document.createElement("div");

        const link = document.createElement("a");
        link.href = `https://${subdomain}.zendesk.com/agent/tickets/${ticket.id}`;
        link.target = "_blank";
        link.style.display = "block";
        //link.style.marginBottom = "8px";

        const strong = document.createElement("strong")
        strong.innerText=`#${ticket.id}`

        link.appendChild( strong )

        const subject = document.createTextNode(`: ${ticket.subject}`)
        link.appendChild( subject )

        table_row.appendChild(link)

        const small = document.createElement("small")
        small.innerText = `Status: ${ticket.status} | Requester: ${requester} | Updated: ${updated}`

        table_row.appendChild(small)

        list.appendChild(table_row);
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
