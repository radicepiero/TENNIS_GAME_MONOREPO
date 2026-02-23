function init() {
  const form = document.querySelector("form");
  const emailError = document.querySelector(".email.error");
  const passwordError = document.querySelector(".password.error");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (emailError) emailError.textContent = "";
    if (passwordError) passwordError.textContent = "";

    const email = form.email?.value;
    const password = form.password?.value;

    try {
      const res = await fetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data && data.errors) {
        if (emailError) emailError.textContent = data.errors.email;
        if (passwordError) passwordError.textContent = data.errors.password;
      }
      if (data && data.user) {
        location.assign("/");
      }
    } catch (err) {
      console.log(err);
    }
  });
}

init();
