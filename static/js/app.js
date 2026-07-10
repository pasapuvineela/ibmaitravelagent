(() => {
  const html = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("roamly-theme") || "light";
  html.setAttribute("data-bs-theme", savedTheme);

  const syncThemeIcon = () => {
    const icon = themeToggle?.querySelector("i");
    if (icon) icon.className = html.getAttribute("data-bs-theme") === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
  };
  syncThemeIcon();
  themeToggle?.addEventListener("click", () => {
    const next = html.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-bs-theme", next);
    localStorage.setItem("roamly-theme", next);
    syncThemeIcon();
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible"));
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

  const showToast = (message, isError = false) => {
    const toastElement = document.getElementById("appToast");
    if (!toastElement) return;
    toastElement.querySelector("span").textContent = message;
    toastElement.querySelector("i").className = isError ? "bi bi-exclamation-circle-fill text-danger" : "bi bi-check-circle-fill text-success";
    bootstrap.Toast.getOrCreateInstance(toastElement).show();
  };

  document.querySelectorAll(".needs-validation").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add("was-validated");
    });
  });

  const plannerForm = document.getElementById("plannerForm");
  if (plannerForm) {
    const destinationParam = new URLSearchParams(window.location.search).get("destination");
    if (destinationParam) document.getElementById("destination").value = destinationParam;
    plannerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!plannerForm.checkValidity()) return;
      const overlay = document.getElementById("generationOverlay");
      overlay.classList.add("show");
      overlay.setAttribute("aria-hidden", "false");
      const user = JSON.parse(localStorage.getItem("roamly-user") || "{}");
      const formData = new FormData(plannerForm);
      const payload = {
        destination: formData.get("destination"),
        days: Number(formData.get("days")),
        budget: formData.get("budget"),
        travelType: formData.get("travelType"),
        activities: formData.getAll("activities"),
        food: formData.get("food"),
        transport: formData.get("transport"),
        email: user.email
      };
      try {
        let response = await fetch("/api/generate-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (response.status === 404) response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to generate your itinerary.");
        localStorage.setItem("roamly-current-plan", JSON.stringify(data.plan));
        localStorage.setItem("roamly-last-input", JSON.stringify(payload));
        window.location.href = "/result";
      } catch (error) {
        overlay.classList.remove("show");
        showToast(error.message, true);
      }
    });
  }

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const listHtml = (items = []) => `<ul class="check-list">${items.map((item) => `<li><i class="bi bi-check2"></i><span>${escapeHtml(item)}</span></li>`).join("")}</ul>`;
  const recommendationsHtml = (items = [], type) => items.map((item) => {
    if (typeof item === "string") return `<div class="recommendation-item"><strong>${escapeHtml(item)}</strong></div>`;
    const title = item.name || item.label;
    const meta = type === "hotel" ? `${item.area || ""} · ${item.price_range || ""}` : "";
    const text = item.description || item.why || item.amount || "";
    return `<div class="recommendation-item"><strong>${escapeHtml(title)}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}<p>${escapeHtml(text)}</p></div>`;
  }).join("");

  const renderPlan = (plan) => {
    const container = document.getElementById("itineraryContent");
    if (!container || !plan) return;
    document.getElementById("resultTitle").innerHTML = `${escapeHtml(plan.trip_title || "Your personalized journey").replace(/ (\S+)$/, "<br><em>$1</em>")}`;
    document.getElementById("resultSummary").textContent = plan.summary || "A trip shaped around your preferences.";
    document.getElementById("demoNotice")?.classList.toggle("d-none", !plan.demo_mode);
    const budget = plan.estimated_budget || { total: "Flexible", breakdown: [] };
    container.innerHTML = `
      <div class="result-overview">
        <div class="overview-card"><span class="eyebrow">Trip at a glance</span><h3>${escapeHtml(plan.trip_title)}</h3><p>${escapeHtml(plan.summary)}</p><hr><strong><i class="bi bi-calendar2-week text-success me-2"></i>Best time</strong><p class="mb-0 mt-2">${escapeHtml(plan.best_time)}</p></div>
        <div class="overview-card"><span class="eyebrow">Estimated budget</span><div class="budget-total">${escapeHtml(budget.total)}</div>${(budget.breakdown || []).map((item) => `<div class="budget-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.amount)}</strong></div>`).join("")}</div>
      </div>
      <div class="itinerary-layout"><div class="days-column">
        ${(plan.days || []).map((day) => `<article class="day-card"><div class="day-number"><span>Day</span><strong>${day.day}</strong></div><div class="day-content"><h3>${escapeHtml(day.title)}</h3><div class="time-block"><strong><i class="bi bi-sunrise me-1"></i>Morning</strong><span>${escapeHtml(day.morning)}</span></div><div class="time-block"><strong><i class="bi bi-sun me-1"></i>Afternoon</strong><span>${escapeHtml(day.afternoon)}</span></div><div class="time-block"><strong><i class="bi bi-moon-stars me-1"></i>Evening</strong><span>${escapeHtml(day.evening)}</span></div><div class="day-foot"><span><i class="bi bi-cup-hot me-1"></i>${escapeHtml(day.food)}</span><strong>${escapeHtml(day.estimated_cost)}</strong></div></div></article>`).join("")}
      </div><aside class="result-sidebar">
        <div class="result-card"><h4><i class="bi bi-geo-alt"></i>Worth seeing</h4>${recommendationsHtml(plan.attractions)}</div>
        <div class="result-card"><h4><i class="bi bi-building"></i>Stay ideas</h4>${recommendationsHtml(plan.hotels, "hotel")}</div>
        <div class="result-card"><h4><i class="bi bi-cup-hot"></i>Local flavors</h4>${recommendationsHtml(plan.foods)}</div>
        <div class="result-card"><h4><i class="bi bi-backpack"></i>Pack well</h4>${listHtml(plan.packing)}</div>
        <div class="result-card"><h4><i class="bi bi-shield-check"></i>Travel safely</h4>${listHtml(plan.safety)}</div>
        <div class="result-card"><h4><i class="bi bi-signpost-split"></i>Getting around</h4>${listHtml(plan.transport)}</div>
        <div class="result-card"><h4><i class="bi bi-lightbulb"></i>Good to know</h4>${listHtml(plan.advice)}</div>
      </aside></div>`;
  };

  const storedPlan = JSON.parse(localStorage.getItem("roamly-current-plan") || "null");
  renderPlan(storedPlan);

  document.getElementById("copyPlan")?.addEventListener("click", async () => {
    const text = document.getElementById("itineraryContent")?.innerText || "";
    await navigator.clipboard.writeText(text);
    showToast("Itinerary copied");
  });
  document.getElementById("printPlan")?.addEventListener("click", () => window.print());
  document.getElementById("downloadPlan")?.addEventListener("click", () => {
    if (!storedPlan || !window.jspdf) return showToast("Create a plan first", true);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = 55;
    const addText = (text, size = 10, bold = false, gap = 16) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(String(text || ""), 500);
      if (y + lines.length * gap > 790) { pdf.addPage(); y = 55; }
      pdf.text(lines, margin, y); y += lines.length * gap;
    };
    pdf.setTextColor(23, 107, 97); addText(storedPlan.trip_title, 22, true, 25);
    pdf.setTextColor(50, 70, 66); addText(storedPlan.summary, 11, false, 16); y += 8;
    (storedPlan.days || []).forEach((day) => { pdf.setTextColor(238, 120, 95); addText(`DAY ${day.day} — ${day.title}`, 13, true, 18); pdf.setTextColor(50, 70, 66); addText(`Morning: ${day.morning}`); addText(`Afternoon: ${day.afternoon}`); addText(`Evening: ${day.evening}`); addText(`Food: ${day.food}`); y += 8; });
    pdf.save(`${storedPlan.trip_title || "roamly-itinerary"}.pdf`);
    showToast("PDF downloaded");
  });

  const recentPlans = document.getElementById("recentPlans");
  if (recentPlans) {
    const user = JSON.parse(localStorage.getItem("roamly-user") || "{}");
    fetch(`/api/recent-plans${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`)
      .then((response) => response.json()).then(({ plans }) => {
        if (!plans?.length && storedPlan) plans = [{ id: "local", destination: JSON.parse(localStorage.getItem("roamly-last-input") || "{}").destination || storedPlan.trip_title, days: storedPlan.days?.length || 0, budget: storedPlan.estimated_budget?.total, itinerary: storedPlan }];
        if (!plans?.length) return;
        document.getElementById("tripCount").textContent = plans.length;
        recentPlans.innerHTML = plans.map((plan) => `<button class="recent-plan-card w-100 text-start" data-plan='${escapeHtml(JSON.stringify(plan.itinerary))}'><div><h5>${escapeHtml(plan.destination)}</h5><p>${plan.days} days · ${escapeHtml(plan.budget)}</p></div><i class="bi bi-arrow-up-right"></i></button>`).join("");
        recentPlans.querySelectorAll("[data-plan]").forEach((button) => button.addEventListener("click", () => { localStorage.setItem("roamly-current-plan", button.dataset.plan); window.location.href = "/result"; }));
      }).catch(() => {});
  }

  document.getElementById("contactForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) return;
    showToast("Thanks — your message is ready for review");
    event.currentTarget.reset();
    event.currentTarget.classList.remove("was-validated");
  });
})();
