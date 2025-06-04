let currentViewId = null;
let zendeskUrl = null;
let notificationsEnabled = false;

browser.runtime.onInstalled.addListener(() => {
  startPolling();
});

browser.runtime.onStartup.addListener(() => {
  startPolling();
});

browser.browserAction.onClicked.addListener(() => {
  if (zendeskUrl && currentViewId) {
    const fullUrl = `https://${zendeskUrl}.zendesk.com/agent/filters/${currentViewId}`;
    browser.tabs.create({ url: fullUrl });
  }
});

browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === "fetchViews") {
    const { email, password, subdomain } = message;
    const credentials = btoa(`${email}:${password}`);

    try {
      const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/views.json`, {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        return { success: false, error: `Status ${response.status}` };
      }

      const data = await response.json();
      return { success: true, views: data.views };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

async function startPolling() {
  const { email, password, subdomain, viewId, notifications } = await browser.storage.local.get([
    "email", "password", "subdomain", "viewId", "notifications"
  ]);

  if (!email || !password || !subdomain || !viewId) return;

  currentViewId = viewId;
  zendeskUrl = subdomain;
  notificationsEnabled = notifications === true;
  let previousCount = null;

  async function poll() {
    const credentials = btoa(`${email}:${password}`);

    try {
      const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/views/${viewId}/count.json`, {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        console.error("Failed to fetch ticket count:", res.status);
        return;
      }

      const data = await res.json();
      const count = data.view_count && data.view_count.value ? data.view_count.value : 0;

      browser.browserAction.setBadgeText({ text: count > 0 ? count.toString() : "" });
      browser.browserAction.setTitle({ title: `${count} ticket(s) in your queue` });

      if (notificationsEnabled && previousCount !== null && count > previousCount) {
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon32.png",
          title: "New Zendesk Ticket(s)",
          message: `You have ${count} ticket(s) in your queue.`
        });
      }

      previousCount = count;

    } catch (err) {
      console.error("Polling error:", err);
    }
  }

  poll();
  setInterval(poll, 60 * 1000); // poll every 60 seconds
}
