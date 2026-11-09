document.addEventListener("click", (event) => {
  if (event.target.closest("[data-quiet-x-ui]")) return;
  const control = event.target.closest("a, button");
  if (!control) return;
  if (control.tagName === "A") event.preventDefault();
  const id = control.getAttribute("data-testid");
  if (!id) return;
  if (id === "like" || id === "unlike") {
    const turningOn = id === "like";
    control.setAttribute("data-testid", turningOn ? "unlike" : "like");
    control.setAttribute("aria-pressed", turningOn ? "true" : "false");
  } else if (id === "bookmark" || id === "removeBookmark") {
    const turningOn = id === "bookmark";
    control.setAttribute("data-testid", turningOn ? "removeBookmark" : "bookmark");
    control.setAttribute("aria-pressed", turningOn ? "true" : "false");
  } else if (id === "retweet" || id === "unretweet") {
    const turningOn = id === "retweet";
    control.setAttribute("data-testid", turningOn ? "unretweet" : "retweet");
  }
  const clicks = Number(control.getAttribute("data-clicks") || "0") + 1;
  control.setAttribute("data-clicks", String(clicks));
});
